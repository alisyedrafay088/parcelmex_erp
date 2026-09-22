import json
import re
from typing import Iterator

import requests

from app.core.config import settings

TRACKING_ID_PATTERN = re.compile(r"\b(PM-\d+|TRK\d+)\b", re.IGNORECASE)
INVOICE_NUMBER_PATTERN = re.compile(r"\bINV-\d+\b", re.IGNORECASE)


def extract_mentioned_ids(text: str) -> tuple[set[str], set[str]]:
    tracking_ids = {m.group(1).upper() for m in TRACKING_ID_PATTERN.finditer(text)}
    invoice_numbers = {m.group(0).upper() for m in INVOICE_NUMBER_PATTERN.finditer(text)}
    return tracking_ids, invoice_numbers


SYSTEM_PROMPT_TEMPLATE = """You are the customer support assistant for Parcel Mex, a logistics and parcel delivery company.
You are chatting with {client_name}. Answer ONLY using the data below about their own parcels and invoices.
Be concise, friendly, and specific (mention tracking IDs, statuses, amounts when relevant).
If asked about something you don't have data for, say you don't have that information and suggest they contact support.
Never make up tracking numbers, statuses, or amounts that aren't in the data below.
{specific_records_section}
Their recent parcels:
{parcels_summary}

Their recent invoices:
{invoices_summary}
"""

STAFF_SYSTEM_PROMPT_TEMPLATE = """You are the internal operations assistant for Parcel Mex, a logistics and parcel delivery company.
You are chatting with {staff_name}, a staff member. Answer ONLY using the business data below.
Be concise and specific (mention tracking IDs, client names, statuses, amounts when relevant).
If asked about something you don't have data for, say you don't have that information.
Never make up tracking numbers, statuses, or amounts that aren't in the data below.
{specific_records_section}
Business overview:
{overview_summary}

Recent parcels (across all clients):
{parcels_summary}

Recent invoices (across all clients):
{invoices_summary}
"""


class ChatbotError(Exception):
    pass


def build_system_prompt(
    client_name: str,
    parcels_summary: str,
    invoices_summary: str,
    specific_records_summary: str = "",
) -> str:
    specific_records_section = (
        f"\nRecords specifically asked about:\n{specific_records_summary}\n" if specific_records_summary else ""
    )
    return SYSTEM_PROMPT_TEMPLATE.format(
        client_name=client_name,
        parcels_summary=parcels_summary or "No parcels found.",
        invoices_summary=invoices_summary or "No invoices found.",
        specific_records_section=specific_records_section,
    )


def build_staff_system_prompt(
    staff_name: str,
    overview_summary: str,
    parcels_summary: str,
    invoices_summary: str,
    specific_records_summary: str = "",
) -> str:
    specific_records_section = (
        f"\nRecords specifically asked about:\n{specific_records_summary}\n" if specific_records_summary else ""
    )
    return STAFF_SYSTEM_PROMPT_TEMPLATE.format(
        staff_name=staff_name,
        overview_summary=overview_summary,
        parcels_summary=parcels_summary or "No parcels found.",
        invoices_summary=invoices_summary or "No invoices found.",
        specific_records_section=specific_records_section,
    )


def get_chat_reply(system_prompt: str, history: list[dict[str, str]]) -> str:
    return "".join(stream_chat_reply(system_prompt, history))


def stream_chat_reply(system_prompt: str, history: list[dict[str, str]]) -> Iterator[str]:
    messages = [{"role": "system", "content": system_prompt}, *history]
    try:
        response = requests.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "stream": True,
                "options": {"num_predict": 150, "num_ctx": 1024},
            },
            timeout=180,
            stream=True,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ChatbotError(
            "The chat assistant is currently unavailable. Make sure Ollama is running."
        ) from exc

    got_any = False
    for line in response.iter_lines():
        if not line:
            continue
        chunk = json.loads(line)
        piece = chunk.get("message", {}).get("content")
        if piece:
            got_any = True
            yield piece
        if chunk.get("done"):
            break

    if not got_any:
        raise ChatbotError("The chat assistant returned an empty response.")

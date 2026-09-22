import csv
import io

import openpyxl

COLUMN_ALIASES = {
    "destination_address": {"destination_address", "destination", "address", "delivery_address", "drop_address"},
    "description": {"description", "desc", "item", "items", "details"},
    "weight_kg": {"weight_kg", "weight", "weight(kg)", "weightkg", "weight kg"},
    "quantity": {"quantity", "qty", "pieces", "pcs"},
}


def _normalize_header(header: str) -> str:
    return header.strip().lower().replace(" ", "_") if header else ""


def _map_headers(headers: list[str]) -> dict[str, int]:
    normalized = [_normalize_header(h) for h in headers]
    mapping: dict[str, int] = {}
    for field, aliases in COLUMN_ALIASES.items():
        for idx, h in enumerate(normalized):
            if h in aliases:
                mapping[field] = idx
                break
    return mapping


class ParsedRow:
    def __init__(self, destination_address: str, description: str | None, weight_kg: float, quantity: int):
        self.destination_address = destination_address
        self.description = description
        self.weight_kg = weight_kg
        self.quantity = quantity


def parse_upload(filename: str, content: bytes) -> tuple[list[ParsedRow], list[str]]:
    rows: list[list[str]] = []

    if filename.lower().endswith(".xlsx"):
        workbook = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        sheet = workbook.active
        for row in sheet.iter_rows(values_only=True):
            rows.append(["" if cell is None else str(cell) for cell in row])
    elif filename.lower().endswith(".csv"):
        text = content.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
    else:
        return [], ["Unsupported file type. Please upload a .csv or .xlsx file."]

    if not rows:
        return [], ["File is empty."]

    header_map = _map_headers(rows[0])
    if "destination_address" not in header_map or "weight_kg" not in header_map:
        return [], [
            "Could not find required columns. Your file must include at least "
            "'destination_address' and 'weight_kg' columns."
        ]

    parsed: list[ParsedRow] = []
    errors: list[str] = []

    for i, row in enumerate(rows[1:], start=2):
        if not any(cell.strip() for cell in row if isinstance(cell, str)):
            continue

        def get(field: str) -> str:
            idx = header_map.get(field)
            if idx is None or idx >= len(row):
                return ""
            return (row[idx] or "").strip()

        destination = get("destination_address")
        weight_raw = get("weight_kg")
        description = get("description") or None
        quantity_raw = get("quantity")

        if not destination:
            errors.append(f"Row {i}: missing destination address, skipped.")
            continue

        try:
            weight_kg = float(weight_raw)
            if weight_kg <= 0:
                raise ValueError
        except ValueError:
            errors.append(f"Row {i}: invalid weight '{weight_raw}', skipped.")
            continue

        try:
            quantity = int(float(quantity_raw)) if quantity_raw else 1
            if quantity <= 0:
                quantity = 1
        except ValueError:
            quantity = 1

        parsed.append(ParsedRow(destination, description, weight_kg, quantity))

    return parsed, errors

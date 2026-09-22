const API_URL = import.meta.env.VITE_API_URL as string;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function streamFrom(
  url: string,
  token: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
  }
  if (!res.body) {
    onChunk(await res.text());
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }
}

export const chatApi = {
  streamMessage: (token: string, messages: ChatMessage[], onChunk: (chunk: string) => void) =>
    streamFrom(`${API_URL}/portal/chat`, token, messages, onChunk),
  streamStaffMessage: (token: string, messages: ChatMessage[], onChunk: (chunk: string) => void) =>
    streamFrom(`${API_URL}/dashboard/chat`, token, messages, onChunk),
};

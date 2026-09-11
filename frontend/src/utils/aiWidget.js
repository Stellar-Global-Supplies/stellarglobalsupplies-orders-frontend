const BASE_URL = process.env.REACT_APP_AI_WIDGET_URL;
const SESSION_KEY = "sgs_ai_widget_session_id";
export const PREFILL_KEY = "sgs_ai_widget_prefill_order";

export function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function startNewChat() {
  const oldId = localStorage.getItem(SESSION_KEY);
  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newId);
  return { oldId, newId };
}

export async function fetchHistory(sessionId) {
  const res = await fetch(`${BASE_URL}/history/${sessionId}`);
  if (!res.ok) return { messages: [] };
  return res.json();
}

export async function deleteHistory(sessionId) {
  await fetch(`${BASE_URL}/history/${sessionId}`, { method: "DELETE" }).catch(() => {});
}

/**
 * message: string
 * files: File[] (optional attachments — pdf, docx, xlsx, csv, png, jpeg)
 */
export async function sendChatMessage(sessionId, message, files = []) {
  let res;
  if (files.length > 0) {
    const form = new FormData();
    form.set("message", message || "");
    form.set("sessionId", sessionId);
    files.forEach(f => form.append("attachments", f));
    res = await fetch(`${BASE_URL}/chat`, { method: "POST", body: form });
  } else {
    res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });
  }

  if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
  return res.json(); // { sessionId, reply, extracted }
}

/** Stash extracted order data for NewOrderPage to pick up after navigation. */
export function stagePrefill(extracted) {
  sessionStorage.setItem(PREFILL_KEY, JSON.stringify(extracted));
}

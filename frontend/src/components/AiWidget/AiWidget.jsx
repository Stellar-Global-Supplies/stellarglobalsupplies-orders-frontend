import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getOrCreateSessionId, startNewChat, fetchHistory,
  deleteHistory, sendChatMessage, stagePrefill,
} from "../../utils/aiWidget";
import "./AiWidget.css";

const ACCEPTED_TYPES = ".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg";

export default function AiWidget() {
  const navigate = useNavigate();
  const [open, setOpen]         = useState(false);
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [sending, setSending]   = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef     = useRef(null);

  useEffect(() => {
    if (!open) return;
    fetchHistory(sessionId).then(({ messages }) => setMessages(messages || []));
  }, [open, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    if (!input.trim() && pendingFiles.length === 0) return;
    const userMsg = { role: "user", content: input || `[attached: ${pendingFiles.map(f => f.name).join(", ")}]` };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    const filesToSend = pendingFiles;
    setInput("");
    setPendingFiles([]);

    try {
      const { reply, extracted } = await sendChatMessage(sessionId, input, filesToSend);
      setMessages(prev => [...prev, { role: "assistant", content: reply, extracted }]);
    } catch (err) {
      toast.error("Assistant is unavailable right now.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  function handleNewChat() {
    const { oldId, newId } = startNewChat();
    if (oldId) deleteHistory(oldId);
    setSessionId(newId);
    setMessages([]);
  }

  function handleFilePick(e) {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = "";
  }

  function handleUsePrefill(extracted) {
    stagePrefill(extracted);
    setOpen(false);
    navigate("/new-order");
    toast.success("Order form pre-filled — please review before submitting.");
  }

  return (
    <>
      <button
        className="ai-widget-fab"
        onClick={() => setOpen(v => !v)}
        aria-label="Open AI assistant"
      >
        {open ? "✕" : "✨"}
      </button>

      {open && (
        <div className="ai-widget-panel">
          <div className="ai-widget-header">
            <span>Order Assistant</span>
            <button className="ai-widget-newchat" onClick={handleNewChat}>New chat</button>
          </div>

          <div className="ai-widget-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="ai-widget-empty">
                Upload a purchase order (PDF, image, DOCX, XLSX, CSV) and I'll pull out the
                details to pre-fill a new order — or ask me things like "how many orders
                were delivered this week?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-widget-msg ai-widget-msg-${m.role}`}>
                <div className="ai-widget-bubble">{m.content}</div>
                {m.role === "assistant" && m.extracted && (
                  <button className="ai-widget-prefill-btn" onClick={() => handleUsePrefill(m.extracted)}>
                    Fill New Order form with this
                  </button>
                )}
              </div>
            ))}
            {sending && <div className="ai-widget-msg ai-widget-msg-assistant"><div className="ai-widget-bubble ai-widget-typing">Thinking…</div></div>}
          </div>

          {pendingFiles.length > 0 && (
            <div className="ai-widget-files">
              {pendingFiles.map((f, i) => (
                <span key={i} className="ai-widget-file-chip">
                  {f.name}
                  <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </span>
              ))}
            </div>
          )}

          <div className="ai-widget-input-row">
            <button className="ai-widget-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              hidden
              onChange={handleFilePick}
            />
            <textarea
              className="ai-widget-textarea"
              placeholder="Ask a question or attach a PO…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={1}
            />
            <button className="ai-widget-send-btn" onClick={handleSend} disabled={sending}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

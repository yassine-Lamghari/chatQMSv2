"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const CHAT_HISTORY_KEY = "qms_chat_history";

type ChatMeta = {
  summary?: string;
  summary_bullets?: string[];
  details?: string;
  detail_sections?: { section_ref: string; excerpt: string; filename?: string; page?: number }[];
  confidence?: string;
  sources?: { filename?: string; section_ref?: string; relevance?: number }[];
  rag_synthesis?: string | null;
  generation_mode?: string;
};

type ChatMessage = { role: string; content: string; meta?: ChatMeta };
type ChatSession = { id: string; title: string; messages: ChatMessage[]; updatedAt: string };

function L(uiLocale: string) {
  const en = uiLocale === "en";
  return {
    newChat:      en ? "New chat"            : "Nouveau chat",
    recent:       en ? "Recent"              : "Récent",
    noRecent:     en ? "No recent chats."   : "Aucun chat récent.",
    logout:       en ? "Log out"             : "Déconnexion",
    loading:      en ? "Loading…"            : "Chargement…",
    connected:    en ? "Signed in as"        : "Connecté en tant que",
    title:        en ? "QMS Assistant"       : "Assistant QMS",
    welcome:      en ? "How can I help?"     : "Comment puis-je vous aider ?",
    welcomeSub:   en ? "Search QMS documents, run PFMEA, or prepare an audit." : "Recherchez dans les docs QMS, lancez un PFMEA ou préparez un audit.",
    placeholder:  en ? "Message QMS Assistant…" : "Écrire à l'Assistant QMS…",
    placeholderLoading: en ? "Processing…"  : "Traitement en cours…",
    viewSummary:  en ? "Summary"             : "Résumé",
    viewDetail:   en ? "Sources"             : "Sources",
    filters:      en ? "Filters"             : "Filtres",
    site:         en ? "Site"                : "Site",
    docType:      en ? "Doc type"            : "Type doc",
    dateFrom:     en ? "From"               : "Depuis",
    dateTo:       en ? "To"                  : "Jusqu'à",
    applyFilters: en ? "Applied to next messages" : "Appliqués aux prochains messages",
    disclaimer:   en ? "Answers grounded in indexed documents only. Always verify critical information." : "Réponses basées uniquement sur les documents indexés. Vérifiez les informations critiques.",
    respEn:       en ? "Respond in English"  : "Répondre en anglais",
    langDoc:      en ? "Document language"   : "Langue du doc",
    langEnOnly:   en ? "English only"        : "Anglais seulement",
    langFrEnSrc:  en ? "FR + EN sources"     : "FR + sources EN",
    conf:         en ? "Confidence"          : "Confiance",
    src:          en ? "Sources"             : "Sources",
    synthesis:    en ? "AI Synthesis"        : "Synthèse IA",
    excerpts:     en ? "Source excerpts"     : "Extraits sources",
    thinking:     en ? "Thinking…"           : "Réflexion…",
    errBackend:   en ? "Server error — please try again." : "Erreur serveur — réessayez.",
  };
}

function AssistantBody({ msg, view, locale }: { msg: ChatMessage; view: "summary" | "detail"; locale: string }) {
  const lbl = L(locale);
  const meta = msg.meta;
  if (!meta) return <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Main summary */}
      {meta.summary && (
        <p className="assistant-summary">{meta.summary}</p>
      )}

      {/* Bullets */}
      {view === "summary" && (meta.summary_bullets || []).length > 0 && (
        <ul className="assistant-bullets">
          {(meta.summary_bullets || []).map((b, i) => (
            <li key={i}>{b.replace(/^[-•]\s*/, "")}</li>
          ))}
        </ul>
      )}

      {/* Detail view */}
      {view === "detail" && (
        <>
          {/* LLM Synthesis */}
          {meta.rag_synthesis && (
            <div className="assistant-synthesis">
              <p className="assistant-synthesis-label">{lbl.synthesis}</p>
              <p>{meta.rag_synthesis}</p>
            </div>
          )}

          {/* Source excerpts */}
          {(meta.detail_sections || []).length > 0 && (
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-faint)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {lbl.excerpts}
              </p>
              {(meta.detail_sections || []).map((sec, i) => (
                <div key={i} className="excerpt-card">
                  <p className="excerpt-ref">{sec.section_ref}</p>
                  <p className="excerpt-text">{sec.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Meta footer */}
      <div className="assistant-meta">
        <span>{lbl.conf}: <strong>{meta.confidence ?? "—"}</strong></span>
        <span>·</span>
        <span>{lbl.src}: {meta.sources?.length ?? 0}</span>
        {meta.generation_mode && <span>· {meta.generation_mode === "llm" ? "RAG + LLM" : "RAG"}</span>}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [sessions, setSessions]           = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  // languageMode: only two options remain (document_language removed).
  const [languageMode, setLanguageMode]   = useState<"en_only" | "fr_with_en_sources">("fr_with_en_sources");
  const [uiLocale, setUiLocale]           = useState<"fr" | "en">("fr");
  const [chatView, setChatView]           = useState<"summary" | "detail">("summary");
  const [showFilters, setShowFilters]     = useState(false);
  const [filterSite, setFilterSite]       = useState("");
  const [filterDocType, setFilterDocType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]   = useState("");
  const [user, setUser]                   = useState<{ username: string; role: string } | null>(null);
  const router   = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lbl = L(uiLocale);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role === "admin") { router.push("/admin"); return; }
    setUser(parsed);
    const storedSessions = localStorage.getItem(CHAT_HISTORY_KEY);
    if (storedSessions) {
      const parsed2: ChatSession[] = JSON.parse(storedSessions);
      setSessions(parsed2);
      if (parsed2.length > 0) { setActiveSessionId(parsed2[0].id); setMessages(parsed2[0].messages); }
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const persistSessions = (next: ChatSession[]) => {
    setSessions(next);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
  };

  const updateCurrentSession = (nextMsgs: ChatMessage[]) => {
    const title = nextMsgs.find(m => m.role === "user")?.content?.slice(0, 40) || lbl.newChat;
    if (!activeSessionId) {
      const id = crypto.randomUUID();
      const s: ChatSession = { id, title, messages: nextMsgs, updatedAt: new Date().toISOString() };
      setActiveSessionId(id);
      persistSessions([s, ...sessions].slice(0, 20));
      return;
    }
    persistSessions(
      sessions
        .map(s => s.id === activeSessionId ? { ...s, messages: nextMsgs, title, updatedAt: new Date().toISOString() } : s)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  };

  const startNewChat = () => {
    const id = crypto.randomUUID();
    const s: ChatSession = { id, title: lbl.newChat, messages: [], updatedAt: new Date().toISOString() };
    setActiveSessionId(id);
    setMessages([]);
    setInput("");
    persistSessions([s, ...sessions].slice(0, 20));
  };

  const openSession = (id: string) => {
    const found = sessions.find(s => s.id === id);
    if (!found) return;
    setActiveSessionId(found.id);
    setMessages(found.messages);
  };

  if (!user) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", color: "var(--color-text-muted)" }}>
      {lbl.loading}
    </div>
  );

  // Response language is driven by languageMode, not the UI locale.
  // FR/EN sidebar toggle only affects UI labels.
  const respondInEnglish = languageMode === "en_only";
  const responseLocale   = languageMode === "en_only" ? "en" : "fr";

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const nextUser = [...messages, userMsg];
    setMessages(nextUser);
    updateCurrentSession(nextUser);
    const queryText = input;
    setInput("");
    setIsLoading(true);

    const filters: Record<string, string> = {};
    if (filterSite.trim())     filters.site      = filterSite.trim();
    if (filterDocType.trim())  filters.doc_type  = filterDocType.trim();
    if (filterDateFrom.trim()) filters.date_from = filterDateFrom.trim();
    if (filterDateTo.trim())   filters.date_to   = filterDateTo.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          language_mode: languageMode,
          respond_in_english: respondInEnglish,
          response_locale: responseLocale,
          user_role: user.role,
          username: user.username,
          filters,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || "Chat request failed");
      }
      const data = await res.json();
      const meta: ChatMeta = {
        summary: data.summary, summary_bullets: data.summary_bullets,
        details: data.details, detail_sections: data.detail_sections,
        confidence: data.confidence, sources: data.sources,
        rag_synthesis: data.rag_synthesis ?? null, generation_mode: data.generation_mode,
      };
      const content = `${data.summary || ""}\n\n${(data.summary_bullets || []).join("\n")}\n\n${data.details || ""}`;
      const aiMsg: ChatMessage = { role: "assistant", content, meta };
      const next = [...nextUser, aiMsg];
      setMessages(next);
      updateCurrentSession(next);
    } catch (e) {
      console.error("Chat request failed", e);
      const next = [...nextUser, { role: "assistant", content: lbl.errBackend }];
      setMessages(next);
      updateCurrentSession(next);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px 12px" }}>
          <div className="claude-icon" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "white", fontWeight: 700, flexShrink: 0 }}>Q</div>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#d4cfc6" }}>QMS Assistant</span>
        </div>

        {/* New chat */}
        <button className="sidebar-btn-new" onClick={startNewChat} id="new-chat-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {lbl.newChat}
        </button>

        {/* ── Quick Access Tools ── */}
        <div style={{ padding: "8px 8px 4px" }}>
          <p className="sidebar-section-label" style={{ paddingTop: "6px" }}>
            {uiLocale === "en" ? "Tools" : "Outils"}
          </p>
          <Link href="/audit" className="sidebar-tool-link" id="nav-audit">
            <span className="sidebar-tool-icon">🗂</span>
            <span>{uiLocale === "en" ? "QMS Audit Assistant" : "Assistant Audit QMS"}</span>
          </Link>
          <Link href="/logs" className="sidebar-tool-link" id="nav-logs">
            <span className="sidebar-tool-icon">📋</span>
            <span>{uiLocale === "en" ? "Activity Logs" : "Logs d'activité"}</span>
          </Link>
          <Link href="/pfmea" className="sidebar-tool-link" id="nav-pfmea">
            <span className="sidebar-tool-icon">🔧</span>
            <span>{uiLocale === "en" ? "PFMEA Generator" : "Générateur PFMEA"}</span>
          </Link>
        </div>

        {/* History */}
        <div style={{ flex: 1, overflowY: "auto", marginTop: "4px" }}>
          {sessions.length > 0 && (
            <>
              <p className="sidebar-section-label">{lbl.recent}</p>
              {sessions.map(s => (
                <button
                  key={s.id}
                  className={`sidebar-item${s.id === activeSessionId ? " active" : ""}`}
                  onClick={() => openSession(s.id)}
                  title={s.title}
                >
                  {s.title}
                </button>
              ))}
            </>
          )}
          {sessions.length === 0 && (
            <p style={{ fontSize: "13px", color: "#5a5750", padding: "8px 12px" }}>{lbl.noRecent}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Language toggle */}
          <div style={{ display: "flex", gap: "4px", padding: "6px 12px 4px" }}>
            {(["fr", "en"] as const).map(loc => (
              <button
                key={loc}
                onClick={() => setUiLocale(loc)}
                style={{
                  flex: 1, padding: "5px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: uiLocale === loc ? "#3a3730" : "transparent",
                  color: uiLocale === loc ? "#f0ece5" : "#7a7570",
                }}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User */}
          <div className="sidebar-user" onClick={() => { localStorage.removeItem("user"); router.push("/login"); }} title={lbl.logout}>
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#c4bfb6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</p>
              <p style={{ fontSize: "11px", color: "#5a5750" }}>{lbl.logout}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="chat-main">

        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* View toggle */}
            <div className="topbar-toggle">
              <button className={chatView === "summary" ? "active" : ""} onClick={() => setChatView("summary")} id="view-summary-btn">{lbl.viewSummary}</button>
              <button className={chatView === "detail" ? "active" : ""} onClick={() => setChatView("detail")} id="view-detail-btn">{lbl.viewDetail}</button>
            </div>

            {/* Response language selector — EN only or FR + EN sources */}
            <div className="topbar-toggle" title={uiLocale === "en" ? "Response language" : "Langue de réponse"}>
              {([
                { value: "en_only",            label: uiLocale === "en" ? "EN only"        : "EN seul" },
                { value: "fr_with_en_sources", label: uiLocale === "en" ? "FR + EN sources" : "FR + src EN" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  id={`lang-mode-${opt.value}`}
                  className={languageMode === opt.value ? "active" : ""}
                  onClick={() => setLanguageMode(opt.value)}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <button className={`topbar-btn${showFilters ? " active" : ""}`} onClick={() => setShowFilters(s => !s)} id="filters-btn">
              {lbl.filters}
            </button>
          </div>

          {/* Model badge */}
          <span style={{ fontSize: "12px", color: "var(--color-text-faint)", background: "var(--color-bg-subtle)", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--color-border)" }}>
            Groq · llama-3.1-8b
          </span>
        </header>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ padding: "0 24px" }}>
            <div className="filters-panel">
              {[
                { label: lbl.site, val: filterSite, set: setFilterSite, ph: "default" },
                { label: lbl.docType, val: filterDocType, set: setFilterDocType, ph: "Procédure" },
                { label: lbl.dateFrom, val: filterDateFrom, set: setFilterDateFrom, ph: "2024-01-01" },
                { label: lbl.dateTo, val: filterDateTo, set: setFilterDateTo, ph: "2026-12-31" },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="filter-label">{label}</label>
                  <input className="filter-input" value={val} onChange={e => set(e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--color-text-faint)", textAlign: "center", marginTop: "6px", marginBottom: "4px" }}>{lbl.applyFilters}</p>
          </div>
        )}

        {/* Messages */}
        <div className="messages-area">
          <div className="messages-inner">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-logo claude-icon" style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white", fontWeight: 700 }}>Q</div>
                <h2>{lbl.welcome}</h2>
                <p>{lbl.welcomeSub}</p>
                
                {/* ── Action Cards ── */}
                <div className="welcome-actions">
                  <Link href="/audit" className="welcome-action-card">
                    <span className="welcome-action-icon">🗂</span>
                    <span className="welcome-action-text">{uiLocale === "en" ? "QMS Audit Assistant" : "Assistant Audit QMS"}</span>
                  </Link>
                  <Link href="/logs" className="welcome-action-card">
                    <span className="welcome-action-icon">📋</span>
                    <span className="welcome-action-text">{uiLocale === "en" ? "Activity Logs" : "Logs d'activité"}</span>
                  </Link>
                  <Link href="/pfmea" className="welcome-action-card">
                    <span className="welcome-action-icon">🔧</span>
                    <span className="welcome-action-text">{uiLocale === "en" ? "PFMEA Generator" : "Générateur PFMEA"}</span>
                  </Link>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="msg-avatar claude">Q</div>
                  )}
                  <div className={`msg-bubble ${msg.role}`}>
                    {msg.role === "assistant"
                      ? <AssistantBody msg={msg} view={chatView} locale={uiLocale} />
                      : <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                    }
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="msg-row assistant">
                <div className="msg-avatar claude">Q</div>
                <div className="msg-bubble assistant">
                  <div className="thinking">
                    <span /><span /><span />
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--color-text-faint)", marginTop: "6px" }}>{lbl.thinking}</p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrap">
            <textarea
              id="chat-input"
              className="input-box"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isLoading ? lbl.placeholderLoading : lbl.placeholder}
              rows={2}
              disabled={isLoading}
            />
            <button
              id="send-btn"
              className="send-btn"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
            >
              {isLoading ? (
                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          <p className="input-disclaimer">{lbl.disclaimer}</p>
        </div>

      </main>
    </div>
  );
}

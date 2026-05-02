"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconQMS, IconNewChat, IconAudit, IconPFMEA, IconSearch,
  IconTrash, IconSend, IconAttach, IconLogout, IconChat, IconShield
} from "./components/Icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const CHAT_HISTORY_KEY = "qms_chat_history";

type ChatMeta = {
  summary?: string;
  summary_bullets?: string[];
  details?: string;
  detail_sections?: { section_ref: string; excerpt: string; filename?: string; page?: number }[];
  confidence?: string;
  confidence_score?: number;
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

function ConfidenceBar({ score }: { score?: number }) {
  if (score === undefined) return null;
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "#22c55e" : score >= 0.45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
      <div style={{ flex:1, height:4, background:"var(--color-border)", borderRadius:2 }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.4s" }} />
      </div>
      <span style={{ fontSize:11, color:"var(--color-text-faint)", minWidth:32 }}>{pct}%</span>
    </div>
  );
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
      <ConfidenceBar score={meta.confidence_score} />
    </div>
  );
}

export default function Chatbot() {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [sessions, setSessions]           = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [languageMode, setLanguageMode]   = useState<"en_only" | "fr_with_en_sources">("fr_with_en_sources");
  const [uiLocale, setUiLocale]           = useState<"fr" | "en">("fr");
  const [chatView, setChatView]           = useState<"summary" | "detail">("summary");
  const [showFilters, setShowFilters]     = useState(false);
  const [filterSite, setFilterSite]       = useState("");
  const [filterDocType, setFilterDocType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]   = useState("");
  const [user, setUser]                   = useState<{ username: string; role: string } | null>(null);
  const [activeLLM, setActiveLLM]         = useState<string | null>(null);
  const [llmConfigured, setLlmConfigured] = useState<boolean>(true);  // Fix #17
  const router   = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lbl = L(uiLocale);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role === "admin") { router.push("/admin"); return; }
    setUser(parsed);
    // Load sessions from DB
    fetch(`${API_BASE_URL}/api/sessions?username=${encodeURIComponent(parsed.username)}`)
      .then(r => r.ok ? r.json() : [])
      .then((dbSessions: ChatSession[]) => {
        if (dbSessions.length > 0) {
          setSessions(dbSessions);
          setActiveSessionId(dbSessions[0].id);
          setMessages(dbSessions[0].messages);
        } else {
          // fallback: localStorage
          const storedSessions = localStorage.getItem(CHAT_HISTORY_KEY);
          if (storedSessions) {
            const parsed2: ChatSession[] = JSON.parse(storedSessions);
            setSessions(parsed2);
            if (parsed2.length > 0) { setActiveSessionId(parsed2[0].id); setMessages(parsed2[0].messages); }
          }
        }
      })
      .catch(() => {
        const storedSessions = localStorage.getItem(CHAT_HISTORY_KEY);
        if (storedSessions) {
          const parsed2: ChatSession[] = JSON.parse(storedSessions);
          setSessions(parsed2);
          if (parsed2.length > 0) { setActiveSessionId(parsed2[0].id); setMessages(parsed2[0].messages); }
        }
      });
    // Load active LLM + Fix #17 statut
    fetch(`${API_BASE_URL}/api/llm/status`)
      .then(r => r.ok ? r.json() : {})
      .then(d => { setActiveLLM(d?.provider || null); setLlmConfigured(d?.configured ?? true); })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const persistSessions = (next: ChatSession[]) => {
    setSessions(next);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
  };

  const persistSessionToDb = (session: ChatSession, username: string) => {
    fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, title: session.title, messages: session.messages, username }),
    }).catch(() => {});
  };

  const updateCurrentSession = (nextMsgs: ChatMessage[]) => {
    const title = nextMsgs.find(m => m.role === "user")?.content?.slice(0, 40) || lbl.newChat;
    if (!activeSessionId) {
      const id = crypto.randomUUID();
      const s: ChatSession = { id, title, messages: nextMsgs, updatedAt: new Date().toISOString() };
      setActiveSessionId(id);
      persistSessions([s, ...sessions].slice(0, 20));
      if (user) persistSessionToDb(s, user.username);
      return;
    }
    const updated = sessions
      .map(s => s.id === activeSessionId ? { ...s, messages: nextMsgs, title, updatedAt: new Date().toISOString() } : s)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    persistSessions(updated);
    const found = updated.find(s => s.id === activeSessionId);
    if (found && user) persistSessionToDb(found, user.username);
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

  const deleteSession = (id: string) => {
    const next = sessions.filter(s => s.id !== id);
    persistSessions(next);
    fetch(`${API_BASE_URL}/api/sessions/${id}`, { method: "DELETE" }).catch(() => {});
    if (activeSessionId === id) {
      if (next.length > 0) { setActiveSessionId(next[0].id); setMessages(next[0].messages); }
      else { setActiveSessionId(null); setMessages([]); }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        confidence: data.confidence, confidence_score: data.confidence_score,
        sources: data.sources,
        rag_synthesis: data.rag_synthesis ?? null, generation_mode: data.generation_mode,
      };
      const content = `${data.summary || ""}\n\n${(data.summary_bullets || []).join("\n")}\n\n${data.details || ""}`;
      const aiMsg: ChatMessage = { role: "assistant", content, meta };
      const next = [...nextUser, aiMsg];
      setMessages(next);
      updateCurrentSession(next);
    } catch (e: any) {
      console.error("Chat request failed", e);
      let errMsg = lbl.errBackend;
      if (e?.message?.includes("401")) errMsg = uiLocale === "en" ? "API key not configured — check admin settings." : "Clé API non configurée — vérifiez les paramètres admin.";
      else if (e?.message?.includes("404")) errMsg = uiLocale === "en" ? "No documents indexed yet. Upload files from admin." : "Aucun document indexé. Importez des fichiers depuis l'admin.";
      else if (e?.message?.includes("429")) errMsg = uiLocale === "en" ? "Too many requests — please wait a moment." : "Trop de requêtes — attendez un instant.";
      const next = [...nextUser, { role: "assistant", content: errMsg }];
      setMessages(next);
      updateCurrentSession(next);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = user.username.slice(0, 2).toUpperCase();

  // Fix #17 — message d'avertissement LLM
  const llmWarning = !llmConfigured ? (
    uiLocale === "en"
      ? "⚠ No LLM configured — answers in excerpt-only mode. Configure a model in admin settings."
      : "⚠ Aucun LLM configuré — réponses en mode extrait uniquement. Configurez un modèle dans les paramètres admin."
  ) : null;

  return (
    <div className="claude-theme" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px 12px" }}>
          <IconQMS size={30} />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>QMS Assistant</span>
        </div>

        {/* New chat */}
        <button className="sidebar-btn-new" onClick={startNewChat} id="new-chat-btn">
          <IconNewChat size={16} />
          {lbl.newChat}
        </button>

        {/* ── Quick Access Tools ── */}
        <div style={{ padding: "8px 8px 4px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 4px 4px" }}>
            <div style={{ flex:1, height:1, background:"var(--color-border-dark)" }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--color-text-muted)" }}>
              {uiLocale === "en" ? "Tools" : "Outils"}
            </span>
            <div style={{ flex:1, height:1, background:"var(--color-border-dark)" }} />
          </div>
          <Link href="/audit" className="sidebar-tool-link" id="nav-audit">
            <span className="sidebar-tool-icon"><IconAudit size={16} /></span>
            <span>{uiLocale === "en" ? "QMS Audit Assistant" : "Assistant Audit QMS"}</span>
          </Link>
          <Link href="/pfmea" className="sidebar-tool-link" id="nav-pfmea">
            <span className="sidebar-tool-icon"><IconPFMEA size={16} /></span>
            <span>{uiLocale === "en" ? "PFMEA Generator" : "Générateur PFMEA"}</span>
          </Link>
          <Link href="/search" className="sidebar-tool-link" id="nav-search">
            <span className="sidebar-tool-icon"><IconSearch size={16} /></span>
            <span>{uiLocale === "en" ? "Semantic Search" : "Recherche sémantique"}</span>
          </Link>
        </div>

        {/* History */}
        <div style={{ flex: 1, overflowY: "auto", marginTop: "4px" }}>
          {sessions.length > 0 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 4px 4px 12px" }}>
                <div style={{ flex:1, height:1, background:"var(--color-border-dark)" }} />
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--color-text-muted)" }}>
                  {lbl.recent}
                </span>
                <div style={{ flex:1, height:1, background:"var(--color-border-dark)" }} />
              </div>
              {sessions.map(s => (
                <div key={s.id} style={{ position:"relative" }}
                  onMouseEnter={() => setHoveredSession(s.id)}
                  onMouseLeave={() => setHoveredSession(null)}>
                  <button
                    className={`sidebar-item${s.id === activeSessionId ? " active" : ""}`}
                    onClick={() => openSession(s.id)}
                    title={s.title}
                    style={{ paddingRight: hoveredSession === s.id ? 36 : 12 }}
                  >
                    {(s.title || lbl.newChat).slice(0, 30)}{(s.title || "").length > 30 ? "…" : ""}
                  </button>
                  {hoveredSession === s.id && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                      title="Supprimer"
                      style={{
                        position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                        background:"transparent", border:"none", cursor:"pointer",
                        color:"#9ca3af", padding:"4px", borderRadius:6,
                        display:"flex", alignItems:"center", transition:"color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color="#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color="#9ca3af")}
                    ><IconTrash size={14} /></button>
                  )}
                </div>
              ))}
            </>
          )}
          {sessions.length === 0 && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "8px 12px" }}>{lbl.noRecent}</p>
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
                  background: uiLocale === loc ? "var(--color-pill-bg)" : "transparent",
                  color: uiLocale === loc ? "var(--color-accent)" : "var(--color-text-faint)",
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
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</p>
              <p style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>{lbl.logout}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="chat-main">
        {/* Fix #17 — Bandeau avertissement LLM */}
        {llmWarning && (
          <div style={{ background:"#fef3c7", borderBottom:"1px solid #fde68a", padding:"8px 24px", fontSize:12, color:"#92400e", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span>{llmWarning}</span>
            <a href="/admin" style={{ color:"#b45309", fontWeight:600, marginLeft:"auto", textDecoration:"underline" }}>→ Admin</a>
          </div>
        )}

        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* View toggle — segmented pill */}
            <div className="topbar-toggle">
              {([{v:"summary",l:lbl.viewSummary,id:"view-summary-btn"},{v:"detail",l:lbl.viewDetail,id:"view-detail-btn"}] as const).map(opt => (
                <button key={opt.v} id={opt.id}
                  className={chatView === opt.v ? "active" : ""}
                  onClick={() => setChatView(opt.v as "summary"|"detail")}>
                  {opt.l}
                </button>
              ))}
            </div>

            {/* Language toggle — segmented pill */}
            <div className="topbar-toggle">
              {([
                { value: "en_only",            label: "EN" },
                { value: "fr_with_en_sources", label: "FR+EN" },
              ] as const).map(opt => (
                <button key={opt.value} id={`lang-mode-${opt.value}`}
                  className={languageMode === opt.value ? "active" : ""}
                  onClick={() => setLanguageMode(opt.value)}
                  title={opt.value === "en_only" ? "English only" : "FR + EN sources"}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filters toggle */}
            <button id="filters-btn" className={`topbar-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(s => !s)}>
              ⚙ {lbl.filters}
            </button>
          </div>

          {/* Model badge pill */}
          <span style={{ fontSize:12, fontWeight:600, color:"var(--color-accent)", background:"var(--color-pill-bg)",
            padding:"4px 14px", borderRadius:999, border:"1.5px solid var(--color-pill-border)", letterSpacing:"0.02em" }}>
            {activeLLM ? activeLLM.charAt(0).toUpperCase() + activeLLM.slice(1) : "RAG"} · QMS
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
                <div className="welcome-logo" style={{ width:64, height:64, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#fff7ed,#ffedd5)", border:"2px solid #fed7aa" }}>
                  <IconQMS size={38} />
                </div>
                <h2 style={{ fontSize:24, fontWeight:600, color:"var(--color-text)", letterSpacing:"-0.02em" }}>{lbl.welcome}</h2>
                <p style={{ fontSize:14, color:"var(--color-text-faint)", maxWidth:380, textAlign:"center" }}>{lbl.welcomeSub}</p>

                {/* ── Action Cards ── */}
                <div style={{ display:"flex", gap:20, marginTop:36, flexWrap:"wrap", justifyContent:"center" }}>
                  {([
                    { href:"/audit",  Icon: IconAudit,  title: uiLocale==="en" ? "QMS Audit"      : "Audit QMS",           desc: uiLocale==="en" ? "Generate checklists & audit plans" : "Checklists & plans d'audit" },
                    { href:"/pfmea",  Icon: IconPFMEA,  title: uiLocale==="en" ? "PFMEA Generator" : "Générateur PFMEA",    desc: uiLocale==="en" ? "Risk analysis with AI assistance"  : "Analyse des risques IA" },
                    { href:"/search", Icon: IconSearch, title: uiLocale==="en" ? "Semantic Search" : "Recherche sémantique", desc: uiLocale==="en" ? "Search directly in QMS documents" : "Recherche dans vos documents QMS" },
                  ]).map(card => (
                    <Link key={card.href} href={card.href} className="welcome-action-card">
                      <span className="welcome-action-icon" style={{ color:"#f97316" }}><card.Icon size={22} /></span>
                      <span>
                        <span style={{ display:"block", fontSize:14, fontWeight:600, color:"var(--color-text)" }}>{card.title}</span>
                        <span style={{ display:"block", fontSize:12, color:"var(--color-text-faint)", marginTop:3, lineHeight:1.4 }}>{card.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="msg-avatar claude" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <IconShield size={16} />
                    </div>
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
                <div className="msg-avatar claude" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IconShield size={16} />
                </div>
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
            {/* Attachment button */}
            <button id="attach-btn"
              title={uiLocale === "en" ? "Attach document" : "Joindre un document"}
              onClick={() => fileInputRef.current?.click()}
              style={{
                position:"absolute", left:10, bottom:10,
                width:34, height:34, borderRadius:10,
                border:"1px solid var(--color-input-border)", background:"var(--color-input-bg)",
                color:"var(--color-text-faint)", display:"flex", alignItems:"center",
                justifyContent:"center", cursor:"pointer", transition:"all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="var(--color-accent)"; (e.currentTarget as HTMLElement).style.borderColor="#fed7aa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="var(--color-text-faint)"; (e.currentTarget as HTMLElement).style.borderColor="var(--color-input-border)"; }}
            ><IconAttach size={16} /></button>
            <input ref={fileInputRef} type="file" style={{ display:"none" }} />
            <textarea
              id="chat-input"
              className="input-box"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isLoading ? lbl.placeholderLoading
                : (uiLocale === "en"
                  ? "Ask about a QMS procedure, standard, or document…"
                  : "Posez une question sur une procédure, norme ou document QMS…")}
              rows={2}
              disabled={isLoading}
            />
            <button id="send-btn" className="send-btn" onClick={handleSend}
              disabled={isLoading || !input.trim()} aria-label="Send">
              {isLoading ? (
                <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <IconSend size={15} />
              )}
            </button>
          </div>
          <p className="input-disclaimer">{lbl.disclaimer}</p>
        </div>

      </main>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Fix #5 — helper auth headers
function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export default function SearchPage() {
  const router = useRouter();
  const [user, setUser] = useState<{username:string;role:string}|null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);

  // Fix #15 — filtres étendus
  const [filterDocType, setFilterDocType] = useState("");
  const [filterSite, setFilterSite]       = useState("");
  const [filterCriticality, setFilterCriticality] = useState("");
  const [filterLanguage, setFilterLanguage]       = useState("");
  const [filterOwner, setFilterOwner]             = useState("");
  const [filterDateFrom, setFilterDateFrom]       = useState("");
  const [filterDateTo, setFilterDateTo]           = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("user");
    if (!s) { router.push("/login"); return; }
    setUser(JSON.parse(s));
  }, [router]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const body: any = { query, top_k: 12 };
      if (filterDocType.trim()) body.filters = { ...body.filters, doc_type: filterDocType.trim() };
      if (filterSite.trim()) body.filters = { ...body.filters, site: filterSite.trim() };
      // Fix #15 — utiliser endpoint avancé si filtres supplémentaires
      if (filterCriticality.trim()) body.criticality = filterCriticality.trim();
      if (filterLanguage.trim()) body.language = filterLanguage.trim();
      if (filterOwner.trim()) body.owner = filterOwner.trim();
      if (filterDateFrom.trim()) body.date_from = filterDateFrom.trim();
      if (filterDateTo.trim()) body.date_to = filterDateTo.trim();

      const hasAdvanced = filterCriticality || filterLanguage || filterOwner || filterDateFrom || filterDateTo;
      const endpoint = hasAdvanced ? "/api/search/advanced" : "/api/search";

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: authHeaders(),  // Fix #3 — auth
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const items = data.hits || [];
      setHits(items);
      setTotal(data.total ?? items.length);
    } catch { setHits([]); setTotal(0); }
    finally { setLoading(false); }
  };

  const relColor = (r: number) => r >= 0.7 ? "#22c55e" : r >= 0.45 ? "#f59e0b" : "#ef4444";

  const critBadge = (c: string) => {
    const low = (c || "").toLowerCase();
    const color = low === "critical" ? "#ef4444" : low === "high" ? "#f59e0b" : low === "medium" ? "#3b82f6" : "#22c55e";
    return <span style={{ fontSize:10, padding:"1px 7px", borderRadius:4, background:`${color}22`, color, border:`1px solid ${color}44`, fontWeight:700 }}>{c}</span>;
  };

  const filterInputStyle: React.CSSProperties = {
    border: "1px solid var(--color-input-border)",
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    background: "var(--color-input-bg)",
    color: "var(--color-text)",
    width: "100%",
  };

  if (!user) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--color-bg)"}}>Chargement…</div>;

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"inherit" }}>
      <header style={{ background:"var(--color-card)", borderBottom:"1px solid var(--color-border)", padding:"14px 28px", display:"flex", alignItems:"center", gap:14 }}>
        <Link href="/" style={{ color:"var(--color-text-muted)", textDecoration:"none", fontSize:14 }}>← Chat</Link>
        <div style={{ width:1, height:22, background:"var(--color-border)" }} />
        <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>🔍 Recherche sémantique</h1>
        <span style={{ marginLeft:"auto", fontSize:12, color:"var(--color-text-faint)" }}>{user.username}</span>
      </header>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 20px" }}>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10, marginBottom:12 }}>
          <input
            id="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher dans les documents QMS…"
            style={{ flex:1, border:"1.5px solid var(--color-input-border)", borderRadius:10, padding:"12px 16px", fontSize:15, outline:"none", fontFamily:"inherit", background:"var(--color-input-bg)", color:"var(--color-text)" }}
          />
          <button id="search-btn" type="submit" disabled={loading} style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:10, padding:"12px 22px", fontWeight:600, cursor:"pointer", fontSize:15 }}>
            {loading ? "…" : "Rechercher"}
          </button>
        </form>

        {/* Fix #15 — Filtres de base */}
        <div style={{ display:"flex", gap:10, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            {label:"Type doc", val:filterDocType, set:setFilterDocType, ph:"Procédure"},
            {label:"Site",     val:filterSite,    set:setFilterSite,    ph:"default"},
          ].map(f => (
            <div key={f.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <label style={{ fontSize:12, color:"var(--color-text-muted)", fontWeight:500 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ ...filterInputStyle, width:120 }} />
            </div>
          ))}

          {/* Toggle filtres avancés */}
          <button
            onClick={() => setShowAdvanced(s => !s)}
            style={{ marginLeft:"auto", fontSize:12, padding:"5px 12px", borderRadius:7, border:"1px solid var(--color-border)", background:"var(--color-card)", color:"var(--color-text-muted)", cursor:"pointer" }}
          >
            {showAdvanced ? "▲ Moins de filtres" : "▼ Filtres avancés"}
          </button>
        </div>

        {/* Fix #15 — Filtres avancés */}
        {showAdvanced && (
          <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:12, padding:"16px 20px", marginBottom:20, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:14 }}>
            {[
              {label:"Criticité", val:filterCriticality, set:setFilterCriticality, opts:["","Low","Medium","High","Critical"]},
              {label:"Langue",    val:filterLanguage,    set:setFilterLanguage,    opts:["","fr","en"]},
            ].map(f => (
              <div key={f.label}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:5, textTransform:"uppercase" }}>{f.label}</label>
                <select value={f.val} onChange={e => f.set(e.target.value)} style={{ ...filterInputStyle, padding:"6px 10px" }}>
                  {f.opts.map(o => <option key={o} value={o}>{o || "Tous"}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:5, textTransform:"uppercase" }}>Owner</label>
              <input value={filterOwner} onChange={e => setFilterOwner(e.target.value)} placeholder="ex: QMS"
                style={{ ...filterInputStyle }} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:5, textTransform:"uppercase" }}>Date depuis</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ ...filterInputStyle }} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:5, textTransform:"uppercase" }}>Date jusqu'à</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ ...filterInputStyle }} />
            </div>
          </div>
        )}

        {/* Résultats */}
        {searched && !loading && hits.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 0", color:"var(--color-text-faint)" }}>
            Aucun résultat pour <strong>{query}</strong>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {hits.map((h, i) => (
            <div key={i} style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:12, padding:"16px 18px", boxShadow:"var(--shadow-soft)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--color-accent)" }}>{h.filename || "Document"}</span>
                  {h.doc_type && <span style={{ fontSize:11, background:"var(--color-bg-subtle)", border:"1px solid var(--color-border)", borderRadius:4, padding:"1px 7px" }}>{h.doc_type}</span>}
                  {h.criticality && critBadge(h.criticality)}
                  {h.language && <span style={{ fontSize:10, color:"var(--color-text-faint)", padding:"1px 6px", borderRadius:4, background:"var(--color-bg-subtle)" }}>{h.language.toUpperCase()}</span>}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:relColor(h.relevance) }}>
                  {Math.round(h.relevance * 100)}% pertinence
                </span>
              </div>
              <p style={{ fontSize:12, color:"var(--color-text-faint)", marginBottom:8 }}>{h.section_ref}</p>
              {(h.owner || h.version || h.uploaded_at) && (
                <div style={{ display:"flex", gap:12, fontSize:11, color:"var(--color-text-faint)", marginBottom:8 }}>
                  {h.owner && <span>Owner: {h.owner}</span>}
                  {h.version && <span>v{h.version}</span>}
                  {h.uploaded_at && <span>{new Date(h.uploaded_at).toLocaleDateString("fr-FR")}</span>}
                </div>
              )}
              <p style={{ fontSize:13.5, color:"var(--color-text-muted)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                {h.excerpt?.slice(0, 500)}{h.excerpt?.length > 500 ? "…" : ""}
              </p>
              <div style={{ marginTop:10, height:3, background:"var(--color-border)", borderRadius:2 }}>
                <div style={{ width:`${h.relevance*100}%`, height:"100%", background:relColor(h.relevance), borderRadius:2, transition:"width 0.4s" }} />
              </div>
            </div>
          ))}
        </div>

        {hits.length > 0 && (
          <p style={{ textAlign:"center", fontSize:12, color:"var(--color-text-faint)", marginTop:20 }}>
            {total} résultat{total > 1 ? "s" : ""} — triés par pertinence (RAG + reranker)
          </p>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function SearchPage() {
  const router = useRouter();
  const [user, setUser] = useState<{username:string;role:string}|null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [filterDocType, setFilterDocType] = useState("");
  const [filterSite, setFilterSite] = useState("");

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
      const filters: Record<string,string> = {};
      if (filterDocType.trim()) filters.doc_type = filterDocType.trim();
      if (filterSite.trim()) filters.site = filterSite.trim();
      const res = await fetch(`${API}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 10, filters }),
      });
      const data = await res.json();
      setHits(data.hits || []);
    } catch { setHits([]); }
    finally { setLoading(false); }
  };

  const relColor = (r: number) => r >= 0.7 ? "#22c55e" : r >= 0.45 ? "#f59e0b" : "#ef4444";

  if (!user) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--color-bg)"}}>Chargement…</div>;

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"inherit" }}>
      <header style={{ background:"#fff", borderBottom:"1px solid var(--color-border)", padding:"14px 28px", display:"flex", alignItems:"center", gap:14 }}>
        <Link href="/" style={{ color:"var(--color-text-muted)", textDecoration:"none", fontSize:14 }}>← Chat</Link>
        <div style={{ width:1, height:22, background:"var(--color-border)" }} />
        <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>🔍 Recherche sémantique</h1>
        <span style={{ marginLeft:"auto", fontSize:12, color:"var(--color-text-faint)" }}>{user.username}</span>
      </header>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"32px 20px" }}>
        <form onSubmit={handleSearch} style={{ display:"flex", gap:10, marginBottom:16 }}>
          <input
            id="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher dans les documents QMS…"
            style={{ flex:1, border:"1.5px solid var(--color-input-border)", borderRadius:10, padding:"12px 16px", fontSize:15, outline:"none", fontFamily:"inherit" }}
          />
          <button id="search-btn" type="submit" disabled={loading} style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:10, padding:"12px 22px", fontWeight:600, cursor:"pointer", fontSize:15 }}>
            {loading ? "…" : "Rechercher"}
          </button>
        </form>

        {/* Filters */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {[{label:"Type doc", val:filterDocType, set:setFilterDocType, ph:"Procédure"},
            {label:"Site",     val:filterSite,    set:setFilterSite,    ph:"default"}
          ].map(f => (
            <div key={f.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <label style={{ fontSize:12, color:"var(--color-text-muted)", fontWeight:500 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ border:"1px solid var(--color-input-border)", borderRadius:7, padding:"5px 10px", fontSize:13, outline:"none", fontFamily:"inherit", width:120 }} />
            </div>
          ))}
        </div>

        {/* Results */}
        {searched && !loading && hits.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 0", color:"var(--color-text-faint)" }}>
            Aucun résultat trouvé pour <strong>{query}</strong>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {hits.map((h, i) => (
            <div key={i} style={{ background:"#fff", border:"1px solid var(--color-border)", borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--color-accent)" }}>{h.filename || "Document"}</span>
                  {h.doc_type && <span style={{ marginLeft:8, fontSize:11, background:"var(--color-bg-subtle)", border:"1px solid var(--color-border)", borderRadius:4, padding:"1px 7px" }}>{h.doc_type}</span>}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:relColor(h.relevance) }}>
                  {Math.round(h.relevance * 100)}% pertinence
                </span>
              </div>
              <p style={{ fontSize:12, color:"var(--color-text-faint)", marginBottom:8 }}>{h.section_ref}</p>
              <p style={{ fontSize:13.5, color:"var(--color-text-muted)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                {h.excerpt?.slice(0, 500)}{h.excerpt?.length > 500 ? "…" : ""}
              </p>
              {/* Relevance bar */}
              <div style={{ marginTop:10, height:3, background:"var(--color-border)", borderRadius:2 }}>
                <div style={{ width:`${h.relevance*100}%`, height:"100%", background:relColor(h.relevance), borderRadius:2, transition:"width 0.4s" }} />
              </div>
            </div>
          ))}
        </div>

        {hits.length > 0 && (
          <p style={{ textAlign:"center", fontSize:12, color:"var(--color-text-faint)", marginTop:20 }}>
            {hits.length} résultat{hits.length > 1 ? "s" : ""} — triés par pertinence (RAG + reranker)
          </p>
        )}
      </div>
    </div>
  );
}

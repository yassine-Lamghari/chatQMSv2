"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";

export default function LogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const [logs, setLogs]             = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter]   = useState("");
  const [userFilter, setUserFilter]   = useState("");

  // Fix #11 — Pagination
  const [page, setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]   = useState(0);
  const PER_PAGE = 50;

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetchLogs(1, controller.signal);
    return () => controller.abort();
  }, [user]);

  const fetchLogs = async (p = page, signal?: AbortSignal) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PER_PAGE), page: String(p) });
      if (logsFilter.trim()) params.set("action", logsFilter.trim());
      if (userFilter.trim()) params.set("username", userFilter.trim());
      const data = await apiFetch<any>(`/api/logs?${params.toString()}`, { signal });
      if (signal?.aborted) return;
      // Support ancien format tableau + nouveau format paginé
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
        setPage(data.page || 1);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      if (!signal?.aborted) setLogsLoading(false);
    }
  };

  const handleFilter = () => { setPage(1); fetchLogs(1); };

  const goToPage = (p: number) => {
    const np = Math.max(1, Math.min(p, totalPages));
    setPage(np);
    fetchLogs(np);
  };

  const confidenceColor = (c: string) => {
    const v = (c || "").toLowerCase();
    if (v === "élevé" || v === "high") return "#22c55e";
    if (v === "moyen" || v === "medium") return "#f59e0b";
    return "#ef4444";
  };

  if (!user) return <div className="centered-screen">Chargement…</div>;

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"var(--font-sans)" }}>

      <PageHeader
        title="📋 Logs d'activité"
        backHref="/"
        backLabel="← Retour au Chat"
        meta={<span>{total} entrées au total</span>}
      />

      <div className="page-container">
        <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"var(--shadow-soft)" }}>

          {/* Statistiques rapides */}
          {logs.length > 0 && (() => {
            const counts: Record<string, number> = {};
            logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
            return (
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:20 }}>
                {Object.entries(counts).map(([action, count]) => (
                  <span key={action} style={{ fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20, background:"var(--color-bg)", border:"1px solid var(--color-border)", color:"var(--color-text-muted)" }}>
                    {action} × {count}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Filtres — Fix #11 + recherche par user */}
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:4, textTransform:"uppercase" }}>Action</label>
              <select
                value={logsFilter}
                onChange={e => setLogsFilter(e.target.value)}
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", fontFamily:"inherit", background:"var(--color-input-bg)", color:"var(--color-text)" }}
              >
                <option value="">Toutes</option>
                <option value="chat">Chat</option>
                <option value="upload">Upload</option>
                <option value="delete">Supprimer</option>
                <option value="audit">Audit</option>
                <option value="search">Recherche</option>
              </select>
            </div>

            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--color-text-muted)", marginBottom:4, textTransform:"uppercase" }}>Utilisateur</label>
              <input
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                placeholder="ex: admin"
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", fontFamily:"inherit", background:"var(--color-input-bg)", color:"var(--color-text)", width:140 }}
              />
            </div>

            <button onClick={handleFilter} style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:8, padding:"9px 20px", fontWeight:600, cursor:"pointer", fontSize:14 }}>
              🔍 Filtrer
            </button>
            <button onClick={() => { setLogsFilter(""); setUserFilter(""); setPage(1); fetchLogs(1); }} style={{ background:"var(--color-bg-subtle)", color:"var(--color-text-muted)", border:"1px solid var(--color-border)", borderRadius:8, padding:"9px 16px", cursor:"pointer", fontSize:13 }}>
              Réinitialiser
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, textAlign:"left" }}>
              <thead>
                <tr style={{ background:"var(--color-bg-subtle)", color:"var(--color-text-muted)" }}>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Date/Heure</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Utilisateur</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Action</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Requête</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Confiance</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Résumé</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--color-text-faint)" }}>Chargement…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--color-text-faint)" }}>Aucun log trouvé.</td></tr>
                ) : (
                  logs.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom:"1px solid var(--color-bg-subtle)", background: i % 2 === 0 ? "transparent" : "var(--color-bg-subtle)" }}>
                      <td style={{ padding:"10px 14px", whiteSpace:"nowrap", fontSize:12 }}>{new Date(log.timestamp || log.created_at).toLocaleString("fr-FR")}</td>
                      <td style={{ padding:"10px 14px", fontWeight:600 }}>{log.username}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:4, background:"var(--color-pill-bg)", color:"var(--color-accent)", fontSize:11, fontWeight:700, border:"1px solid var(--color-pill-border)" }}>{log.action}</span>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={log.query || "-"}>
                          {log.query || "-"}
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        {log.confidence ? (
                          <span style={{ color: confidenceColor(log.confidence), fontWeight:600 }}>{log.confidence}</span>
                        ) : "-"}
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ maxWidth:280, maxHeight:48, overflowY:"auto", fontSize:12, color:"var(--color-text-muted)" }}>
                          {log.response_summary || "-"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — Fix #11 */}
          {totalPages > 1 && (
            <div style={{ marginTop:20, display:"flex", justifyContent:"center", alignItems:"center", gap:8 }}>
              <button onClick={() => goToPage(1)} disabled={page === 1} style={paginBtnStyle(page === 1)}>«</button>
              <button onClick={() => goToPage(page - 1)} disabled={page === 1} style={paginBtnStyle(page === 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => goToPage(p)} style={paginBtnStyle(false, p === page)}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} style={paginBtnStyle(page === totalPages)}>›</button>
              <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} style={paginBtnStyle(page === totalPages)}>»</button>
              <span style={{ fontSize:12, color:"var(--color-text-faint)", marginLeft:8 }}>
                Page {page} / {totalPages} — {total} entrées
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const paginBtnStyle = (disabled: boolean, active = false): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 7,
  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
  background: active ? "var(--color-accent)" : "var(--color-card)",
  color: active ? "white" : disabled ? "var(--color-text-faint)" : "var(--color-text)",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: active ? 700 : 400,
  fontSize: 13,
  opacity: disabled ? 0.5 : 1,
  transition: "all 0.15s",
});

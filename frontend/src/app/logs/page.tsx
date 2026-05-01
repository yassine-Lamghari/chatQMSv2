"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function LogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const [logs, setLogs]           = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter]   = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { router.push("/"); return; }
    setUser(u);
    fetchLogs();
  }, [router]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (logsFilter.trim()) params.set("action", logsFilter.trim());
      const res = await fetch(`${API_BASE_URL}/api/logs?${params}`);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLogsLoading(false);
    }
  };

  if (!user) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--color-bg)", color:"var(--color-text-muted)" }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"'Söhne', system-ui, sans-serif" }}>

      <header style={{ background:"#ffffff", borderBottom:"1px solid var(--color-border)", padding:"16px 32px", display:"flex", alignItems:"center", gap:"16px" }}>
        <Link href="/" style={{ color:"var(--color-text-muted)", textDecoration:"none", fontSize:14, display:"flex", alignItems:"center", gap:6 }}>
          ← Retour au Chat
        </Link>
        <div style={{ width:1, height:24, background:"var(--color-border)" }} />
        <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:"var(--color-text)" }}>
          📋 Logs d'activité
        </h1>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>
        <div style={{ background:"#ffffff", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ margin:0, fontSize:16, fontWeight:600 }}>Historique des actions système</h2>
            <button
              onClick={fetchLogs}
              style={{ background:"var(--color-bg-subtle)", color:"var(--color-text)", border:"1px solid var(--color-border)", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:500 }}
            >
              🔄 Actualiser
            </button>
          </div>

          {/* Stats */}
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
                <span style={{ fontSize:12, color:"var(--color-text-faint)", marginLeft:"auto", alignSelf:"center" }}>{logs.length} entrées</span>
              </div>
            );
          })()}

          {/* Filter */}
          <div style={{ display:"flex", gap:12, marginBottom:24 }}>
            <select
              value={logsFilter}
              onChange={e => setLogsFilter(e.target.value)}
              style={{ padding:"8px 12px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", flex:1, maxWidth:200, fontFamily:"inherit" }}
            >
              <option value="">Toutes les actions</option>
              <option value="chat">Chat</option>
              <option value="upload">Upload</option>
              <option value="delete">Supprimer</option>
              <option value="audit">Audit</option>
              <option value="search">Recherche</option>
            </select>
            <button onClick={fetchLogs} style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:500, cursor:"pointer" }}>
              Filtrer
            </button>
          </div>

          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, textAlign:"left" }}>
              <thead>
                <tr style={{ background:"var(--color-bg-subtle)", color:"var(--color-text-muted)" }}>
                  <th style={{ padding:"10px 14px", fontWeight:600, borderRadius:"8px 0 0 8px" }}>Date/Heure</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Utilisateur</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Action</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Requête</th>
                  <th style={{ padding:"10px 14px", fontWeight:600 }}>Confiance</th>
                  <th style={{ padding:"10px 14px", fontWeight:600, borderRadius:"0 8px 8px 0" }}>Résumé / Détail</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--color-text-faint)" }}>Chargement…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--color-text-faint)" }}>Aucun log trouvé.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom:"1px solid var(--color-bg-subtle)" }}>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding:"12px 14px", fontWeight:500 }}>{log.username}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:4, background:"var(--color-bg-subtle)", fontSize:11, fontWeight:600 }}>{log.action}</span>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={log.query || "-"}>
                          {log.query || "-"}
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>{log.confidence || "-"}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ maxWidth:300, maxHeight:60, overflowY:"auto", fontSize:12, color:"var(--color-text-muted)" }} title={log.response_summary || "-"}>
                          {log.response_summary || "-"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type PfmeaRow = {
  line: number;
  process_step: string;
  product: string;
  failure_mode: string;
  effects: string;
  severity: string;
  occurrence: string;
  detection: string;
  rpn: string;
  recommended_actions: string;
  rag_context_excerpt?: string;
  _missing?: string[];
  _warnings?: string[];
};

export default function PfmeaPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  // Form state
  const [process, setProcess]         = useState("");
  const [product, setProduct]         = useState("");
  const [defects, setDefects]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // PFMEA table
  const [rows, setRows]               = useState<PfmeaRow[]>([]);
  const [excerpts, setExcerpts]       = useState<string[]>([]);
  const [verifying, setVerifying]     = useState<number | null>(null);
  const [showExcerpts, setShowExcerpts] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const u = JSON.parse(stored);
    setUser(u);
  }, [router]);

  const handleGenerate = async () => {
    if (!process.trim() || !product.trim()) {
      setError("Processus et produit sont requis.");
      return;
    }
    setLoading(true); setError(null); setRows([]); setExcerpts([]);
    try {
      const res = await fetch(`${API}/api/generate/pfmea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process, product, known_defects: defects, top_k: 4 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Erreur serveur"); }
      const data = await res.json();
      setRows((data.rows || []).map((r: any) => ({ ...r, _missing: [], _warnings: [] })));
      setExcerpts(data.rag_excerpts_used || []);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la génération.");
    } finally { setLoading(false); }
  };

  const updateCell = (idx: number, field: keyof PfmeaRow, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      // auto-compute RPN when S/O/D all filled
      const s = parseInt(updated.severity), o = parseInt(updated.occurrence), d = parseInt(updated.detection);
      if (!isNaN(s) && !isNaN(o) && !isNaN(d)) updated.rpn = String(s * o * d);
      return updated;
    }));
  };

  const verifyRow = async (idx: number) => {
    setVerifying(idx);
    try {
      const res = await fetch(`${API}/api/generate/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pfmea_row", data: rows[idx] }),
      });
      if (!res.ok) throw new Error("Erreur vérification");
      const data = await res.json();
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, _missing: data.missing_fields, _warnings: data.warnings } : r));
    } catch { /* silent */ }
    finally { setVerifying(null); }
  };

  const exportExcel = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/generate/pfmea/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, process, product }),
      });
      if (!res.ok) { alert("Export Excel échoué"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `pfmea_${process}_${product}.xlsx`.replace(/\s+/g, "_"); a.click();
    } catch { alert("Erreur export Excel"); }
  };

  const exportCSV = () => {
    const headers = ["Ligne","Étape process","Produit","Mode de défaillance","Effets","S","O","D","RPN","Actions recommandées"];
    const lines = rows.map(r => [
      r.line, r.process_step, r.product, r.failure_mode, r.effects,
      r.severity, r.occurrence, r.detection, r.rpn, r.recommended_actions,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pfmea_${process}_${product}.csv`.replace(/\s+/g,"_"); a.click();
  };

  const rpnColor = (rpn: string) => {
    const v = parseInt(rpn);
    if (isNaN(v) || !rpn) return "#475569";
    if (v > 200) return "#ef4444";
    if (v > 100) return "#f59e0b";
    return "#22c55e";
  };

  if (!user) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a", color:"#94a3b8" }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", color:"#e2e8f0", fontFamily:"Inter, system-ui, sans-serif" }}>

      {/* Top bar */}
      <header style={{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"16px 32px", display:"flex", alignItems:"center", gap:"16px" }}>
        <Link href="/admin" style={{ color:"#94a3b8", textDecoration:"none", fontSize:14, display:"flex", alignItems:"center", gap:6 }}>
          ← Admin
        </Link>
        <div style={{ width:1, height:24, background:"#334155" }} />
        <h1 style={{ fontSize:20, fontWeight:700, margin:0, background:"linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          ⚙ Générateur PFMEA
        </h1>
        <span style={{ marginLeft:"auto", fontSize:12, color:"#64748b", background:"#0f172a", padding:"4px 12px", borderRadius:20, border:"1px solid #334155" }}>
          {user.username} · admin
        </span>
      </header>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"32px 24px" }}>

        {/* Input card */}
        <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:24, marginBottom:24 }}>
          <h2 style={{ margin:"0 0 20px", fontSize:16, fontWeight:600, color:"#f1f5f9" }}>Paramètres de génération</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={labelStyle}>Processus *</label>
              <input value={process} onChange={e => setProcess(e.target.value)} placeholder="ex: Soudure, Assemblage, Peinture…"
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Produit *</label>
              <input value={product} onChange={e => setProduct(e.target.value)} placeholder="ex: Châssis A320, Boîtier moteur…"
                style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Défauts connus (séparés par virgule)</label>
            <input value={defects} onChange={e => setDefects(e.target.value)}
              placeholder="ex: Fissure, Mauvais positionnement, Soudure froide"
              style={{ ...inputStyle, width:"100%" }} />
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <button onClick={handleGenerate} disabled={loading} style={btnPrimary}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <svg className="spin-anim" width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <circle cx={12} cy={12} r={10} stroke="white" strokeWidth={3} strokeOpacity={0.3}/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth={3} strokeLinecap="round"/>
                  </svg>
                  Génération RAG…
                </span>
              ) : "⚡ Générer PFMEA"}
            </button>
            {rows.length > 0 && (
              <>
                <button onClick={exportCSV} style={btnSecondary}>📥 Export CSV</button>
                <button onClick={exportExcel} style={{...btnSecondary, background:"#166534", color:"#bbf7d0", border:"1px solid #16a34a"}}>📊 Export Excel</button>
                <button onClick={() => setShowExcerpts(s => !s)} style={{ ...btnSecondary, background:"transparent" }}>
                  {showExcerpts ? "Masquer" : "Voir"} contexte RAG ({excerpts.length})
                </button>
              </>
            )}
          </div>
          {error && <p style={{ marginTop:12, color:"#f87171", fontSize:13, background:"#7f1d1d22", border:"1px solid #7f1d1d", borderRadius:8, padding:"8px 14px" }}>{error}</p>}
        </div>

        {/* RAG excerpts */}
        {showExcerpts && excerpts.length > 0 && (
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:24, marginBottom:24 }}>
            <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:600, color:"#f59e0b" }}>📚 Extraits RAG utilisés</h3>
            {excerpts.map((ex, i) => (
              <div key={i} style={{ background:"#0f172a", borderRadius:8, padding:"10px 14px", marginBottom:8, fontSize:12, color:"#94a3b8", borderLeft:"3px solid #f59e0b" }}>
                [{i + 1}] {ex.slice(0, 400)}…
              </div>
            ))}
          </div>
        )}

        {/* PFMEA table */}
        {rows.length > 0 && (
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:24, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:16, fontWeight:600 }}>Tableau PFMEA — {rows.length} lignes</h2>
              <span style={{ fontSize:12, color:"#64748b" }}>Éditez les cellules, puis vérifiez chaque ligne</span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#0f172a" }}>
                    {["#","Étape process","Mode défaillance","Effets","S","O","D","RPN","Actions","Statut","Vérifier"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#94a3b8", fontWeight:600, whiteSpace:"nowrap", borderBottom:"1px solid #334155" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rpn = parseInt(row.rpn);
                    const hasIssues = (row._missing?.length ?? 0) > 0 || (row._warnings?.length ?? 0) > 0;
                    const isOk = !hasIssues && row._missing !== undefined;
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "#1e293b" : "#162032", transition:"background 0.15s" }}>
                        <td style={{ padding:"8px 12px", color:"#64748b", fontWeight:700 }}>{row.line}</td>
                        <td style={{ padding:"8px 12px" }}>
                          <input value={row.process_step} onChange={e => updateCell(idx, "process_step", e.target.value)} style={cellInput} />
                        </td>
                        <td style={{ padding:"8px 12px" }}>
                          <input value={row.failure_mode} onChange={e => updateCell(idx, "failure_mode", e.target.value)} style={cellInput} />
                        </td>
                        <td style={{ padding:"8px 12px" }}>
                          <input value={row.effects} onChange={e => updateCell(idx, "effects", e.target.value)} style={cellInput} />
                        </td>
                        {(["severity","occurrence","detection"] as (keyof PfmeaRow)[]).map(field => (
                          <td key={field} style={{ padding:"8px 12px" }}>
                            <input type="number" min={1} max={10} value={row[field] as string}
                              onChange={e => updateCell(idx, field, e.target.value)}
                              style={{ ...cellInput, width:48, textAlign:"center" }} />
                          </td>
                        ))}
                        <td style={{ padding:"8px 12px" }}>
                          <span style={{ fontWeight:700, color: rpnColor(row.rpn), fontSize:13 }}>
                            {row.rpn || "—"}
                          </span>
                        </td>
                        <td style={{ padding:"8px 12px" }}>
                          <input value={row.recommended_actions} onChange={e => updateCell(idx, "recommended_actions", e.target.value)} style={{ ...cellInput, width:160 }} />
                        </td>
                        <td style={{ padding:"8px 12px", whiteSpace:"nowrap" }}>
                          {(row._missing?.length ?? 0) > 0 && (
                            <span style={{ color:"#f87171", fontSize:11 }}>❌ {row._missing!.join(", ")}</span>
                          )}
                          {(row._warnings?.length ?? 0) > 0 && (
                            <span style={{ color:"#fbbf24", fontSize:11, display:"block" }}>⚠ {row._warnings![0]}</span>
                          )}
                          {isOk && <span style={{ color:"#4ade80", fontSize:11 }}>✓ OK</span>}
                        </td>
                        <td style={{ padding:"8px 12px" }}>
                          <button onClick={() => verifyRow(idx)} disabled={verifying === idx}
                            style={{ background:"#1d4ed8", color:"white", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", opacity: verifying === idx ? 0.6 : 1 }}>
                            {verifying === idx ? "…" : "Vérifier"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ marginTop:16, display:"flex", gap:20, fontSize:11, color:"#64748b" }}>
              <span><span style={{ color:"#22c55e", fontWeight:700 }}>●</span> RPN ≤ 100 : OK</span>
              <span><span style={{ color:"#f59e0b", fontWeight:700 }}>●</span> RPN 101–200 : Surveiller</span>
              <span><span style={{ color:"#ef4444", fontWeight:700 }}>●</span> RPN &gt; 200 : Action requise</span>
              <span style={{ marginLeft:"auto" }}>S × O × D = RPN (calculé automatiquement)</span>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .spin-anim { animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display:"block", fontSize:12, fontWeight:500, color:"#94a3b8", marginBottom:6 };
const inputStyle: React.CSSProperties = { width:"100%", background:"#0f172a", border:"1px solid #475569", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" };
const cellInput: React.CSSProperties = { background:"#0f172a", border:"1px solid #334155", borderRadius:6, padding:"5px 8px", color:"#e2e8f0", fontSize:12, outline:"none", width:120 };
const btnPrimary: React.CSSProperties = { background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"white", border:"none", borderRadius:10, padding:"12px 24px", fontWeight:600, fontSize:14, cursor:"pointer" };
const btnSecondary: React.CSSProperties = { background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:10, padding:"12px 20px", fontWeight:500, fontSize:13, cursor:"pointer" };

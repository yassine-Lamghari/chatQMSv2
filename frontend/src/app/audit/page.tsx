"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

// Fix #13 — type checklist interactive
type ChecklistItem = { question: string; checked: boolean; note: string };

export default function AuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const [auditStandard, setAuditStandard] = useState("ISO 9001");
  const [auditProcess, setAuditProcess]   = useState("");
  const [auditDepth, setAuditDepth]       = useState("normal");
  const [auditResult, setAuditResult]     = useState<any>(null);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [auditError, setAuditError]       = useState<string | null>(null);

  // Fix #13 — état de la checklist interactive
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Fix #17 — statut LLM
  const [llmStatus, setLlmStatus] = useState<{configured:boolean;message:string}|null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
    // Fix #17 — vérifier LLM au chargement
    fetch(`${API_BASE_URL}/api/llm/status`).then(r => r.json()).then(setLlmStatus).catch(() => {});
  }, [router]);

  const handleGenerateAudit = async () => {
    if (!auditProcess.trim()) { setAuditError("Veuillez saisir un processus."); return; }
    setAuditLoading(true); setAuditError(null); setAuditResult(null); setChecklist([]); setSaved(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/assistant`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ standard: auditStandard, process: auditProcess, depth: auditDepth, top_k: 5 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Erreur serveur"); }
      const data = await res.json();
      setAuditResult(data);
      // Fix #13 — initialiser la checklist interactive
      const items: ChecklistItem[] = (data.checklist_normative || []).map((q: string) => ({
        question: q, checked: false, note: "",
      }));
      setChecklist(items);
    } catch (e: any) {
      setAuditError(e.message || "Erreur lors de la génération.");
    } finally { setAuditLoading(false); }
  };

  const handleExportAudit = (fmt: "docx" | "pdf") => {
    const params = new URLSearchParams({ standard: auditStandard, process: auditProcess, format: fmt });
    window.open(`${API_BASE_URL}/api/audit/export?${params}`, "_blank");
  };

  // Fix #13 — sauvegarde de la checklist remplie
  const handleSaveChecklist = async () => {
    if (!user || !checklist.length) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/checklist/save`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ standard: auditStandard, process: auditProcess, checklist, username: user.username }),
      });
      if (res.ok) { setSaved(true); }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const toggleCheck = (i: number) =>
    setChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item));

  const updateNote = (i: number, note: string) =>
    setChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, note } : item));

  const checkedCount = checklist.filter(c => c.checked).length;

  if (!user) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--color-bg)", color:"var(--color-text-muted)" }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"var(--font-sans)" }}>

      <header style={{ background:"var(--color-card)", borderBottom:"1px solid var(--color-border)", padding:"16px 32px", display:"flex", alignItems:"center", gap:"16px" }}>
        <Link href="/" style={{ color:"var(--color-text-muted)", textDecoration:"none", fontSize:14, display:"flex", alignItems:"center", gap:6 }}>
          ← Retour au Chat
        </Link>
        <div style={{ width:1, height:24, background:"var(--color-border)" }} />
        <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:"var(--color-text)" }}>
          🗂 Assistant Audit QMS
        </h1>
        <span style={{ marginLeft:"auto", fontSize:12, color:"var(--color-text-faint)" }}>{user.username}</span>
      </header>

      {/* Fix #17 — Bandeau statut LLM */}
      {llmStatus && !llmStatus.configured && (
        <div style={{ background:"#fef3c7", borderBottom:"1px solid #fde68a", padding:"10px 32px", fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 }}>
          <span>⚠️</span>
          <span>{llmStatus.message}</span>
        </div>
      )}

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 24px" }}>

        {/* Config card — Fix #16 CSS variables uniformisées */}
        <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:16, padding:24, marginBottom:24, boxShadow:"var(--shadow-soft)" }}>
          <h2 style={{ margin:"0 0 20px", fontSize:16, fontWeight:600, color:"var(--color-text)" }}>Paramètres de l'audit</h2>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={labelStyle}>Norme</label>
              <select value={auditStandard} onChange={e => setAuditStandard(e.target.value)} style={inputStyle}>
                <option value="ISO 9001">ISO 9001:2015</option>
                <option value="IATF 16949">IATF 16949:2016</option>
                <option value="ISO 14001">ISO 14001:2015</option>
                <option value="ISO 45001">ISO 45001:2018</option>
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={labelStyle}>Processus ciblé</label>
              <input value={auditProcess} onChange={e => setAuditProcess(e.target.value)}
                placeholder="ex: Document control, Production…" style={inputStyle} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={labelStyle}>Profondeur</label>
              <select value={auditDepth} onChange={e => setAuditDepth(e.target.value)} style={inputStyle}>
                <option value="light">Rapide (Light)</option>
                <option value="normal">Standard (Normal)</option>
                <option value="deep">Approfondi (Deep)</option>
              </select>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button onClick={handleGenerateAudit} disabled={auditLoading}
              style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:600, fontSize:14, cursor:"pointer", opacity: auditLoading ? 0.7 : 1 }}>
              {auditLoading ? "Génération…" : "⚡ Générer la checklist"}
            </button>
            {auditResult && (
              <>
                <button onClick={() => handleExportAudit("docx")}
                  style={{ background:"transparent", color:"var(--color-accent)", border:"1px solid var(--color-accent)", borderRadius:8, padding:"10px 16px", fontWeight:500, fontSize:14, cursor:"pointer" }}>
                  📄 Export Word
                </button>
                <button onClick={() => handleExportAudit("pdf")}
                  style={{ background:"transparent", color:"#ef4444", border:"1px solid #ef4444", borderRadius:8, padding:"10px 16px", fontWeight:500, fontSize:14, cursor:"pointer" }}>
                  📕 Export PDF
                </button>
              </>
            )}
          </div>
          {auditError && (
            <p style={{ marginTop:16, color:"#ef4444", fontSize:13, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px" }}>{auditError}</p>
          )}
        </div>

        {/* Résultats */}
        {auditResult && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Plan d'audit */}
            <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"var(--shadow-soft)" }}>
              <h4 style={{ margin:"0 0 16px", fontSize:15, fontWeight:600 }}>📅 Plan d'audit — {auditResult.standard} · {auditResult.process}</h4>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12 }}>
                {(auditResult.audit_plan || []).map((day: any, i: number) => (
                  <div key={i} style={{ background:"var(--color-bg-subtle)", borderRadius:10, padding:16 }}>
                    <p style={{ margin:"0 0 4px", color:"var(--color-accent)", fontWeight:700, fontSize:13 }}>Jour {day.day}</p>
                    <p style={{ margin:0, fontSize:14, color:"var(--color-text)" }}>{day.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Échantillonnage */}
            {auditResult.sampling && Object.keys(auditResult.sampling).length > 0 && (
              <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"var(--shadow-soft)" }}>
                <h4 style={{ margin:"0 0 16px", fontSize:15, fontWeight:600 }}>🎯 Plan d'échantillonnage</h4>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
                  {Object.entries(auditResult.sampling).map(([k, v]: any) => (
                    <div key={k} style={{ background:"var(--color-bg-subtle)", borderRadius:10, padding:"12px 16px" }}>
                      <p style={{ margin:"0 0 4px", fontSize:12, color:"var(--color-text-muted)" }}>{k}</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:500, color:"var(--color-text)" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix #13 — Checklist interactive avec cases à cocher */}
            {checklist.length > 0 && (
              <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"var(--shadow-soft)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
                  <h4 style={{ margin:0, fontSize:15, fontWeight:600 }}>
                    ✅ Checklist normative ({checkedCount}/{checklist.length} points vérifiés)
                  </h4>
                  {/* Barre de progression */}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:120, height:6, background:"var(--color-border)", borderRadius:3 }}>
                      <div style={{ width:`${checklist.length ? (checkedCount/checklist.length)*100 : 0}%`, height:"100%", background:"var(--color-accent)", borderRadius:3, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:12, color:"var(--color-text-faint)" }}>
                      {checklist.length ? Math.round((checkedCount/checklist.length)*100) : 0}%
                    </span>
                  </div>
                </div>

                <ul style={{ padding:0, margin:0, listStyle:"none", display:"flex", flexDirection:"column", gap:8, maxHeight:500, overflowY:"auto" }}>
                  {checklist.map((item, i) => (
                    <li key={i} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:8, background: item.checked ? "var(--color-pill-bg)" : "var(--color-bg-subtle)", border:`1px solid ${item.checked ? "var(--color-pill-border)" : "transparent"}`, transition:"all 0.2s" }}>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleCheck(i)}
                        style={{ width:16, height:16, accentColor:"var(--color-accent)", marginTop:2, flexShrink:0, cursor:"pointer" }}
                      />
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:14, color: item.checked ? "var(--color-text)" : "var(--color-text-muted)", textDecoration: item.checked ? "none" : "none" }}>
                          <span style={{ color:"var(--color-accent)", fontWeight:700, marginRight:6 }}>{i+1}.</span>
                          {item.question}
                        </span>
                        {item.checked && (
                          <input
                            value={item.note}
                            onChange={e => updateNote(i, e.target.value)}
                            placeholder="Note / observation (optionnel)"
                            style={{ display:"block", marginTop:6, width:"100%", border:"1px solid var(--color-input-border)", borderRadius:6, padding:"5px 10px", fontSize:12, outline:"none", fontFamily:"inherit", background:"var(--color-input-bg)", color:"var(--color-text)" }}
                          />
                        )}
                      </div>
                      {item.checked && <span style={{ color:"#22c55e", fontSize:16, flexShrink:0 }}>✓</span>}
                    </li>
                  ))}
                </ul>

                {/* Bouton sauvegarde */}
                <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end", gap:12 }}>
                  {saved && <span style={{ color:"#22c55e", fontSize:13, alignSelf:"center" }}>✓ Checklist sauvegardée</span>}
                  <button onClick={handleSaveChecklist} disabled={saving || checkedCount === 0}
                    style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:600, fontSize:13, cursor:"pointer", opacity: (saving || checkedCount === 0) ? 0.6 : 1 }}>
                    {saving ? "Sauvegarde…" : "💾 Sauvegarder la checklist"}
                  </button>
                </div>
              </div>
            )}

            {/* Vérifications RAG */}
            {(auditResult.rag_evidence_checks || []).length > 0 && (
              <div style={{ background:"var(--color-pill-bg)", border:"1px solid var(--color-pill-border)", borderRadius:16, padding:24 }}>
                <h4 style={{ margin:"0 0 16px", fontSize:15, fontWeight:600, color:"var(--color-accent)" }}>🔍 Vérifications RAG — preuves documentaires ({(auditResult.sources || []).length} sources)</h4>
                <ul style={{ padding:0, margin:0, listStyle:"none", display:"flex", flexDirection:"column", gap:8 }}>
                  {(auditResult.rag_evidence_checks || []).map((check: string, i: number) => (
                    <li key={i} style={{ fontSize:14, color:"var(--color-text)", background:"var(--color-card)", padding:"10px 14px", borderRadius:8, border:"1px solid var(--color-border)" }}>{check}</li>
                  ))}
                </ul>
                {(auditResult.sources || []).length > 0 && (
                  <div style={{ marginTop:16, display:"flex", flexWrap:"wrap", gap:8 }}>
                    {(auditResult.sources || []).map((s: any, i: number) => (
                      <span key={i} style={{ fontSize:12, background:"var(--color-card)", color:"var(--color-text-muted)", padding:"4px 10px", borderRadius:20, border:"1px solid var(--color-border)" }}>
                        {s.filename} · rel. {s.relevance}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Fix #16 — styles CSS variables (plus de valeurs hardcodées)
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--color-input-border)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  background: "var(--color-input-bg)",
  color: "var(--color-text)",
};

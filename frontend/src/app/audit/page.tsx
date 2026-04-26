"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  // ── F4 Audit state ──────────────────────────────────────────────
  const [auditStandard, setAuditStandard] = useState("ISO 9001");
  const [auditProcess, setAuditProcess]   = useState("");
  const [auditDepth, setAuditDepth]       = useState("normal");
  const [auditResult, setAuditResult]     = useState<any>(null);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [auditError, setAuditError]       = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleGenerateAudit = async () => {
    if (!auditProcess.trim()) { setAuditError("Veuillez saisir un processus."); return; }
    setAuditLoading(true); setAuditError(null); setAuditResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standard: auditStandard, process: auditProcess, depth: auditDepth, top_k: 5 }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Erreur serveur"); }
      setAuditResult(await res.json());
    } catch (e: any) {
      setAuditError(e.message || "Erreur lors de la génération.");
    } finally { setAuditLoading(false); }
  };

  const handleExportAudit = (fmt: "docx" | "pdf") => {
    const params = new URLSearchParams({ standard: auditStandard, process: auditProcess, format: fmt });
    window.open(`${API_BASE_URL}/api/audit/export?${params}`, "_blank");
  };

  if (!user) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--color-bg)", color:"var(--color-text-muted)" }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg)", color:"var(--color-text)", fontFamily:"'Söhne', system-ui, sans-serif" }}>

      {/* Top bar */}
      <header style={{ background:"#ffffff", borderBottom:"1px solid var(--color-border)", padding:"16px 32px", display:"flex", alignItems:"center", gap:"16px" }}>
        <Link href="/" style={{ color:"var(--color-text-muted)", textDecoration:"none", fontSize:14, display:"flex", alignItems:"center", gap:6 }}>
          ← Retour au Chat
        </Link>
        <div style={{ width:1, height:24, background:"var(--color-border)" }} />
        <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:"var(--color-text)" }}>
          🗂 Assistant Audit QMS
        </h1>
      </header>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 24px" }}>
        
        {/* Config card */}
        <div style={{ background:"#ffffff", border:"1px solid var(--color-border)", borderRadius:16, padding:24, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <h2 style={{ margin:"0 0 20px", fontSize:16, fontWeight:600 }}>Paramètres de l'audit</h2>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Norme</label>
              <select
                value={auditStandard}
                onChange={e => setAuditStandard(e.target.value)}
                style={{ padding:"10px 14px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", fontFamily:"inherit" }}
              >
                <option value="ISO 9001">ISO 9001:2015</option>
                <option value="IATF 16949">IATF 16949:2016</option>
                <option value="ISO 14001">ISO 14001:2015</option>
                <option value="ISO 45001">ISO 45001:2018</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Processus ciblé</label>
              <input
                value={auditProcess}
                onChange={e => setAuditProcess(e.target.value)}
                placeholder="ex: Document control, Production…"
                style={{ padding:"10px 14px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", fontFamily:"inherit" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Profondeur</label>
              <select
                value={auditDepth}
                onChange={e => setAuditDepth(e.target.value)}
                style={{ padding:"10px 14px", borderRadius:8, border:"1px solid var(--color-input-border)", fontSize:14, outline:"none", fontFamily:"inherit" }}
              >
                <option value="light">Rapide (Light)</option>
                <option value="normal">Standard (Normal)</option>
                <option value="deep">Approfondi (Deep)</option>
              </select>
            </div>
          </div>

          <div style={{ display:"flex", gap:12 }}>
            <button
              onClick={handleGenerateAudit}
              disabled={auditLoading}
              style={{ background:"var(--color-accent)", color:"white", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:600, fontSize:14, cursor:"pointer" }}
            >
              {auditLoading ? "Génération en cours…" : "⚡ Générer la checklist"}
            </button>

            {auditResult && (
              <>
                <button
                  onClick={() => handleExportAudit("docx")}
                  style={{ background:"transparent", color:"#3b82f6", border:"1px solid #3b82f6", borderRadius:8, padding:"10px 16px", fontWeight:500, fontSize:14, cursor:"pointer" }}
                >
                  📄 Export Word
                </button>
                <button
                  onClick={() => handleExportAudit("pdf")}
                  style={{ background:"transparent", color:"#ef4444", border:"1px solid #ef4444", borderRadius:8, padding:"10px 16px", fontWeight:500, fontSize:14, cursor:"pointer" }}
                >
                  📕 Export PDF
                </button>
              </>
            )}
          </div>

          {auditError && (
            <p style={{ marginTop:16, color:"#ef4444", fontSize:13, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px" }}>{auditError}</p>
          )}
        </div>

        {/* Results */}
        {auditResult && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            
            {/* Audit Plan */}
            <div style={{ background:"#ffffff", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
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

            {/* Sampling */}
            {auditResult.sampling && Object.keys(auditResult.sampling).length > 0 && (
              <div style={{ background:"#ffffff", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
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

            {/* Normative Checklist */}
            <div style={{ background:"#ffffff", border:"1px solid var(--color-border)", borderRadius:16, padding:24, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <h4 style={{ margin:"0 0 16px", fontSize:15, fontWeight:600 }}>✅ Checklist normative ({(auditResult.checklist_normative || []).length} points)</h4>
              <ul style={{ padding:0, margin:0, listStyle:"none", display:"flex", flexDirection:"column", gap:12, maxHeight:400, overflowY:"auto" }}>
                {(auditResult.checklist_normative || []).map((q: string, i: number) => (
                  <li key={i} style={{ display:"flex", gap:12, fontSize:14, background:"var(--color-bg-subtle)", padding:12, borderRadius:8 }}>
                    <span style={{ color:"var(--color-accent)", fontWeight:700 }}>{i + 1}.</span>
                    <span style={{ color:"var(--color-text)" }}>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* RAG Evidence Checks */}
            {(auditResult.rag_evidence_checks || []).length > 0 && (
              <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:16, padding:24 }}>
                <h4 style={{ margin:"0 0 16px", fontSize:15, fontWeight:600, color:"#d97706" }}>🔍 Vérifications RAG — preuves documentaires ({(auditResult.sources || []).length} sources)</h4>
                <ul style={{ padding:0, margin:0, listStyle:"none", display:"flex", flexDirection:"column", gap:8 }}>
                  {(auditResult.rag_evidence_checks || []).map((check: string, i: number) => (
                    <li key={i} style={{ fontSize:14, color:"#92400e", background:"#fef3c7", padding:"10px 14px", borderRadius:8 }}>{check}</li>
                  ))}
                </ul>
                {(auditResult.sources || []).length > 0 && (
                  <div style={{ marginTop:16, display:"flex", flexWrap:"wrap", gap:8 }}>
                    {(auditResult.sources || []).map((s: any, i: number) => (
                      <span key={i} style={{ fontSize:12, background:"#fde68a", color:"#b45309", padding:"4px 10px", borderRadius:20 }}>
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

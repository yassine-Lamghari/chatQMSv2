"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconQMS } from "../components/Icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Identifiants incorrects"); return; }
      localStorage.setItem("user", JSON.stringify({ username: data.username, role: data.role }));
      if (data.token) localStorage.setItem("token", data.token);
      router.push(data.role === "admin" ? "/admin" : "/");
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both; }

        .login-input {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 11px 42px 11px 40px;
          font-size: 14.5px;
          color: #111827;
          outline: none;
          font-family: inherit;
          background: #ffffff;
          transition: border-color 0.18s, box-shadow 0.18s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: #9ca3af; }
        .login-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }

        .login-btn {
          width: 100%;
          background: #f97316;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s ease;
          margin-top: 6px;
        }
        .login-btn:hover:not(:disabled) {
          background: #ea6c0a;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(249,115,22,0.3);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .eye-btn {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 3px;
          border-radius: 5px;
          background: none;
          border: none;
          transition: color 0.12s;
        }
        .eye-btn:hover { color: #f97316; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f7f8",
        padding: "24px",
      }}>
        <div className="login-card" style={{ width: "100%", maxWidth: "380px" }}>

          {/* Logo + Title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px", gap: "14px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(249,115,22,0.25)",
            }}>
              <IconQMS size={32} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", letterSpacing: "-0.025em" }}>
                QMS Assistant
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Connectez-vous à votre espace
              </p>
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)",
          }}>
            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13.5px",
                color: "#dc2626",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Username */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Nom d&apos;utilisateur
                </label>
                <div style={{ position: "relative" }}>
                  <span className="input-icon">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    id="username-input"
                    type="text"
                    required
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Votre identifiant"
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Mot de passe
                </label>
                <div style={{ position: "relative" }}>
                  <span className="input-icon">
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password-input"
                    type={showPass ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="login-input"
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass ? (
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button id="login-btn" type="submit" disabled={loading} className="login-btn">
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <svg style={{ animation: "spin 0.7s linear infinite" }} width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Connexion…
                  </span>
                ) : "Se connecter"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "18px" }}>
            Assistant QMS · RAG multilingue FR/EN
          </p>
        </div>
      </div>
    </>
  );
}

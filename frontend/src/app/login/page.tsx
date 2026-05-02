"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
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
    <div className="claude-theme" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px", gap: "14px" }}>
          <div className="claude-icon" style={{
            width: 52, height: 52, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "white", fontWeight: 700,
          }}>Q</div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              QMS Assistant
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Connectez-vous à votre espace
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "var(--shadow-card)",
        }}>
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: "8px", padding: "10px 14px",
              fontSize: "13.5px", color: "#b91c1c", marginBottom: "20px",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Nom d&apos;utilisateur
              </label>
              <input
                id="username-input"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                style={{
                  width: "100%", border: "1.5px solid var(--color-input-border)",
                  borderRadius: "9px", padding: "10px 14px",
                  fontSize: "15px", color: "var(--color-text)",
                  outline: "none", fontFamily: "inherit",
                  background: "var(--color-input-bg)",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.target.style.borderColor = "var(--color-input-border)"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Mot de passe
              </label>
              <input
                id="password-input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", border: "1.5px solid var(--color-input-border)",
                  borderRadius: "9px", padding: "10px 14px",
                  fontSize: "15px", color: "var(--color-text)",
                  outline: "none", fontFamily: "inherit",
                  background: "var(--color-input-bg)",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "var(--color-accent)"}
                onBlur={e => e.target.style.borderColor = "var(--color-input-border)"}
              />
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "var(--color-border-dark)" : "var(--color-accent)",
                color: "white",
                border: "none",
                borderRadius: "9px",
                padding: "12px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
                marginTop: "4px",
              }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--color-text-faint)", marginTop: "20px" }}>
          Assistant QMS · RAG multilingue FR/EN
        </p>
      </div>
    </div>
  );
}

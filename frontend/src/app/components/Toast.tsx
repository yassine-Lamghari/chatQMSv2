"use client";
import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";
export interface Toast { id: string; message: string; type: ToastType; }

let _addToast: ((msg: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
  _addToast?.(message, type);
}
export const toastSuccess = (m: string) => toast(m, "success");
export const toastError   = (m: string) => toast(m, "error");
export const toastWarning = (m: string) => toast(m, "warning");

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  const icons: Record<ToastType, string> = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const colors: Record<ToastType, string> = {
    success: "linear-gradient(135deg,#10b981,#059669)",
    error:   "linear-gradient(135deg,#ef4444,#dc2626)",
    warning: "linear-gradient(135deg,#f59e0b,#d97706)",
    info:    "linear-gradient(135deg,#3b82f6,#2563eb)",
  };

  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:10, padding:"12px 18px",
          borderRadius:12, background:colors[t.type], color:"white",
          fontSize:14, fontWeight:500, boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
          animation:"slideIn 0.25s ease-out", minWidth:260, maxWidth:380,
          pointerEvents:"auto", cursor:"default",
        }}>
          <span style={{ fontSize:16, fontWeight:700, flexShrink:0 }}>{icons[t.type]}</span>
          <span style={{ flex:1, lineHeight:1.4 }}>{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  json?: boolean;
  onUnauthorized?: () => void;
};

function handleUnauthorized(onUnauthorized?: () => void) {
  try {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  } catch {
    // Ignore storage errors
  }
  if (onUnauthorized) {
    onUnauthorized();
    return;
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { auth = true, json = true, onUnauthorized, ...init } = options;
  const headers = new Headers(init.headers || {});

  if (json && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    handleUnauthorized(onUnauthorized);
    throw new Error("unauthorized");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.detail || "";
    } catch {
      // ignore
    }
    const message = detail || res.statusText || `Request failed (${res.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  if (!json) return (res.text() as unknown) as T;
  return (await res.json()) as T;
}

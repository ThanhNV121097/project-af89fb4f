/**
 * Real client for `POST /v1/auth/login` (docs/architecture/services.md
 * §3.1), replacing lib/mock/owner-admin-sign-in.ts. Resolves the same
 * { token, email, name, role } shape on 200, rejects on any non-2xx — the
 * 400-vs-401 distinction is invisible to the caller by design (AUTH-002).
 */
const apiBase = import.meta.env.VITE_API_URL || "/api";

export interface LoginResult {
  token: string;
  email: string;
  name: string;
  role: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${apiBase}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("UNAUTHENTICATED");
  }
  return (await res.json()) as LoginResult;
}

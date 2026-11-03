/**
 * Mock sign-in: stands in for `POST /v1/auth/login` (docs/architecture/
 * services.md §3.1) until the backend story lands. One seeded admin,
 * mirroring src/data/admins.json's single real row (the blank admin-1 row
 * is never seeded — project memory `db.schema`). Deleted by the backend
 * story, which calls the real endpoint instead.
 */
export interface LoginResult {
  token: string;
  email: string;
  name: string;
  role: string;
}

const ADMINS = [
  { email: "brian.ng.2305@gmail.com", password: "shelf2026", name: "", role: "owner" },
];

/** Resolves on a matching email+password, rejects (UNAUTHENTICATED) otherwise. */
export function login(email: string, password: string): Promise<LoginResult> {
  const needle = email.trim().toLowerCase();
  const match = ADMINS.find((a) => a.email.toLowerCase() === needle);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!match || match.password !== password) {
        reject(new Error("UNAUTHENTICATED"));
        return;
      }
      resolve({ token: "mock-token", email: match.email, name: match.name, role: match.role });
    }, 350);
  });
}

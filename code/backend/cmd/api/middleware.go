package main

// Cross-cutting request concerns (docs/architecture/services.md §2.1/§2.2):
// the X-Request-Id trace header, and the one auth middleware gating
// POST /v1/products (GET /v1/admins* and GET /v1/telegram* are wired by the
// stories that own those reads).

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
)

type ctxKey int

const requestIDKey ctxKey = iota
const adminKey ctxKey = iota + 1

func newRequestID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// withRequestID assigns X-Request-Id (from the caller, or generated), puts it
// on the context for logging, and echoes it on every response.
func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set("X-Request-Id", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func requestID(r *http.Request) string {
	if id, ok := r.Context().Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// requireAuth wraps a handler with the one middleware named in
// services.md §2.2: missing header, malformed header, bad signature or an
// expired token are all the same 401 UNAUTHENTICATED, never a 403.
func requireAuth(secret []byte, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Sign in to continue.")
			return
		}
		c, err := parseJWT(secret, token)
		if err != nil {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Sign in to continue.")
			return
		}
		ctx := context.WithValue(r.Context(), adminKey, c)
		next(w, r.WithContext(ctx))
	}
}

func adminFromContext(r *http.Request) (claims, bool) {
	c, ok := r.Context().Value(adminKey).(claims)
	return c, ok
}

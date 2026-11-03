package main

// POST /v1/auth/login (docs/architecture/services.md §3.1, AUTH-001/002).

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const tokenLifetime = 24 * time.Hour

type loginRequest struct {
	Email    *string `json:"email"`
	Password *string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// loginHandler is public (no auth middleware) — it is how a session is
// obtained.
func loginHandler(db *sql.DB, jwtSecret []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var raw map[string]json.RawMessage
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&raw); err != nil {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Body must be valid JSON.")
			return
		}
		for field := range raw {
			if field != "email" && field != "password" {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Unknown field: "+field+".")
				return
			}
		}
		var req loginRequest
		if err := json.Unmarshal(mustMarshal(raw), &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Body must be valid JSON.")
			return
		}
		email := strings.TrimSpace(derefStr(req.Email))
		password := derefStr(req.Password)
		if email == "" || password == "" {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Email and password are required.")
			return
		}

		var (
			id, storedEmail, name, role, hash string
		)
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		err := db.QueryRowContext(ctx,
			`SELECT id, email, name, role, password_hash FROM admins WHERE lower(email) = lower($1)`,
			email,
		).Scan(&id, &storedEmail, &name, &role, &hash)
		if err == sql.ErrNoRows {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Incorrect email or password.")
			return
		}
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Incorrect email or password.")
			return
		}

		displayName := name
		if displayName == "" {
			displayName = nameFromEmail(storedEmail)
		}

		now := time.Now()
		token, err := signJWT(jwtSecret, claims{
			Sub:   id,
			Email: storedEmail,
			Name:  displayName,
			Role:  role,
			Iat:   now.Unix(),
			Exp:   now.Add(tokenLifetime).Unix(),
		})
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		writeJSON(w, r, http.StatusOK, loginResponse{Token: token, Email: storedEmail, Name: displayName, Role: role})
	}
}

// nameFromEmail mirrors the frontend's existing fallback (src/lib/session.ts
// nameFrom): "lan.tran@example.com" -> "Lan Tran".
func nameFromEmail(email string) string {
	local := email
	if i := strings.IndexByte(email, '@'); i >= 0 {
		local = email[:i]
	}
	parts := strings.FieldsFunc(local, func(r rune) bool { return r == '.' || r == '_' || r == '-' })
	if len(parts) == 0 {
		return email
	}
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func mustMarshal(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}

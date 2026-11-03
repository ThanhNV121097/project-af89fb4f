package main

// Minimal HS256 JWT verification (docs/architecture/services.md §2.2):
// stdlib only. This story only ever verifies — it never signs, since the
// token-issuing endpoint (POST /v1/auth/login) belongs to the auth module's
// own story. Any admin token, whichever story minted it, has the same shape
// and is checked against the same JWT_SIGNING_SECRET (project memory
// auth.data-module-jwt-verification-independent).

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

var errInvalidToken = errors.New("invalid token")

// parseJWT verifies the signature and the expiry, and returns the claims.
// Any structural problem, a bad signature, or an expired token collapses to
// the single errInvalidToken — the caller maps it to one 401, never
// distinguishing why (services.md §2.2).
func parseJWT(secret []byte, token string) (claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return claims{}, errInvalidToken
	}
	signingInput := parts[0] + "." + parts[1]
	wantSig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return claims{}, errInvalidToken
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signingInput))
	if !hmac.Equal(wantSig, mac.Sum(nil)) {
		return claims{}, errInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return claims{}, errInvalidToken
	}
	var c claims
	if err := json.Unmarshal(payload, &c); err != nil {
		return claims{}, errInvalidToken
	}
	if c.Exp <= time.Now().Unix() {
		return claims{}, errInvalidToken
	}
	return c, nil
}

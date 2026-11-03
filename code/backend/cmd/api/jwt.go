package main

// Minimal HS256 JWT: stdlib only (crypto/hmac, encoding/json, encoding/base64).
// A full JWT library buys algorithm negotiation and claim validators this
// project never needs — one signer, one verifier, one algorithm, forever.

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

var jwtHeader = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

func signJWT(secret []byte, c claims) (string, error) {
	payload, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	signingInput := jwtHeader + "." + base64.RawURLEncoding.EncodeToString(payload)
	sig := hmac.New(sha256.New, secret)
	sig.Write([]byte(signingInput))
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(sig.Sum(nil)), nil
}

// parseJWT verifies the signature and the expiry, and returns the claims.
// Any structural problem, a bad signature, or an expired token is the single
// errInvalidToken — the caller maps it to one 401, never distinguishing why.
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

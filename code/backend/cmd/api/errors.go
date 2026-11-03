package main

// The project's one error envelope (docs/architecture/services.md §2.3).

import (
	"encoding/json"
	"net/http"
)

type apiError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details []errDetail `json:"details,omitempty"`
}

type errDetail struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string, details ...errDetail) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Request-Id", requestID(r))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(struct {
		Error struct {
			apiError
			RequestID string `json:"request_id"`
		} `json:"error"`
	}{Error: struct {
		apiError
		RequestID string `json:"request_id"`
	}{apiError{Code: code, Message: message, Details: details}, requestID(r)}})
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Request-Id", requestID(r))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

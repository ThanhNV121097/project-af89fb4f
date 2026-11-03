package main

// The project's one error envelope (docs/architecture/services.md §2.3).

import (
	"encoding/json"
	"net/http"
)

type errDetail struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorBody struct {
	Code      string      `json:"code"`
	Message   string      `json:"message"`
	Details   []errDetail `json:"details,omitempty"`
	RequestID string      `json:"request_id"`
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string, details ...errDetail) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Request-Id", requestID(r))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(struct {
		Error errorBody `json:"error"`
	}{Error: errorBody{Code: code, Message: message, Details: details, RequestID: requestID(r)}})
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Request-Id", requestID(r))
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

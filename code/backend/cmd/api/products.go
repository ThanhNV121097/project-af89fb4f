package main

import "net/http"

// createProductHandler is the write AUTH-003 gates (services.md §3.4). This
// story's job is the 401 gate in front of it — the body, validation,
// storage and Telegram notification are "Add product saves and notifies
// Telegram"'s own story, not yet built.
//
// ponytail: real body unimplemented; add CMS-001/002/003 here when that
// story lands, replacing this placeholder — the auth gate above it does
// not change.
func createProductHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Product creation is not available yet.")
	}
}

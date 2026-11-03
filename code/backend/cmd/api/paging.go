package main

// Shared paging/filtering helpers for every /v1/<collection> read
// (docs/architecture/services.md §2.4): offset pagination, { items, total,
// page, limit } envelope, exact-match filter on a closed set of columns per
// collection, unknown query params ignored.

import (
	"net/http"
	"strconv"
)

type pagedResponse[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// pagingParams reads page/limit from the query string. Absent, zero,
// negative or non-integer values default (never a 400 — DATA-001's own
// failure table); limit above 100 is clamped, never rejected.
func pagingParams(r *http.Request, defaultLimit int) (page, limit int) {
	page = 1
	if v, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && v > 0 {
		page = v
	}
	limit = defaultLimit
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 {
		limit = v
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

// filterClause builds "WHERE col1 = $1 AND col2 = $2 ..." (case-insensitive
// for text, exact for numeric/date — the DB's own text comparison on the
// cast value is enough here, no collection has more than a handful of rows)
// from whichever allowed columns are present in the query string. A query
// parameter that is not in allowed is silently ignored, per §2.5.
func filterClause(r *http.Request, allowed map[string]bool) (string, []any) {
	var clauses []string
	var args []any
	for col := range allowed {
		v := r.URL.Query().Get(col)
		if v == "" {
			continue
		}
		args = append(args, v)
		clauses = append(clauses, "lower("+col+"::text) = lower($"+itoa(len(args))+")")
	}
	if len(clauses) == 0 {
		return "", args
	}
	clause := " WHERE " + clauses[0]
	for _, c := range clauses[1:] {
		clause += " AND " + c
	}
	return clause, args
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

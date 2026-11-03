package main

// GET /v1/admins, GET /v1/admins/{id} (docs/architecture/services.md
// §3.5/§3.6, DATA-002). Both wrapped by requireAdmin in main.go — a
// request with no valid token never reaches these handlers, so the 401
// case always short-circuits before any lookup (DATA-002 AC-3).

import (
	"database/sql"
	"net/http"
)

type adminRow struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

var adminFilterColumns = map[string]bool{
	"email": true, "name": true, "role": true,
}

func listAdminsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, limit := pagingParams(r, 100)
		where, args := filterClause(r, adminFilterColumns)

		var total int
		if err := db.QueryRowContext(r.Context(), "SELECT count(*) FROM admins"+where, args...).Scan(&total); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		query := "SELECT id, email, name, role FROM admins" + where +
			" ORDER BY id ASC LIMIT $" + itoa(len(args)+1) + " OFFSET $" + itoa(len(args)+2)
		rows, err := db.QueryContext(r.Context(), query, append(args, limit, (page-1)*limit)...)
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		defer rows.Close()

		items := []adminRow{}
		for rows.Next() {
			var a adminRow
			if err := rows.Scan(&a.ID, &a.Email, &a.Name, &a.Role); err != nil {
				writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
				return
			}
			items = append(items, a)
		}
		if err := rows.Err(); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		writeJSON(w, r, http.StatusOK, pagedResponse[adminRow]{Items: items, Total: total, Page: page, Limit: limit})
	}
}

func getAdminHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var a adminRow
		err := db.QueryRowContext(r.Context(),
			"SELECT id, email, name, role FROM admins WHERE id = $1", id,
		).Scan(&a.ID, &a.Email, &a.Name, &a.Role)
		if err == sql.ErrNoRows {
			writeError(w, r, http.StatusNotFound, "NOT_FOUND", "No admin with that id.")
			return
		}
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		writeJSON(w, r, http.StatusOK, a)
	}
}

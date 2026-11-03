package main

// GET /v1/products, GET /v1/products/{id} (docs/architecture/services.md
// §3.2/§3.3, DATA-001/DATA-003). Public — no auth middleware.

import (
	"database/sql"
	"net/http"
)

type productRow struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Note  string `json:"note"`
	Price string `json:"price"`
	Image string `json:"image"`
	Added string `json:"added"`
}

// productFilterColumns is the closed set of columns a query parameter may
// filter on (services.md §2.4) — anything else is an unrecognised query
// parameter and is ignored, per §2.5's query-param exception.
var productFilterColumns = map[string]bool{
	"name": true, "note": true, "price": true, "image": true, "added": true,
}

func listProductsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, limit := pagingParams(r, 12)
		where, args := filterClause(r, productFilterColumns)

		var total int
		countQuery := "SELECT count(*) FROM products" + where
		if err := db.QueryRowContext(r.Context(), countQuery, args...).Scan(&total); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		query := "SELECT id, name, note, price::text, image, added::text FROM products" + where +
			" ORDER BY seq ASC LIMIT $" + itoa(len(args)+1) + " OFFSET $" + itoa(len(args)+2)
		rows, err := db.QueryContext(r.Context(), query, append(args, limit, (page-1)*limit)...)
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		defer rows.Close()

		items := []productRow{}
		for rows.Next() {
			var p productRow
			if err := rows.Scan(&p.ID, &p.Name, &p.Note, &p.Price, &p.Image, &p.Added); err != nil {
				writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
				return
			}
			items = append(items, p)
		}
		if err := rows.Err(); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		writeJSON(w, r, http.StatusOK, pagedResponse[productRow]{Items: items, Total: total, Page: page, Limit: limit})
	}
}

func getProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var p productRow
		err := db.QueryRowContext(r.Context(),
			"SELECT id, name, note, price::text, image, added::text FROM products WHERE id = $1", id,
		).Scan(&p.ID, &p.Name, &p.Note, &p.Price, &p.Image, &p.Added)
		if err == sql.ErrNoRows {
			writeError(w, r, http.StatusNotFound, "NOT_FOUND", "No product with that id.")
			return
		}
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		writeJSON(w, r, http.StatusOK, p)
	}
}

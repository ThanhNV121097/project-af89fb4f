package main

// GET /v1/telegram, GET /v1/telegram/{id} (docs/architecture/services.md
// §3.7/§3.8, DATA-002). Both wrapped by requireAdmin in main.go.

import (
	"database/sql"
	"net/http"
)

type telegramRow struct {
	ID     string `json:"id"`
	Bot    string `json:"bot"`
	Group  string `json:"group"`
	ChatID string `json:"chat_id"`
}

var telegramFilterColumns = map[string]bool{
	"bot": true, "group": true, "chat_id": true,
}

func listTelegramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, limit := pagingParams(r, 100)
		where, args := filterClause(r, telegramFilterColumns)

		var total int
		if err := db.QueryRowContext(r.Context(), `SELECT count(*) FROM telegram`+where, args...).Scan(&total); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		query := `SELECT id, bot, "group", chat_id FROM telegram` + where +
			" ORDER BY id ASC LIMIT $" + itoa(len(args)+1) + " OFFSET $" + itoa(len(args)+2)
		rows, err := db.QueryContext(r.Context(), query, append(args, limit, (page-1)*limit)...)
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		defer rows.Close()

		items := []telegramRow{}
		for rows.Next() {
			var t telegramRow
			if err := rows.Scan(&t.ID, &t.Bot, &t.Group, &t.ChatID); err != nil {
				writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
				return
			}
			items = append(items, t)
		}
		if err := rows.Err(); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		writeJSON(w, r, http.StatusOK, pagedResponse[telegramRow]{Items: items, Total: total, Page: page, Limit: limit})
	}
}

func getTelegramHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var t telegramRow
		err := db.QueryRowContext(r.Context(),
			`SELECT id, bot, "group", chat_id FROM telegram WHERE id = $1`, id,
		).Scan(&t.ID, &t.Bot, &t.Group, &t.ChatID)
		if err == sql.ErrNoRows {
			writeError(w, r, http.StatusNotFound, "NOT_FOUND", "No telegram row with that id.")
			return
		}
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}
		writeJSON(w, r, http.StatusOK, t)
	}
}

package main

// The Telegram notification CMS-002 fires after a successful product save
// (docs/architecture/services.md §5). Synchronous, best-effort, 5s timeout,
// no retry — a failure never rolls back the row already inserted by the
// caller.

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// sendTelegramNotification reads the telegram row's chat_id, builds the
// same message wording the frontend's live preview already builds
// ("New on the shelf: <name> — <formatted price>"), and posts it. Any
// failure — empty chat_id, no bot token configured, network error, a
// non-2xx Telegram response — returns false; it is never an error to the
// caller, since the save already succeeded (CMS-002 AC-2).
func sendTelegramNotification(ctx context.Context, db *sql.DB, botToken, name string, price float64) bool {
	var chatID string
	if err := db.QueryRowContext(ctx, `SELECT chat_id FROM telegram WHERE id = 'group'`).Scan(&chatID); err != nil {
		return false
	}
	if chatID == "" || botToken == "" {
		return false
	}

	text := "New on the shelf: " + name + " — " + formatUSD(price)

	body, err := json.Marshal(map[string]string{"chat_id": chatID, "text": text})
	if err != nil {
		return false
	}

	sendCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(sendCtx, http.MethodPost,
		"https://api.telegram.org/bot"+botToken+"/sendMessage", strings.NewReader(string(body)))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// formatUSD matches the wire price format (services.md §3.2/§8): two
// decimal places, no currency symbol logic duplicated here — the message
// text is server-built Go, not shared code with the frontend's formatPrice,
// per the ERD extension's own note ("computed server-side in Go now").
func formatUSD(price float64) string {
	return "$" + strconv.FormatFloat(price, 'f', 2, 64)
}

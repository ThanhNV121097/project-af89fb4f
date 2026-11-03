// Package migrations embeds and applies the SQL files beside this one.
//
// //go:embed resolves relative to this file, not the module root, so the
// directive lives here — next to the .sql files it names — rather than in
// cmd/api/main.go, which would look for cmd/api/migrations/ and find nothing.
package migrations

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed *.up.sql
var upFiles embed.FS

// Run applies every *.up.sql file in filename order that is not already
// recorded in schema_migrations, each in its own transaction. Re-running on
// an already-migrated database is a no-op.
func Run(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		filename   text PRIMARY KEY,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	names, err := fs.Glob(upFiles, "*.up.sql")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	sort.Strings(names)

	for _, name := range names {
		var done bool
		if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, name).Scan(&done); err != nil {
			return fmt.Errorf("check %s: %w", name, err)
		}
		if done {
			continue
		}

		sqlBytes, err := upFiles.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin %s: %w", name, err)
		}
		if _, err := tx.Exec(strings.TrimSpace(string(sqlBytes))); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			tx.Rollback()
			return fmt.Errorf("record %s: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit %s: %w", name, err)
		}
	}
	return nil
}

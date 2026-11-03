// Command api is Shelf's backend entrypoint. It connects to the database,
// applies pending migrations, then serves /healthz. Product, admin and
// telegram routes land in the stories that need them.
package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/ThanhNV121097/project-af89fb4f/backend/migrations"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	jwtSecret := os.Getenv("JWT_SIGNING_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SIGNING_SECRET is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := waitForDB(db); err != nil {
		log.Fatalf("database unreachable: %v", err)
	}

	if err := migrations.Run(db); err != nil {
		log.Fatalf("run migrations: %v", err)
	}

	secret := []byte(jwtSecret)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthz(db))
	mux.HandleFunc("POST /v1/auth/login", loginHandler(db, secret))
	mux.HandleFunc("POST /v1/products", requireAuth(secret, createProductHandler()))

	port := firstNonEmpty(os.Getenv("PORT"), os.Getenv("APP_PORT"), "8080")
	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, withRequestID(mux)); err != nil {
		log.Fatalf("serve: %v", err)
	}
}

// waitForDB retries briefly: the compose healthcheck already waits for
// postgres to accept connections, but the first real query can still race it.
func waitForDB(db *sql.DB) error {
	var err error
	for i := 0; i < 10; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return err
}

// healthz answers 200 only once migrations have succeeded and the database
// still answers a trivial query — a check that ignores the database would
// report a broken app as healthy.
func healthz(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		var one int
		if err := db.QueryRowContext(ctx, "SELECT 1").Scan(&one); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

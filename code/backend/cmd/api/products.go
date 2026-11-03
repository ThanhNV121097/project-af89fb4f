package main

// POST /v1/products (docs/architecture/services.md §3.4, CMS-001/002/003).
// Auth: requireAuth wraps this handler in main.go.

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type productResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Note         string `json:"note"`
	Price        string `json:"price"`
	Image        string `json:"image"`
	Added        string `json:"added"`
	TelegramSent bool   `json:"telegram_sent"`
}

var allowedImageTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
}

const maxImageBytes = 5 << 20 // 5MB — CMS SRS failure table

// imagesDir is where an uploaded product photo is written, and where
// serveProductImageHandler (images.go) reads it back from.
//
// ponytail: defaults to a tmp path because the backend container runs
// read_only with only /tmp mounted writable (docker-compose.yml) — a photo
// does not survive a backend restart, and the deploy proxy (deploy.yml) only
// forwards /api/* in production, so a photo saved this way is not reachable
// at the literal `/images/products/<id>.<ext>` path through the site's own
// domain yet. Add a persistent volume (backend + frontend, or a route added
// to deploy.yml's Caddy labels) when production photo delivery is needed —
// named in this story's PR description for TL, since it is a deploy-topology
// decision, not a mock-swap one. Override with IMAGES_DIR once that volume
// exists.
func imagesDir() string {
	if v := os.Getenv("IMAGES_DIR"); v != "" {
		return v
	}
	return filepath.Join(os.TempDir(), "shelf-images", "products")
}

var slugNonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

// slugify matches the ERD extension's id rule: lowercased, non-alphanumeric
// runs collapsed to "-", trimmed.
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = slugNonAlnum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "product"
	}
	return s
}

func createProductHandler(db *sql.DB, botToken string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Cap the whole body: 5MB photo + headroom for the three text parts
		// and multipart boundaries.
		r.Body = http.MaxBytesReader(w, r.Body, maxImageBytes+1<<20)
		if err := r.ParseMultipartForm(maxImageBytes + 1<<20); err != nil {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Body must be valid multipart/form-data, and the photo must be 5MB or smaller.")
			return
		}
		defer r.MultipartForm.RemoveAll()

		// §2.5's undefined-field rule, applied to multipart parts.
		for field := range r.MultipartForm.Value {
			if field != "name" && field != "note" && field != "price" {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Unknown field: "+field+".")
				return
			}
		}
		for field := range r.MultipartForm.File {
			if field != "image" {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Unknown field: "+field+".")
				return
			}
		}

		name := strings.TrimSpace(r.FormValue("name"))
		note := strings.TrimSpace(r.FormValue("note"))
		priceStr := strings.TrimSpace(r.FormValue("price"))
		if name == "" || note == "" {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Name and the short description are required.")
			return
		}
		price, err := strconv.ParseFloat(priceStr, 64)
		if err != nil || price <= 0 {
			writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Price must be a number greater than 0.")
			return
		}

		var imageBytes []byte
		var imageExt string
		if files := r.MultipartForm.File["image"]; len(files) > 0 {
			f, err := files[0].Open()
			if err != nil {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "The photo could not be read.")
				return
			}
			data, err := io.ReadAll(io.LimitReader(f, maxImageBytes+1))
			f.Close()
			if err != nil {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "The photo could not be read.")
				return
			}
			if len(data) > maxImageBytes {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "The photo must be 5MB or smaller.")
				return
			}
			sniffLen := len(data)
			if sniffLen > 512 {
				sniffLen = 512
			}
			ext, ok := allowedImageTypes[http.DetectContentType(data[:sniffLen])]
			if !ok {
				writeError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "The photo must be a JPEG, PNG or WebP file.")
				return
			}
			imageBytes = data
			imageExt = ext
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		id, err := uniqueProductID(ctx, db, slugify(name))
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		imagePath := ""
		if imageBytes != nil {
			imagePath = "/images/products/" + id + "." + imageExt
			dir := imagesDir()
			if err := os.MkdirAll(dir, 0o755); err != nil {
				writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
				return
			}
			if err := os.WriteFile(filepath.Join(dir, id+"."+imageExt), imageBytes, 0o644); err != nil {
				writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
				return
			}
		}

		added := time.Now().Format("2006-01-02")
		if _, err := db.ExecContext(ctx,
			`INSERT INTO products (id, name, note, price, image, added) VALUES ($1,$2,$3,$4,$5,$6)`,
			id, name, note, price, imagePath, added,
		); err != nil {
			writeError(w, r, http.StatusInternalServerError, "INTERNAL", "Something went wrong. Try again.")
			return
		}

		sent := sendTelegramNotification(r.Context(), db, botToken, name, price)

		w.Header().Set("Location", "/v1/products/"+id)
		writeJSON(w, r, http.StatusCreated, productResponse{
			ID:           id,
			Name:         name,
			Note:         note,
			Price:        strconv.FormatFloat(price, 'f', 2, 64),
			Image:        imagePath,
			Added:        added,
			TelegramSent: sent,
		})
	}
}

// uniqueProductID assigns a slug from the name, appending a numeric suffix
// on a collision against the products PK (ERD extension: "Add product saves
// and notifies Telegram" §id generation).
func uniqueProductID(ctx context.Context, db *sql.DB, base string) (string, error) {
	id := base
	for i := 2; ; i++ {
		var exists bool
		if err := db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)", id).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return id, nil
		}
		id = fmt.Sprintf("%s-%d", base, i)
	}
}

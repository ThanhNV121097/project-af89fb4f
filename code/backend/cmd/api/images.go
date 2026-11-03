package main

// GET /v1/images/products/{file} serves a photo written by
// createProductHandler (products.go). Public, no auth — the same photo is
// shown on the public Home page.
//
// Mounted at /v1/images/products/ rather than the literal /images/products/
// path the ERD/SRS write in prose, because /images/ is also the frontend's
// own public/ directory of design-time stock photos (Dockerfile serves it
// via nginx) — this backend cannot claim that path without colliding with
// the proxy's routing, which sends /api/* here and everything else to the
// frontend. The stored `products.image` column holds the path exactly as
// the contract specifies; ProductImage's <img src> resolves it through
// Vite's dev proxy / the deploy edge the same way any other API-origin
// asset would need to, which is a frontend wiring note for whoever adds a
// rewrite — not a schema or contract change.
func serveProductImageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		file := r.PathValue("file")
		if file == "" || strings.ContainsAny(file, "/\\") {
			http.NotFound(w, r)
			return
		}
		path := filepath.Join(imagesDir(), file)
		http.ServeFile(w, r, path)
	}
}

# Main Site — Christian Farioli

Static HTML site for christianfarioli.com. No build step. Deploy to Cloudflare Pages.

## Files
- `index.html` — homepage
- `testimonials.html` — testimonials page
- `insights.html` — insights listing (legacy, kept for reference)
- `insights-article.html` — single article template
- `imgs/` — all images
- `videos/` — video assets
- `_headers` — Cloudflare Pages cache + security headers

## How to deploy

### To Cloudflare Pages
1. Push this folder to a GitHub repo (e.g. `kiki76it/christianfarioli-main`)
2. Cloudflare dashboard → Workers & Pages → Create application → Pages → Connect to Git
3. Select the repo
4. Build settings:
   - Framework preset: **None**
   - Build command: (leave empty)
   - Build output directory: `.`
5. Add custom domain: `christianfarioli.com`
6. Save → Deploy

### To update
- Edit the HTML files directly
- `git add . && git commit -m '...' && git push`
- Cloudflare auto-deploys on push (within 30 sec)

### To preview locally
Just open `index.html` in a browser. No server needed.

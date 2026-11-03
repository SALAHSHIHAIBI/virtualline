# Virtualine website

The site for **virtualine.co.uk**: digital twins, VR stand experiences, operator training and promo films.
The older spelling **virtualline.co.uk** still works: web visits redirect to virtualine.co.uk and its email addresses keep forwarding.

## How it's hosted

- **Website:** `public/` is published to **GitHub Pages** by `.github/workflows/pages.yml`
  on every push to `main`. The custom domain is `virtualine.co.uk` (`public/CNAME` and
  repo Settings → Pages).
- **Old domain:** `virtualline.co.uk` and `www.virtualline.co.uk` are proxied by Cloudflare and a
  Redirect Rule sends every request to `https://virtualine.co.uk` (path and query kept).
- **Contact form:** the form posts to **https://api.virtualine.co.uk/contact**, a Cloudflare
  Worker (`src/worker.js`, Worker name `virtualline-contact`, also on `api.virtualline.co.uk`).
  It emails each enquiry to `virtualline35@gmail.com` through Cloudflare Email Routing (the
  `send_email` binding), sent from `website@virtualine.co.uk`. The subject starts with
  `[Sales]` or `[Tech]`, and pressing **Reply** in Gmail answers the visitor directly.
- **DNS (Cloudflare, virtualine.co.uk):** the apex has A records for GitHub Pages
  (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153), `www` is a CNAME to
  `salahshihaibi.github.io` (both DNS only), and `api` is the Worker's custom domain.

## Editing the site

Change the files in `public/` and commit to `main`. GitHub Pages redeploys in about a minute.

## Updating the contact Worker

Paste `src/worker.js` into the Worker editor in the Cloudflare dashboard and deploy, or run
`npx wrangler deploy` with a Cloudflare login.

## Email addresses

On both domains, `sales@`, `tech@` and any other address (catch-all) forward to
`virtualline35@gmail.com` (Cloudflare dashboard → Email Routing → Routing rules).
Each domain has MX, SPF, DKIM and DMARC (`p=none`, reports in DMARC Management) records.

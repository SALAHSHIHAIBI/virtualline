# Virtualine website

The site for **virtualline.co.uk**: digital twins, VR stand experiences, operator training and promo films.

## How it's hosted

- **Website:** `public/` is published to **GitHub Pages** by `.github/workflows/pages.yml`
  on every push to `main`. The custom domain is `virtualline.co.uk`.
- **Contact form:** the form posts to **https://api.virtualline.co.uk/contact**, a Cloudflare
  Worker (`src/worker.js`, Worker name `virtualline-contact`). It emails each enquiry to
  `virtualline35@gmail.com` through Cloudflare Email Routing (the `send_email` binding).
  The subject starts with `[Sales]` or `[Tech]`, and pressing **Reply** in Gmail answers the
  visitor directly.
- **DNS (Cloudflare):** the apex has A records for GitHub Pages
  (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153), `www` is a CNAME to
  `salahshihaibi.github.io`, and `api` is the Worker's custom domain.

## Editing the site

Change the files in `public/` and commit to `main`. GitHub Pages redeploys in about a minute.

## Updating the contact Worker

Paste `src/worker.js` into the Worker editor in the Cloudflare dashboard and deploy, or run
`npx wrangler deploy` with a Cloudflare login.

## Email addresses

`sales@virtualline.co.uk` and `tech@virtualline.co.uk` forward to `virtualline35@gmail.com`
(Cloudflare dashboard → Email Routing → Routing rules).

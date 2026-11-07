# Ahylon website

> Repo: **ahylon-uk/website**. The site for **ahylon.co.uk** (formerly Virtualine): digital twins, VR stand experiences, operator training and cinematic machine films.
> Brand: logo pack and guidelines v1.1 (Graphite #0E0F12, Volt #C6FF3D, Unbounded + IBM Plex Mono).

The old domains still work and send people to the new one: **virtualine.co.uk** and **virtualline.co.uk** (and their `www`) redirect to `https://ahylon.co.uk`, keeping the path and query.

## How it's hosted

- **Website:** `public/` is published to **GitHub Pages** by `.github/workflows/pages.yml`
  on every push to `main`. The custom domain is `ahylon.co.uk` (`public/CNAME` and
  repo Settings → Pages, HTTPS enforced).
- **Old domains:** `virtualine.co.uk` and `virtualline.co.uk` (plus `www`) are proxied by Cloudflare,
  and a Redirect Rule in each zone sends every request to `https://ahylon.co.uk` (301, path and query kept).
- **Contact form:** the form posts to **https://api.ahylon.co.uk/contact**, a Cloudflare
  Worker (`src/worker.js`, Worker name `virtualline-contact`, also on `api.virtualine.co.uk` and
  `api.virtualline.co.uk`). It emails each enquiry to `virtualline35@gmail.com` through Cloudflare
  Email Routing (the `send_email` binding), sent from `website@ahylon.co.uk`. The subject starts with
  `[Sales]` or `[Tech]`, and pressing **Reply** in Gmail answers the visitor directly.
- **DNS (Cloudflare, ahylon.co.uk):** the apex has A records for GitHub Pages
  (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153), `www` is a CNAME to
  `ahylon-uk.github.io` (both DNS only), and `api` is the Worker's custom domain.

## Editing the site

Change the files in `public/` and commit to `main`. GitHub Pages redeploys in about a minute.
Brand overrides (colours, fonts, logo sizes) are in the "Ahylon brand" block at the end of `public/styles.css`.

## Updating the contact Worker

Run `npx wrangler deploy` with a Cloudflare login (account: Salahshihaibi@gmail.com's Account),
or paste `src/worker.js` into the Worker editor in the Cloudflare dashboard and deploy.

## Email addresses

On ahylon.co.uk, `info@` and any other address (catch-all) forward to `virtualline35@gmail.com`.
The old domains' `sales@`, `tech@` and catch-all addresses keep forwarding there too
(Cloudflare dashboard → Email Routing → Routing rules).

## Still to do

- Photos: the HoneyLine stills carry an interim Ahylon corner mark over the old one; machine signs in the
  renders still say Virtualine. Replace all stills and reels with frames from the new Ahylon renders.

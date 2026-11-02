# Virtualine website

The site for **virtualline.co.uk**: digital twins, VR stand experiences, operator training and promo films.

It runs as a Cloudflare Worker:

- `public/` holds the website (HTML, CSS, JS and images), served as static assets.
- `src/worker.js` handles the contact form at `POST /api/contact` and emails each enquiry to
  `virtualline35@gmail.com` using Cloudflare Email Routing (the `send_email` binding).
  The subject starts with `[Sales]` or `[Tech]` depending on what the visitor picked, and
  pressing **Reply** in Gmail answers the visitor directly.
- `wrangler.jsonc` holds the Worker settings, the email binding and the custom domains
  (`virtualline.co.uk` and `www.virtualline.co.uk`, which redirects to the main domain).

## Editing the site

Change the files in `public/` and commit to `main`. Cloudflare rebuilds and deploys automatically.

## Running locally

```bash
npm install
npx wrangler dev
```

Open http://localhost:8787. In local mode, contact form emails are saved as `.eml` files instead of being sent.

## Email addresses

`sales@virtualline.co.uk` and `tech@virtualline.co.uk` forward to `virtualline35@gmail.com`
(Cloudflare dashboard → Email Routing → Routing rules).

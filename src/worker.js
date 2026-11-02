// Virtualine website Worker
// - Serves the static site from /public
// - POST /api/contact sends the form to the inbox via Cloudflare Email Routing (send_email binding)

import { EmailMessage } from "cloudflare:email";

const FROM = "website@virtualline.co.uk";
const FROM_NAME = "Virtualine Website";
const TOPICS = {
  sales: { label: "Sales", alias: "sales@virtualline.co.uk" },
  tech: { label: "Tech", alias: "tech@virtualline.co.uk" },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // www → apex
    if (url.hostname === "www.virtualline.co.uk") {
      url.hostname = "virtualline.co.uk";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let data;
  try {
    const type = request.headers.get("content-type") || "";
    if (type.includes("application/json")) data = await request.json();
    else data = Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const clean = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
  const oneLine = (v, max) => clean(v, max).replace(/\n/g, " ");

  // Spam traps: hidden field must be empty, form must not be submitted instantly
  if (clean(data.website, 200)) return json({ ok: true });
  const t = Number(data.t);
  if (t && Date.now() - t < 2500) return json({ ok: true });

  const name = oneLine(data.name, 100);
  const company = oneLine(data.company, 120);
  const email = oneLine(data.email, 160);
  const phone = oneLine(data.phone, 40);
  const message = clean(data.message, 5000);
  const topic = TOPICS[data.topic] ? data.topic : "sales";

  if (!name || !message) return json({ ok: false, error: "Please add your name and a message." }, 400);
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);

  const t2 = TOPICS[topic];
  const subject = `[${t2.label}] Website enquiry from ${name}${company ? " (" + company + ")" : ""}`;
  const body = [
    `New ${t2.label.toLowerCase()} enquiry from virtualline.co.uk`,
    `(sent to ${t2.alias})`,
    "",
    `Name:    ${name}`,
    `Company: ${company || "-"}`,
    `Email:   ${email}`,
    `Phone:   ${phone || "-"}`,
    "",
    "Message:",
    message,
    "",
    "---",
    "Just hit Reply to answer this person directly.",
  ].join("\n");

  const raw = buildMime({
    from: `${FROM_NAME} <${FROM}>`,
    to: env.CONTACT_TO || "virtualline35@gmail.com",
    replyTo: `${quoteName(name)} <${email}>`,
    subject,
    body,
  });

  try {
    const msg = new EmailMessage(FROM, env.CONTACT_TO || "virtualline35@gmail.com", raw);
    await env.CONTACT_EMAIL.send(msg);
  } catch (err) {
    console.error("send failed", err && err.message);
    return json({ ok: false, error: "Sorry, we couldn't send your message right now." }, 502);
  }
  return json({ ok: true });
}

function buildMime({ from, to, replyTo, subject, body }) {
  const id = `${crypto.randomUUID()}@virtualline.co.uk`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${id}>`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(body).replace(/.{1,76}/g, "$&\r\n"),
  ].join("\r\n");
}

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function encodeHeader(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
}
function quoteName(n) {
  return /^[\x20-\x7e]*$/.test(n) ? `"${n.replace(/["\\]/g, "")}"` : encodeHeader(n);
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

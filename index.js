import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import nodemailer from "nodemailer";
import crypto from "node:crypto";

// Load .env for local/dev; Render injects env in production
if (process.env.NODE_ENV !== "production") {
  import("dotenv/config");
}

const URL = "https://nationalzoo.si.edu/support/volunteer/washington-dc";
const PATTERN = /\bzoo[\s-]*ai?de\b/i;
const STATE_DIR = ".state";
const STATE_FILE = path.join(STATE_DIR, "zoo_aid.sig");

async function fetchPage(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ZooAidMonitor/1.0)" },
    timeout: 30000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

function extractText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  return $("body").text().replace(/\s+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function findHits(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => PATTERN.test(l));
}

async function sendEmail(subject, body) {
  const {
    SMTP_HOST,
    SMTP_PORT = "587",
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    EMAIL_TO,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_TO) {
    console.error("Missing SMTP env vars.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to: EMAIL_TO,
    subject,
    text: body,
  });
}

async function main() {
  const html = await fetchPage(URL);
  const text = extractText(html);
  const hits = findHits(text);
  const hasHits = hits.length > 0;
  const onlyOnChange = (process.env.ONLY_EMAIL_ON_CHANGE || "false").toLowerCase() === "true";

  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  let lastSig = null;
  if (fs.existsSync(STATE_FILE)) lastSig = fs.readFileSync(STATE_FILE, "utf-8").trim();

  const sig = hasHits
    ? crypto.createHash("sha256").update(hits.join("\n")).digest("hex")
    : "no-hits";
  fs.writeFileSync(STATE_FILE, sig, "utf-8");

  if (!hasHits) {
    console.log("No matches found.");
    return;
  }

  if (onlyOnChange && lastSig && lastSig === sig) {
    console.log("Hits present but unchanged; skipping email due to ONLY_EMAIL_ON_CHANGE.");
    return;
  }

  const when = new Date().toLocaleString();
  const body = `Zoo Aid/Aide mention(s) found.

Time: ${when}
URL: ${URL}

Lines:
${hits.slice(0, 20).map((l) => "• " + l).join("\n")}
`;

  await sendEmail("Zoo Aid/Aide alert: National Zoo volunteer page", body);
  console.log("Email sent.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exitCode = 1;
});

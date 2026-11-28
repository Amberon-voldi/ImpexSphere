// Amplify build step: copies server settings into .env.production so the
// running Next.js server can read them (Amplify doesn't pass console
// environment variables to the server runtime otherwise).
// Values are single-quoted and `$` is escaped so passwords containing # or $
// survive Next.js's .env parsing intact.
const fs = require("fs");
const keys = ["RDS_DATABASE_URL", "DATABASE_URL", "RESEND_API_KEY", "ENQUIRY_TO_EMAIL", "ENQUIRY_FROM_EMAIL", "ADMIN_EMAILS", "SITE_URL"];
const written = [];
let out = "";
for (const k of keys) {
  const v = process.env[k];
  if (!v) continue;
  if (v.includes("'")) {
    console.warn(`write-env: ${k} contains a single quote and was NOT written; remove the quote from the value.`);
    continue;
  }
  out += `${k}='${v.replace(/\$/g, "\\$")}'\n`;
  written.push(k);
}
fs.appendFileSync(".env.production", out);
console.log(`write-env: .env.production has ${written.join(", ") || "no settings"} (values not shown)`);
if (!process.env.RDS_DATABASE_URL && !process.env.DATABASE_URL) {
  console.warn("write-env: WARNING no RDS_DATABASE_URL or DATABASE_URL in this build environment; the site will not reach the database.");
}

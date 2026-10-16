// Sends ONE test email (contact template) to OWNER_EMAIL through Resend. node --env-file=.env.local tools/send-test-email.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
const { RESEND_API_KEY, EMAIL_FROM, OWNER_EMAIL } = process.env;
for (const [k, v] of Object.entries({ RESEND_API_KEY, EMAIL_FROM, OWNER_EMAIL })) if (!v) { console.error(`${k} missing`); process.exit(1); }
const T = await import(pathToFileURL(fileURLToPath(new URL('../src/lib/email-templates.ts', import.meta.url))).href);
const mail = T.contactEmail({ name: 'Prueba de Firuza', email: OWNER_EMAIL, message: 'Este es un email de prueba de la tienda Firuza. Si lo lees, Resend funciona.' });
const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: EMAIL_FROM, to: OWNER_EMAIL, subject: 'Prueba · ' + mail.subject, html: mail.html }) });
console.log('from:', EMAIL_FROM, '| to:', OWNER_EMAIL, '| status:', res.status, await res.text());

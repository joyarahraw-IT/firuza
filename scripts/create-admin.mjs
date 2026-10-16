// Creates (or resets) the owner's ADMIN login. This is a separate account from any shop customer.
//   npm run admin:create -- contacto+admin@example.com
// The password is typed in this terminal (hidden), never passed on the command line, never printed, never stored in a file.
// The first time you log in at /admin/login you will be asked to set up 2FA (an authenticator app).
import { createClient } from '@supabase/supabase-js';
import readline from 'node:readline';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
const email = (process.argv[2] ?? '').trim().toLowerCase();

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput;
    rl._writeToOutput = (s) => { if (s.includes(question)) write.call(rl, s); }; // hide what is typed
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}

async function main() {
  if (!url || !secret) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Usage: npm run admin:create -- <admin-email>');
  const p1 = await ask('Password (min. 12 characters, hidden): ');
  const p2 = await ask('Repeat password: ');
  if (p1 !== p2) throw new Error('The two passwords do not match.');
  if (p1.length < 12 || !/[a-z]/.test(p1) || !/[A-Z]/.test(p1) || !/\d/.test(p1)) throw new Error('Use at least 12 characters with lowercase, uppercase and a digit.');

  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  let userId;
  const created = await db.auth.admin.createUser({ email, password: p1, email_confirm: true });
  if (created.error) {
    if (!/already|registered|exists/i.test(created.error.message)) throw new Error(created.error.message);
    const list = await db.auth.admin.listUsers({ perPage: 1000 });
    const u = list.data?.users.find((x) => x.email?.toLowerCase() === email);
    if (!u) throw new Error('The user exists but could not be found.');
    const upd = await db.auth.admin.updateUserById(u.id, { password: p1 });
    if (upd.error) throw new Error(upd.error.message);
    userId = u.id;
    console.log('Existing user: password updated.');
  } else {
    userId = created.data.user.id;
  }
  await db.from('customers').delete().eq('id', userId); // the signup trigger made a shop profile: an admin login is not a customer
  const { error } = await db.from('admin_users').upsert({ user_id: userId, role: 'owner', mfa_required: true }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  console.log(`Admin ready: ${email}. Log in at /admin/login and set up 2FA on the first login.`);
}

main().catch((e) => {
  console.error('\nFailed: ' + (e?.message ?? e));
  process.exitCode = 1;
});

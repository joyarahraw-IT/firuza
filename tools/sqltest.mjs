// Runs the real migrations in an in-memory Postgres (PGlite) that behaves like a NEW Supabase project:
//   - roles anon / authenticated / service_role exist, but NO automatic table privileges (that is the real-world default now)
//   - service_role has BYPASSRLS, like on Supabase
// Checks: migrations are re-runnable, missing grants are detected, RLS + grants do what they should, create_order() works.
// Exit code is 1 if any check fails.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

const db = new PGlite();
let failed = 0;
const check = (label, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);
};
const denied = (v) => typeof v === 'string' && v.startsWith('DENIED');
const permDenied = (v) => denied(v) && v.includes('permission denied');
const rlsDenied = (v) => denied(v) && v.includes('row-level security');

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal', coalesce(current_setting('request.jwt.claim.aal', true), 'aal1')) $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
-- what Supabase does give the API roles out of the box: access to the auth helper functions and the public schema
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
`);

const run = (f) => db.exec(fs.readFileSync(new URL(`../supabase/migrations/${f}.sql`, import.meta.url), 'utf8'));
const as = async (role, sub, aal, sql, params) => {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${sub || ''}',false), set_config('request.jwt.claim.aal','${aal || ''}',false);`);
  try {
    return (await db.query(sql, params)).rows;
  } catch (e) {
    return 'DENIED: ' + e.message;
  } finally {
    await db.exec('reset role');
  }
};

// ---- 1. migrations 0001-0004 only: like the first (failed) run -> every API role must get "permission denied"
for (const f of ['0001_schema', '0002_functions', '0003_rls', '0004_seed_static']) await run(f);
console.log('\n[1] before 0005_grants (must fail like the real project did)');
check('service_role cannot read categories without grants', permDenied(await as('service_role', '', '', 'select * from categories')));
check('anon cannot read categories without grants', permDenied(await as('anon', '', '', 'select * from categories')));

// ---- 2. grants, and re-running everything must be harmless
await run('0005_grants');
await run('0006_shipping');
await run('0007_admin');
await run('0008_reviews');
for (const f of ['0001_schema', '0002_functions', '0003_rls', '0004_seed_static', '0005_grants', '0006_shipping', '0007_admin', '0008_reviews']) await run(f);
console.log('\n[2] all migrations re-run a second time without errors: PASS');

// ---- 3. fixtures (as the table owner / superuser)
const users = (await db.query("insert into auth.users(email) values ('cust@x.es'),('admin@x.es'),('other@x.es') returning id")).rows.map((r) => r.id);
const [cust, adm, other] = users;
await db.exec(`insert into admin_users(user_id) values ('${adm}')`);
const cat = (await db.query("select id from categories where slug='collares'")).rows[0].id;
const p1 = (await db.query("insert into products(slug,category_id,name,status,making_days_min,making_days_max,base_price_cents) values ('a',$1,'Pub','published',3,5,5290) returning id", [cat])).rows[0].id;
await db.query("insert into products(slug,category_id,name,status,making_days_min,making_days_max,base_price_cents) values ('b',$1,'Draft','draft',3,5,1000)", [cat]);
const v1 = (await db.query('insert into product_variants(product_id,options,price_cents) values ($1,$2,5290) returning id', [p1, '{"Material":"S"}'])).rows[0].id;
const rug = (await db.query("insert into products(slug,name,status,delivery_mode,shipping_days_min,shipping_days_max,base_price_cents) values ('r','Rug','published','shipped',15,30,98000) returning id")).rows[0].id;
const v2 = (await db.query("insert into product_variants(product_id,options,price_cents) values ($1,'{}',98000) returning id", [rug])).rows[0].id;

console.log('\n[3] service role (the seed script)');
check('service_role reads categories', (await as('service_role', '', '', 'select * from categories')).length === 5);
check('service_role inserts a product', Array.isArray(await as('service_role', '', '', "insert into products(slug,name,base_price_cents,making_days_min,making_days_max) values ('s','S',1,1,1) returning 1")));
check('service_role reads login_attempts', Array.isArray(await as('service_role', '', '', 'select * from login_attempts')));

console.log('\n[4] visitors (anon)');
check('sees published products only', JSON.stringify((await as('anon', '', '', 'select slug from products order by slug')).map((r) => r.slug)) === '["a","r"]');
check('cannot see the draft', (await as('anon', '', '', "select count(*)::int n from products where slug='b'"))[0].n === 0);
check('sees only public settings', (await as('anon', '', '', 'select count(*)::int n from settings'))[0].n < (await db.query('select count(*)::int n from settings')).rows[0].n);
check('cannot insert a product (RLS)', rlsDenied(await as('anon', '', '', "insert into products(slug,name,base_price_cents,making_days_min,making_days_max) values ('x','x',1,1,1)")) || permDenied(await as('anon', '', '', "insert into products(slug,name,base_price_cents,making_days_min,making_days_max) values ('x','x',1,1,1)")));
check('login_attempts: no access', permDenied(await as('anon', '', '', 'select * from login_attempts')));
check('customers table: no access', permDenied(await as('anon', '', '', 'select * from customers')));
check('orders table: no direct access', permDenied(await as('anon', '', '', 'select * from orders')));
check('cannot call is_admin-protected writes (settings)', denied(await as('anon', '', '', "update settings set value='1' where key='brand'")));
check('contact form insert allowed', Array.isArray(await as('anon', '', '', "insert into contact_messages(name,email,message) values ('A','a@b.es','hola hola') returning 1")));
check('cannot read contact messages', (await as('anon', '', '', 'select * from contact_messages')).length === 0 || permDenied(await as('anon', '', '', 'select * from contact_messages')));

const addr = JSON.stringify({ line1: 'Calle Mayor 1', postal_code: '28013', city: 'Madrid', country: 'ES' });
const contact = JSON.stringify({ name: 'Ana Pérez', email: 'ana@x.es', phone: '600111222' });
const items = JSON.stringify([{ variant_id: v1, qty: 2 }, { variant_id: v2, qty: 1 }]);
const q = 'select create_order($1::jsonb,$2::jsonb,$3::jsonb,$4,$5) o';
const guest = await as('anon', '', '', q, [items, contact, addr, 'nota', true]);
check('guest create_order works', Array.isArray(guest) && /^FZ-\d{6}-[A-Z2-9]{4}$/.test(guest[0].o.number), Array.isArray(guest) ? guest[0].o.number : String(guest));
check('terms must be accepted', denied(await as('anon', '', '', q, [items, contact, addr, null, false])));
const rows = (await db.query('select name, unit_price_cents, quantity, line_total_cents from order_items order by name')).rows;
check('prices come from the database', rows.length === 2 && rows[0].unit_price_cents === 5290 && rows[1].unit_price_cents === 98000 && rows[0].line_total_cents === 10580);

console.log('\n[5] customers (authenticated)');
check('customer create_order works', Array.isArray(await as('authenticated', cust, 'aal1', q, [JSON.stringify([{ variant_id: v1, qty: 1 }]), contact, addr, null, true])));
check('sees only own orders', (await as('authenticated', cust, 'aal1', 'select number from orders')).length === 1 && (await as('authenticated', other, 'aal1', 'select number from orders')).length === 0);
check('cannot change an order status', (await as('authenticated', cust, 'aal1', "update orders set status='pagado' returning 1")).length === 0);
check('cannot read admin_users', (await as('authenticated', cust, 'aal1', 'select * from admin_users')).length === 0);
check('cannot insert products', denied(await as('authenticated', cust, 'aal1', "insert into products(slug,name,base_price_cents,making_days_min,making_days_max) values ('y','y',1,1,1)")));
check('cannot read order_notes', (await as('authenticated', cust, 'aal1', 'select * from order_notes')).length === 0);
check('can edit own name', (await as('authenticated', cust, 'aal1', "update customers set full_name='Ana' where id=$1 returning 1", [cust])).length === 1);
check('cannot edit own email column', permDenied(await as('authenticated', cust, 'aal1', "update customers set email='evil@x.es' where id=$1", [cust])));
check('cannot touch login_attempts', permDenied(await as('authenticated', cust, 'aal1', 'select * from login_attempts')));

console.log('\n[6] admin (separate login, TOTP required)');
check('admin without TOTP sees no orders', (await as('authenticated', adm, 'aal1', 'select number from orders')).length === 0);
check('admin with TOTP sees all orders', (await as('authenticated', adm, 'aal2', 'select number from orders')).length === 2);
check('admin with TOTP updates status', (await as('authenticated', adm, 'aal2', "update orders set status='confirmado' where id=(select id from orders order by placed_at limit 1) returning status"))[0]?.status === 'confirmado');
check('status change is logged in the timeline', (await db.query("select count(*)::int n from order_status_history where status='confirmado'")).rows[0].n === 1);
check('admin without TOTP cannot write settings', (await as('authenticated', adm, 'aal1', "update settings set value='\"x\"' where key='brand' returning 1")).length === 0);
check('admin can append audit_log', Array.isArray(await as('authenticated', adm, 'aal2', "insert into audit_log(admin_id, action) values ($1,'test') returning 1", [adm])));
check('admin cannot rewrite audit_log', permDenied(await as('authenticated', adm, 'aal2', "update audit_log set action='x'")));
check('admin cannot read login_attempts', permDenied(await as('authenticated', adm, 'aal2', 'select * from login_attempts')));

console.log('\n[7] reviews');
const own = (await db.query('select id from orders where customer_id=$1', [cust])).rows[0].id;
const rev = `insert into reviews(product_id,order_id,customer_id,rating,body) values ('${p1}','${own}','${cust}',5,'Muy bonito') returning status`;
check('no review before delivery', rlsDenied(await as('authenticated', cust, 'aal1', rev)));
await db.exec(`update orders set status='entregado' where id='${own}'`);
check('review allowed after delivery (pending)', (await as('authenticated', cust, 'aal1', rev))[0]?.status === 'pending');
check('visitors do not see pending reviews', (await as('anon', '', '', 'select * from reviews')).length === 0);

console.log('\n[8] shipping (computed on the server from settings)');
const ord = async (variants, postal, country = 'ES') =>
  (await as('anon', '', '', q, [JSON.stringify(variants.map((v) => ({ variant_id: v, qty: 1 }))), contact, JSON.stringify({ line1: 'Calle Mayor 1', postal_code: postal, city: 'Madrid', country }), null, true]))[0]?.o;
let o1 = await ord([v1], '28013');
check('Madrid (28xxx), regular item: free shipping', o1.shipping_cents === 0 && o1.shipping_zone === 'madrid' && !o1.shipping_to_confirm && o1.total_cents === 5290);
o1 = await ord([v1], '08001');
check('Rest of mainland Spain: 4,90 €', o1.shipping_cents === 490 && o1.shipping_zone === 'spain' && o1.total_cents === 5780);
o1 = await ord([v1], '75001', 'FR');
check('Rest of the EU: 9,90 €', o1.shipping_cents === 990 && o1.shipping_zone === 'eu');
for (const pc of ['07001', '35001', '38001', '51001', '52001']) {
  o1 = await ord([v1], pc);
  check(`Islands / Ceuta / Melilla (${pc}): to be consulted, nothing charged`, o1.shipping_zone === 'consult' && o1.shipping_cents === 0 && o1.shipping_to_confirm === true);
}
o1 = await ord([v2], '28013');
check('Rug only, even in Madrid: not free, to be confirmed', o1.shipping_cents === 0 && o1.shipping_to_confirm === true && o1.total_cents === 98000);
o1 = await ord([v1, v2], '08001');
check('Rug + regular item in Spain: 4,90 € for the regular part + rug to confirm', o1.shipping_cents === 490 && o1.shipping_to_confirm === true);
check('Non-EU country is rejected', denied(await as('anon', '', '', q, [items, contact, JSON.stringify({ line1: 'Calle Mayor 1', postal_code: '10001', city: 'Madrid', country: 'US' }), null, true])));
await db.exec(`update settings set value = '{"madrid_cents":300,"spain_cents":490,"eu_cents":990}' where key = 'shipping_rates'`);
o1 = await ord([v1], '28013');
check('Rates are read from the settings table (editable in admin)', o1.shipping_cents === 300);
check('Anonymous visitors can read the public rates', (await as('anon', '', '', "select value from settings where key='shipping_rates'")).length === 1);

console.log('\n[9] admin_set_order_status');
const oid = (await db.query('select id from orders order by placed_at limit 1')).rows[0].id;
check('customer cannot call it', denied(await as('authenticated', cust, 'aal2', "select admin_set_order_status($1,'pagado','x')", [oid])));
check('admin without TOTP cannot call it', denied(await as('authenticated', adm, 'aal1', "select admin_set_order_status($1,'pagado','x')", [oid])));
check('anon cannot call it', denied(await as('anon', '', '', "select admin_set_order_status($1,'pagado','x')", [oid])));
check('admin with TOTP changes status and note', Array.isArray(await as('authenticated', adm, 'aal2', "select admin_set_order_status($1,'enviado','Enviado con SEUR')", [oid])));
const hist = (await db.query('select status, note from order_status_history where order_id=$1 order by created_at desc, id limit 1', [oid])).rows[0];
check('timeline entry carries the note', hist.status === 'enviado' && hist.note === 'Enviado con SEUR');

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nAll checks passed.');
await db.close();
process.exitCode = failed ? 1 : 0;

# Firuza: tienda artesanal

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage). Spanish first, i18n-ready.
Sin pago online por ahora: el cliente envía el pedido, se confirma por WhatsApp/email y se acuerda el pago.

## Requisitos (Windows)

- Node.js 20.9 o superior (ya tienes la 24) y npm.
- Una cuenta gratuita de Supabase con un proyecto de desarrollo (ya creado).

## Primera vez

1. Instalar dependencias: `npm install`
2. Abrir `.env.local` y rellenar **tú mismo** `SUPABASE_SECRET_KEY=` (Supabase → Project Settings → API Keys → *Secret key*).
   Nunca la pegues en un chat ni en código del navegador. `.env.local` está en `.gitignore`.
3. Crear las tablas, reglas de seguridad y permisos: Supabase → **SQL Editor** → New query → pegar `supabase/setup.sql` (es la suma de `supabase/migrations/0001…0005` y se puede ejecutar varias veces sin error) → **Run**. Si ya ejecutaste una versión anterior y solo te falta el error `permission denied`, pega solo `supabase/fix-grants.sql`.
4. Cargar los 37 productos (todos en borrador) y sus fotos: `npm run db:seed`
   (no sobrescribe lo que edites en el admin; `npm run db:seed -- --force` lo recrea todo).
5. Mientras todos los productos estén en borrador, `.env.local` lleva `PREVIEW_DRAFTS=1` (solo en local) para que veas el catálogo completo. Cuando publiques desde el admin, quita esa línea para ver lo que ve un visitante.
6. Arrancar: `npm run dev` → http://localhost:3000

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en modo producción |
| `npm run typecheck` | Comprobar TypeScript |
| `npm run db:seed` | Cargar productos y fotos en Supabase |
| `npm run db:test` | Ejecuta las migraciones en una base de datos temporal en memoria y prueba las reglas de seguridad (RLS) y `create_order()` |

## Estructura

- `src/`: la web (componentes, páginas, `lib/`).
- `supabase/migrations/`: SQL (esquema, funciones, RLS, datos estáticos). `supabase/setup.sql` = todo junto.
- `data/seed/products.seed.json`: productos, opciones y precios (generado por `tools/build-seed.mjs`).
- `public/products/`: fotos procesadas (WebP + JPG + miniatura). `assets/originals/`: originales.
- `tools/`: scripts de procesado de fotos y tests de SQL. `_archivo/`: borradores antiguos (no se usa).
- `PRODUCT_LIST.md` y `PRODUCTS_TO_CONFIRM.md`: lista de productos y cosas por confirmar.

## Seguridad en pocas líneas

- Clave **publishable** en el navegador; clave **secret** solo en el servidor (`src/lib/supabase/server.ts`, `serviceClient`).
- RLS activo en todas las tablas. Los visitantes solo ven productos publicados; los clientes, solo lo suyo; solo los administradores escriben.
- Los pedidos solo se crean con la función `create_order()`: los precios salen de la base de datos, nunca del navegador.
- Tienda y admin usan **cookies de sesión distintas** (`hv-shop`, `hv-admin`) y el admin exige TOTP (2FA) para que RLS lo reconozca.

## Pendiente (ver PRODUCTS_TO_CONFIRM.md)

IVA y pago online (Stripe/Bizum) aplazados; textos legales a revisar por un gestor; email (Resend) al publicar.

## Cuentas de cliente: configuración en Supabase (una vez)

1. **Authentication → URL Configuration**: *Site URL* `http://localhost:3000` y en *Redirect URLs* añade `http://localhost:3000/**`
   (al publicar, añade también tu dominio). Sin esto, los enlaces de los emails (confirmar cuenta, enlace mágico, recuperar contraseña) no funcionan.
2. **Authentication → Providers → Email**: en desarrollo puedes desactivar *Confirm email* para probar el registro con contraseña al instante.
   Los emails de Supabase por defecto tienen un límite muy bajo y solo llegan a miembros del equipo del proyecto: para clientes reales configura
   un SMTP propio (por ejemplo Resend) en *Authentication → SMTP Settings*.
3. Los pedidos como invitado se asocian a la cuenta cuando el email está verificado (misma dirección).

## Panel de administración (`/admin`)

Sesión **independiente** de la tienda (cookie `hv-admin`; la tienda usa `hv-shop`): entrar o salir de uno no afecta al otro.

1. Ejecuta en el SQL Editor `supabase/migrations/0006_shipping.sql` y `0007_admin.sql` si aún no lo hiciste (o `supabase/setup.sql` completo).
2. Supabase → Authentication → **Multi-Factor** (MFA): comprueba que TOTP está activado (por defecto lo está).
3. Crea el acceso de la propietaria (distinto de cualquier cuenta de cliente; con Gmail puedes usar `tunombre+admin@gmail.com`):
   ```bash
   npm run admin:create -- tucorreo+admin@gmail.com
   ```
   La contraseña se escribe en la terminal (oculta), mínimo 12 caracteres con mayúscula, minúscula y número. No se guarda en ningún archivo.
4. Entra en http://localhost:3000/admin/login. La primera vez te pedirá activar el **2FA** con una app de autenticación; después, cada login pide el código.
5. Seguridad: solo cuentas en `admin_users` con sesión verificada por TOTP (AAL2) pasan; la base de datos lo exige además en cada política RLS. Los intentos de login se limitan (8 fallos / 15 min) y las acciones quedan en `audit_log`.

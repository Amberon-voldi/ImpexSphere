# ImpexSphere

The B2B import–export platform of **SP International Private Limited** ([spinternationalpvtltd.com](https://spinternationalpvtltd.com)): order-backed export of Indian spices and agricultural commodities, export enablement for Indian suppliers, and a verified commodity marketplace.

## Website

A dark, animated B2B marketplace built with Next.js (App Router), TypeScript and [Motion](https://motion.dev). No UI framework; all styling lives in `src/app/globals.css`. The hero globe uses [cobe](https://github.com/shuding/cobe).

| Route | Purpose |
| --- | --- |
| `/` | Hero with 3D globe and live offers, price ticker, stats, categories, trending offers, open buying requests, how trade works |
| `/marketplace` | All live listings with instant search, filters (category, price, origin, supplier status, lab report), sorting, grid/list view; filters sync to the URL |
| `/marketplace/[slug]` | Listing: price-history chart, specs, certifications, supplier card, quantity → value calculator, **quote request form** |
| `/suppliers`, `/suppliers/[slug]` | Supplier directory and profiles with their live offers |
| `/rfq` | Open buying requests plus a 4-step **post-a-request wizard** (`?commodity=` prefills it) |
| `/rfq/[ref]` | One buying request with a **send-an-offer form** for suppliers |
| `/sell` | Supplier onboarding and **application form** |
| `/about`, `/contact` | Company story and **contact form** |
| `/api/enquiry`, `/api/rfq`, `/api/search` | Form handlers (save to Postgres, optional email) and the ⌘K search index |

### Accounts, dashboards and admin

| Route | Who | Purpose |
| --- | --- | --- |
| `/signup`, `/login`, `/forgot-password`, `/reset-password` | Everyone | Email + password accounts. Buyers or suppliers; a supplier sign-up also creates a company that starts as **pending** |
| `/account` | Signed in | Profile, password, email confirmation; buyers see their buying requests and quote requests |
| `/dashboard` | Suppliers | Overview, **listings** (create, edit, inline price/stock/status), quote requests on their listings (no buyer contact details), open buying requests with an offer form, company profile |
| `/admin` | Admins | Overview, **enquiries** (full contact details, status, internal notes), **buying requests** (publish/close/spam), **suppliers** (approve/suspend, verification level), **listings** (status, featured), **users** (role, disable) |

- Admins: anyone who signs up with an email listed in `ADMIN_EMAILS` gets the admin role.
- Only **approved** suppliers and their listings appear on the public marketplace.
- Passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, stored hashed in `impexsphere.sessions` (30 days). Sign-in, sign-up and password reset are rate-limited.
- Email confirmation and password reset emails need `RESEND_API_KEY`; set `SITE_URL` so links point to the right domain.

Site-wide: ⌘K / Ctrl+K (or `/`) command palette, a shortlist with side-by-side compare (saved in the browser), page transitions, scroll-driven animations. Animations respect `prefers-reduced-motion`.

Fixed copy (verticals, steps, phases, destinations) lives in `src/lib/content.ts`. Marketplace data comes from the database (`src/lib/queries.ts`). Indicative USD prices use the rate in `src/lib/format.ts` (`USD_INR`).

## Run

```sh
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run db:migrate           # create the tables
npm run db:seed              # optional: categories + sample data
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`, with `RDS_DATABASE_URL` set, and `npm run db:migrate` run on each deploy.

## Database (PostgreSQL)

The site uses [Drizzle ORM](https://orm.drizzle.team) with the `postgres` driver.

| Path | What |
| --- | --- |
| `src/db/schema.ts` | Table definitions, the source of truth |
| `src/db/index.ts` | Connection pool (`getDb()`) |
| `src/db/url.ts` | Picks the connection string: `RDS_DATABASE_URL` (production, AWS RDS) first, then `DATABASE_URL` (local). Adds `sslmode=require` for `*.rds.amazonaws.com` hosts unless an `sslmode` is already set |
| `drizzle/` | Generated SQL migrations, committed |

| Command | Does |
| --- | --- |
| `npm run db:generate` | Creates a new migration after you edit `schema.ts` |
| `npm run db:migrate` | Applies pending migrations to `DATABASE_URL` |
| `npm run db:studio` | Opens Drizzle Studio to browse the data |

### Isolation from other apps

Everything ImpexSphere creates lives in its own Postgres schema, **`impexsphere`**: tables, enum types and the migrations log (`impexsphere.__migrations`). Nothing is created in `public`, and `drizzle-kit` is limited to that schema (`schemaFilter`), so other apps' tables in the same database are never read, changed or dropped.

### Tables (`impexsphere.*`)

| Table | What |
| --- | --- |
| `categories` | Commodity categories, with a colour and art shape |
| `suppliers` | Supplier companies: `status` (`pending` / `approved` / `suspended`) and verification level (`listed` / `verified` / `trusted`) |
| `listings` | Offers: price (₹/kg), MOQ, stock, specs, incoterms, status (`draft` / `active` / `paused` / `sold_out`) |
| `listing_prices` | Daily price history per listing (charts and sparklines) |
| `rfqs` | Buying requests. New ones are `pending` and only appear publicly once set to `open` |
| `enquiries` | Quote requests, offers on RFQs, supplier applications, contact messages (`status`: `new` / `in_progress` / `closed` / `spam`), with the submitting account and an internal admin note |
| `users` | Accounts: email, scrypt password hash, role (`buyer` / `supplier` / `admin`), linked supplier company |
| `sessions`, `auth_tokens`, `auth_attempts` | Sign-in sessions, email confirmation / password reset tokens (hashed), and rate-limit records |

### Sample data

`npm run db:seed` adds 9 categories plus 10 suppliers, ~43 listings and 8 buying requests that are **made up** and flagged `is_sample` (shown with a "Sample" badge). Remove them before launch with `npm run db:unseed` (categories stay). Running the seed twice doesn't create duplicates.

To publish a buying request: `update impexsphere.rfqs set status = 'open' where ref = 'RFQ-…';`

Bot submissions caught by the honeypot are not stored.

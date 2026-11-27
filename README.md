# ImpexSphere

The B2B import–export platform of **SP International Private Limited** ([spinternationalpvtltd.com](https://spinternationalpvtltd.com)): order-backed export of Indian spices and agricultural commodities, export enablement for Indian suppliers, and a verified commodity marketplace.

## Website

Built with Next.js (App Router) and TypeScript, with no UI framework. All styling lives in `src/app/globals.css`.

| Route | Purpose |
| --- | --- |
| `/` | Home: the main message, products, the four services, the 8-step order-backed model, trust pillars |
| `/products` | Turmeric, red chilli and cumin with typical specs, plus commodities available on request |
| `/buyers` | How ordering works, payment terms, **quote request form** (`#quote`, prefilled via `?commodity=`) |
| `/suppliers` | Export enablement vs logistics support, verification criteria, **supplier registration form** (`#register`) |
| `/about` | Problems solved, verticals, 5-phase roadmap |
| `/contact` | General contact form |
| `/api/enquiry` | Receives all three forms, validates them, saves to Postgres and optionally emails a notification |

Site copy (products, services, steps, phases) lives in `src/lib/content.ts`.

## Run

```sh
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run db:migrate           # create tables
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

**`enquiries` table:** every quote request, supplier registration and contact message, with `kind` (`quote` / `supplier` / `contact`) and `status` (`new` / `in_progress` / `closed` / `spam`), plus the form fields, IP, user agent and timestamps. Bot submissions caught by the honeypot are not stored.

## Email notifications (optional)

Set `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL` and `ENQUIRY_FROM_EMAIL` to get an email for each new submission. Submissions are always saved to Postgres first. If the email fails, it is only logged, and the submission is still saved.

## Next: the marketplace (Phase 3)

Supplier profiles, listings with lab reports, buyer search and comparison, and enquiries and RFQs. These will be added to this same app. The previous Flutter app is preserved in git history.

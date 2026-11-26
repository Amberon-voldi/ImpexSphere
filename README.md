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
| `/api/enquiry` | Receives all three forms, validates them, and emails the submission |

Site copy (products, services, steps, phases) lives in `src/lib/content.ts`.

## Run

```sh
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Form delivery

Copy `.env.example` to `.env.local` and set:

| Variable | Meaning |
| --- | --- |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `ENQUIRY_TO_EMAIL` | Inbox(es) for submissions, comma-separated |
| `ENQUIRY_FROM_EMAIL` | Sender on a domain verified in Resend |

Without these, submissions are printed to the server log in development. In production the form shows an error, so nothing is silently lost.

## Next: the marketplace (Phase 3)

Supplier profiles, listings with lab reports, buyer search and comparison, and enquiries and RFQs. These will be added to this same app. The previous Flutter app is preserved in git history.

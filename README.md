# ImpexSphere

A premium B2B import–export marketplace for agricultural commodities, where buyers and suppliers connect, suppliers list products, and every trade is anchored to live market pricing.

Powered by **SP International Private Limited** — [spinternationalpvtltd.com](https://spinternationalpvtltd.com)

## Features

- **Markets.** Live domestic (₹/kg, Indian mandis) and export (US$/MT, FOB India) prices for spices, vegetables, fruits, grains, pulses, oilseeds, tea, coffee and nuts, with history charts and the mandi price range.
- **Trade.** One tab, shaped by role. Suppliers list products with grade, MOQ, Incoterms, certifications, lead time and capacity. Buyers search and filter, and each listing is benchmarked against the live market price.
- **RFQs.** Buyers post requests for quotation, either to the open board or privately from a listing. Suppliers quote, and buyers compare offers and award one.
- **Watchlist and price alerts.** Star any commodity, and get "rises above / falls below" alerts that are evaluated on every price update.
- **Accounts.** Buyer and supplier roles, company profiles and verified badges.

## Run

```sh
flutter pub get
flutter run --dart-define-from-file=env.json
```

Demo accounts (password `demo1234`): `buyer@demo.impexsphere.app`, `supplier@demo.impexsphere.app`. The login screen also has one-tap demo buttons.

## Live pricing

Copy `env.example.json` to `env.json` (gitignored) and fill in:

| Key | Source | Covers |
| --- | --- | --- |
| `AGMARKNET_API_KEY` | Free key from [data.gov.in](https://data.gov.in) (Agmarknet daily mandi prices) | Domestic prices |
| `PRICE_API_URL` | SP International price service. The contract is documented in `lib/features/pricing/data/custom_api_source.dart` | Domestic and international prices |
| `LIVE_FX` | open.er-api.com, no key needed (on by default) | USD/INR |

How the feed stays reliable (`lib/features/pricing/data/price_repository.dart`):

- Live data only: a commodity appears once a live source has priced it. Nothing is simulated or estimated.
- Each source fails independently. A failed poll retries with exponential backoff, from 15 s up to 10 min.
- If a source stops answering, its last prices stay visible, marked **Delayed**.
- Implausible values, such as unit mistakes, are rejected. Agmarknet uses the median across reporting mandis, so a single bad entry can't skew it.
- The last good data is persisted, so the app opens with real numbers even offline.
- Polling pauses while the app is in the background.

With no source configured, Markets shows a "Connect live prices" state.

## Structure

```
lib/
  core/          theme, widgets, storage, config, formatting
  features/
    auth/        accounts, onboarding, login/sign-up
    pricing/     sources, repository, markets & commodity screens
    marketplace/ listings
    rfq/         requests for quotation & supplier quotes
    alerts/      watchlist & price alerts
    home/ shell/ profile/
```

State is managed with Riverpod and navigation with go_router. Accounts, listings and RFQs are currently stored on-device behind repository interfaces, ready to swap for Firebase or Supabase.

## Test

```sh
flutter analyze
flutter test
```

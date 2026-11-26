export const site = {
  name: "ImpexSphere",
  tagline: "India's spice and commodity trade, verified end to end.",
  description:
    "ImpexSphere is the B2B import–export platform of SP International Private Limited: order-backed export of Indian spices and agricultural commodities, export enablement for Indian suppliers, and a verified commodity marketplace.",
  company: "SP International Private Limited",
  companyUrl: "https://spinternationalpvtltd.com",
};

export const nav = [
  { href: "/products", label: "Products" },
  { href: "/buyers", label: "For Buyers" },
  { href: "/suppliers", label: "For Suppliers" },
  { href: "/about", label: "About" },
];

export type Product = {
  slug: string;
  name: string;
  origin: string;
  summary: string;
  forms: string[];
  specs: [string, string][];
};

export const products: Product[] = [
  {
    slug: "turmeric",
    name: "Turmeric",
    origin: "Erode, Salem, Nizamabad, Sangli",
    summary:
      "Finger and bulb turmeric, polished or unpolished, and ground powder, graded by curcumin content.",
    forms: ["Whole fingers", "Bulbs", "Powder"],
    specs: [
      ["Curcumin", "2–5% (by variety)"],
      ["Moisture", "≤ 10%"],
      ["Packing", "25 / 50 kg PP or jute bags"],
    ],
  },
  {
    slug: "red-chilli",
    name: "Red Chilli",
    origin: "Guntur, Khammam, Byadgi",
    summary:
      "Stemmed and stemless dried chillies across heat and colour grades, plus crushed and powdered forms.",
    forms: ["Whole (with / without stem)", "Crushed", "Powder"],
    specs: [
      ["Varieties", "S4 Sannam, Teja, Byadgi, 341"],
      ["Moisture", "≤ 11%"],
      ["Packing", "10 / 25 kg bags or bales"],
    ],
  },
  {
    slug: "cumin",
    name: "Cumin Seed",
    origin: "Unjha, Gujarat & Rajasthan",
    summary:
      "Machine-cleaned and sortex cumin in export purity grades for food processors and distributors.",
    forms: ["Whole seed", "Powder"],
    specs: [
      ["Purity", "98% / 99% / 99.5%"],
      ["Moisture", "≤ 9%"],
      ["Packing", "25 / 50 kg PP or paper bags"],
    ],
  },
];

export const moreCommodities = [
  "Coriander seed",
  "Fennel seed",
  "Fenugreek",
  "Black pepper",
  "Cardamom",
  "Mustard seed",
  "Ajwain",
  "Dry ginger",
];

export const verticals = [
  {
    key: "A",
    title: "Import–export trading",
    body: "We source and export under our own name, and buy only after an overseas buyer has ordered and paid an advance.",
  },
  {
    key: "B",
    title: "B2B commodity marketplace",
    body: "Verified suppliers list prices, stock, MOQs and lab reports. Buyers discover, compare and request quotes.",
  },
  {
    key: "C",
    title: "Export enablement",
    body: "No export licence? We buy from you in a genuine domestic sale and export as seller of record.",
  },
  {
    key: "D",
    title: "Logistics & trade support",
    body: "Already exporting? We coordinate packaging, freight, documentation, customs brokers and forwarders for a fee.",
  },
];

export const tradeSteps = [
  { title: "Buyer order", body: "Specs, quantity, price and delivery agreed." },
  { title: "Payment terms", body: "100% advance by default; 40–50% when negotiated." },
  { title: "Advance received", body: "Procurement starts only after funds arrive." },
  { title: "Procure goods", body: "Bought from verified Indian suppliers." },
  { title: "Quality check", body: "Inspected against the agreed specification." },
  { title: "Pack & document", body: "Export packaging, documents and banking." },
  { title: "Ship", body: "Freight and customs through trusted forwarders." },
  { title: "Settle", body: "Balance collected where an advance was partial." },
];

export const trustPillars = [
  {
    title: "Verified suppliers",
    body: "Suppliers are checked before and while they list, starting with those we've already traded with.",
  },
  {
    title: "Fresh data",
    body: "Suppliers update price, stock and specifications whenever anything material changes.",
  },
  {
    title: "Traceable quality",
    body: "Lab reports and specifications travel with each lot, so buyers can judge quality before enquiring.",
  },
];

export const phases = [
  { title: "Establish trading", body: "Selected spices, reliable buyers, repeatable QC and export." },
  { title: "Structured supplier network", body: "Locations, prices, quantities, MOQs and quality documents on record." },
  { title: "Marketplace launch", body: "Supplier profiles, listings, enquiries and quote requests." },
  { title: "Subscriptions & services", body: "Supplier and buyer tiers, stronger verification tools." },
  { title: "New categories & markets", body: "More commodity sectors and destination countries." },
];

export type Level = "listed" | "verified" | "trusted";

export type CardListing = {
  id: string;
  slug: string;
  title: string;
  form: string;
  origin: string;
  grade: string | null;
  price: number;
  moqKg: number;
  stockKg: number;
  leadTimeDays: number;
  incoterms: string[];
  certifications: string[];
  labReport: boolean;
  featured: boolean;
  views: number;
  isSample: boolean;
  updatedAt: string;
  spark: number[];
  change: number;
  supplier: { slug: string; name: string; city: string; state: string; level: Level; rating: number | null };
  category: { slug: string; name: string; hue: string; shape: string };
};

export type CategoryInfo = {
  slug: string;
  name: string;
  blurb: string;
  hue: string;
  shape: string;
  count: number;
  minPrice: number | null;
};

export type SupplierCard = {
  slug: string;
  name: string;
  city: string;
  state: string;
  about: string;
  level: Level;
  sinceYear: number | null;
  rating: number | null;
  responseHours: number | null;
  completedTrades: number;
  certifications: string[];
  isSample: boolean;
  listingCount: number;
  categories: string[];
  hues: string[];
};

export type PublicRfq = {
  ref: string;
  commodity: string;
  specs: string | null;
  quantity: string;
  destination: string;
  incoterm: string | null;
  targetPrice: string | null;
  deliveryBy: string | null;
  createdAt: string;
  isSample: boolean;
  category: { slug: string; name: string; hue: string } | null;
};

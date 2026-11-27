import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every ImpexSphere table, enum and the migrations log live in their own
 * Postgres schema, so nothing here can collide with tables other apps keep
 * in the same database (for example in `public`).
 */
export const impex = pgSchema("impexsphere");

export const verificationLevel = impex.enum("verification_level", ["listed", "verified", "trusted"]);
export const listingStatus = impex.enum("listing_status", ["draft", "active", "paused", "sold_out"]);
export const rfqStatus = impex.enum("rfq_status", ["pending", "open", "closed", "spam"]);
export const enquiryKind = impex.enum("enquiry_kind", ["listing_quote", "rfq_offer", "supplier_application", "contact"]);
export const enquiryStatus = impex.enum("enquiry_status", ["new", "in_progress", "closed", "spam"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Commodity categories (spices, seeds, pulses …). */
export const categories = impex.table("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  /** Hex colour used for the category's art and accents. */
  hue: text("hue").notNull().default("#c9a55a"),
  /** Shape used by the generated commodity art: finger | pod | seed | round | leaf. */
  shape: text("shape").notNull().default("seed"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Supplier companies that list on the marketplace. */
export const suppliers = impex.table(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    about: text("about").notNull().default(""),
    level: verificationLevel("level").notNull().default("listed"),
    sinceYear: integer("since_year"),
    rating: numeric("rating", { precision: 2, scale: 1, mode: "number" }),
    responseHours: integer("response_hours"),
    completedTrades: integer("completed_trades").notNull().default(0),
    capabilities: text("capabilities").array().notNull().default(sql`'{}'::text[]`),
    certifications: text("certifications").array().notNull().default(sql`'{}'::text[]`),
    contactEmail: text("contact_email"),
    /** Seeded demo data. Shown with a "Sample" badge; remove with `npm run db:unseed`. */
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("suppliers_level_idx").on(t.level)],
);

/** A supplier's lot or standing offer for a commodity. */
export const listings = impex.table(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    variety: text("variety"),
    grade: text("grade"),
    form: text("form").notNull(),
    origin: text("origin").notNull(),
    summary: text("summary").notNull().default(""),
    /** Indicative ex-warehouse price, INR per kg. */
    priceInrKg: numeric("price_inr_kg", { precision: 10, scale: 2, mode: "number" }).notNull(),
    moqKg: integer("moq_kg").notNull(),
    stockKg: integer("stock_kg").notNull(),
    leadTimeDays: integer("lead_time_days").notNull().default(14),
    packing: text("packing").notNull().default(""),
    incoterms: text("incoterms").array().notNull().default(sql`'{}'::text[]`),
    certifications: text("certifications").array().notNull().default(sql`'{}'::text[]`),
    /** Ordered [label, value] pairs. */
    specs: jsonb("specs").$type<[string, string][]>().notNull().default([]),
    labReport: boolean("lab_report").notNull().default(false),
    status: listingStatus("status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    views: integer("views").notNull().default(0),
    isSample: boolean("is_sample").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("listings_status_idx").on(t.status),
    index("listings_category_idx").on(t.categoryId),
    index("listings_supplier_idx").on(t.supplierId),
  ],
);

/** Price history for a listing (drives the sparklines and charts). */
export const listingPrices = impex.table(
  "listing_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    priceInrKg: numeric("price_inr_kg", { precision: 10, scale: 2, mode: "number" }).notNull(),
    recordedOn: timestamp("recorded_on", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("listing_prices_listing_day_idx").on(t.listingId, t.recordedOn)],
);

/** Buying requests posted by buyers. Shown publicly (without contact details) once `open`. */
export const rfqs = impex.table(
  "rfqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    status: rfqStatus("status").notNull().default("pending"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    commodity: text("commodity").notNull(),
    specs: text("specs"),
    quantity: text("quantity").notNull(),
    destination: text("destination").notNull(),
    incoterm: text("incoterm"),
    targetPrice: text("target_price"),
    deliveryBy: text("delivery_by"),
    buyerName: text("buyer_name").notNull(),
    buyerCompany: text("buyer_company").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerPhone: text("buyer_phone"),
    isSample: boolean("is_sample").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("rfqs_status_idx").on(t.status), index("rfqs_created_at_idx").on(t.createdAt)],
);

/** Quote requests on listings, offers on RFQs, supplier applications and contact messages. */
export const enquiries = impex.table(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: enquiryKind("kind").notNull(),
    status: enquiryStatus("status").notNull().default("new"),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    rfqId: uuid("rfq_id").references(() => rfqs.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    commodity: text("commodity"),
    quantity: text("quantity"),
    country: text("country"),
    incoterm: text("incoterm"),
    location: text("location"),
    capacity: text("capacity"),
    service: text("service"),
    message: text("message"),

    ip: text("ip"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    index("enquiries_kind_status_idx").on(t.kind, t.status),
    index("enquiries_created_at_idx").on(t.createdAt),
    index("enquiries_email_idx").on(t.email),
  ],
);

export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Rfq = typeof rfqs.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type NewRfq = typeof rfqs.$inferInsert;

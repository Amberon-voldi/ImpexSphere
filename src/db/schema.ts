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
export const supplierStatus = impex.enum("supplier_status", ["pending", "approved", "suspended"]);
export const userRole = impex.enum("user_role", ["buyer", "supplier", "admin"]);
export const authTokenKind = impex.enum("auth_token_kind", ["verify_email", "reset_password"]);

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
    /** Only `approved` suppliers (and their listings) are shown publicly. */
    status: supplierStatus("status").notNull().default("approved"),
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
  (t) => [index("suppliers_level_idx").on(t.level), index("suppliers_status_idx").on(t.status)],
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
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
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
    /** Account that submitted it, when signed in. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Supplier company that sent it (RFQ offers from signed-in suppliers). */
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    /** Internal notes from the trade desk. Never shown to buyers or suppliers. */
    adminNote: text("admin_note"),

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

/** Accounts. Admin role is granted to emails listed in ADMIN_EMAILS at sign-up. */
export const users = impex.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    role: userRole("role").notNull().default("buyer"),
    /** Supplier company this account manages (supplier role). */
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    disabled: boolean("disabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("users_role_idx").on(t.role), index("users_supplier_idx").on(t.supplierId)],
);

/** Sign-in sessions. Only a SHA-256 hash of the cookie token is stored. */
export const sessions = impex.table(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** One-time email verification and password reset tokens (hashed). */
export const authTokens = impex.table(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: authTokenKind("kind").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId)],
);

/** Sign-in / sign-up attempts, for rate limiting. */
export const authAttempts = impex.table(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: text("action").notNull(),
    key: text("key").notNull(),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_lookup_idx").on(t.action, t.key, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Rfq = typeof rfqs.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type NewRfq = typeof rfqs.$inferInsert;

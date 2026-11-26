import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const enquiryKind = pgEnum("enquiry_kind", ["quote", "supplier", "contact"]);
export const enquiryStatus = pgEnum("enquiry_status", ["new", "in_progress", "closed", "spam"]);

/** Quote requests, supplier registrations and contact messages from the website. */
export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: enquiryKind("kind").notNull(),
    status: enquiryStatus("status").notNull().default("new"),

    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    commodity: text("commodity"),
    message: text("message"),

    // Buyer quote requests
    country: text("country"),
    quantity: text("quantity"),
    incoterm: text("incoterm"),

    // Supplier registrations
    location: text("location"),
    capacity: text("capacity"),
    service: text("service"),

    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("enquiries_kind_status_idx").on(t.kind, t.status),
    index("enquiries_created_at_idx").on(t.createdAt),
    index("enquiries_email_idx").on(t.email),
  ],
);

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;

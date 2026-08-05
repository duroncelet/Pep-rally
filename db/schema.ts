import { index, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const savedRallies = sqliteTable("saved_rallies", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  toolSlug: text("tool_slug").notNull(),
  title: text("title").notNull(),
  inputs: text("inputs").notNull(),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_saved_rallies_user_updated").on(table.userId, table.updatedAt)]);

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  buyerUserId: text("buyer_user_id").notNull(),
  toolSlug: text("tool_slug").notNull(),
  title: text("title").notNull(),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  creatorEarningsCents: integer("creator_earnings_cents").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_purchases_buyer_created").on(table.buyerUserId, table.createdAt)]);

export const creatorApps = sqliteTable("creator_apps", {
  id: text("id").primaryKey(),
  creatorUserId: text("creator_user_id").notNull(),
  creatorEmail: text("creator_email").notNull(),
  name: text("name").notNull(),
  problem: text("problem").notNull(),
  outcome: text("outcome").notNull(),
  proof: text("proof").notNull(),
  accessModel: text("access_model").notNull(),
  priceCents: integer("price_cents").notNull(),
  stage: text("stage").notNull(),
  sourceType: text("source_type").notNull().default("guided"),
  sourceUrl: text("source_url"),
  sourceFileKey: text("source_file_key"),
  builderSpec: text("builder_spec"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_creator_apps_owner_updated").on(table.creatorUserId, table.updatedAt)]);

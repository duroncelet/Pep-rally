import { index, sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  stripeSessionId: text("stripe_session_id"),
  fulfilledAt: integer("fulfilled_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_purchases_buyer_created").on(table.buyerUserId, table.createdAt),
  uniqueIndex("idx_purchases_stripe_session").on(table.stripeSessionId),
]);

export const creatorApps = sqliteTable("creator_apps", {
  id: text("id").primaryKey(),
  creatorUserId: text("creator_user_id").notNull(),
  creatorEmail: text("creator_email").notNull(),
  creatorName: text("creator_name").notNull().default("Pep Rally maker"),
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

export const partyPlans = sqliteTable("party_plans", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().unique(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_party_plans_owner").on(table.ownerUserId)]);

export const rallyReviews = sqliteTable("rally_reviews", {
  id: text("id").primaryKey(),
  toolSlug: text("tool_slug").notNull(),
  reviewerUserId: text("reviewer_user_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("idx_rally_reviews_tool_reviewer").on(table.toolSlug, table.reviewerUserId),
  index("idx_rally_reviews_tool_updated").on(table.toolSlug, table.updatedAt),
]);

export const gardenPlans = sqliteTable("garden_plans", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().unique(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_garden_plans_owner").on(table.ownerUserId)]);

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

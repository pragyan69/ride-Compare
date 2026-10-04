import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const retailers=sqliteTable("retailers",{id:text("id").primaryKey(),data:text("data").notNull()});
export const listings=sqliteTable("listings",{id:text("id").primaryKey(),storeId:text("store_id").notNull(),productId:text("product_id").notNull(),data:text("data").notNull()});

import { pgTable, text, serial, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").unique().notNull(),
    email: text("email").unique().notNull(),
    password: text("password"),
    googleId: text("google_id").unique(),
    avatarUrl: text("avatar_url"),
    role: text("role").default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchlist = pgTable("watchlist", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    symbol: text("symbol").notNull(),
    name: text("name"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const signalHistory = pgTable("signal_history", {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    type: text("type").notNull(), // 'buy', 'sell'
    price: doublePrecision("price").notNull(),
    signalStrength: text("signal_strength"), // 'strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'
    indicators: text("indicators"), // JSON string of indicator values
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockNotes = pgTable("stock_notes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    symbol: text("symbol").notNull(),
    note: text("note").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

import { pgTable, text, serial, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const roleEnum = pgEnum('role', ['admin', 'forwarder']);

// Status enum
export const statusEnum = pgEnum('status', ['active', 'archived', 'ending_soon']);

// Vehicle type enum
export const vehicleTypeEnum = pgEnum('vehicle_type', ['40t', '12t', 'van']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  companyName: text("company_name").notNull(),
  role: roleEnum("role").notNull().default('forwarder'),
});

// Lane table
export const lanes = pgTable("lanes", {
  id: serial("id").primaryKey(),
  bidName: text("bid_name").notNull(),
  status: statusEnum("status").notNull().default('active'),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  loadingLocation: text("loading_location").notNull(),
  unloadingLocation: text("unloading_location").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Bid table
export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  laneId: integer("lane_id").notNull().references(() => lanes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  comment: text("comment"), // Optional comment field for bids
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create schemas for insert operations
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertLaneSchema = createInsertSchema(lanes)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Allow ISO string format for dates
    validFrom: z.string().or(z.date()),
    validUntil: z.string().or(z.date()),
  });

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
});

// Define TypeScript types from the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLane = z.infer<typeof insertLaneSchema>;
export type Lane = typeof lanes.$inferSelect;

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// Types for frontend
export interface LaneWithBids extends Lane {
  minBid?: number;
  bidCount?: number;
}

export interface BidWithUser extends Bid {
  username: string;
  companyName: string;
}

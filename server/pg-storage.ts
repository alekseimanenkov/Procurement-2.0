import { eq, and, like, desc, asc, SQL, sql } from 'drizzle-orm';
import { db } from './db';
import {
  users, User, InsertUser,
  lanes, Lane, InsertLane,
  bids, Bid, InsertBid,
  BidWithUser, LaneWithBids
} from "@shared/schema";

import { IStorage } from './storage';

// Helper function to safely convert bid amount from string to number
function formatBidAmount(amount: string | number): string {
  if (typeof amount === 'number') {
    return amount.toString();
  }
  return amount;
}

export class PgStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Lane operations
  async getLane(id: number): Promise<Lane | undefined> {
    const result = await db.select().from(lanes).where(eq(lanes.id, id));
    return result[0];
  }

  async getLanes(filters?: {
    status?: string;
    vehicleType?: string;
    loadingLocation?: string;
    unloadingLocation?: string;
  }): Promise<LaneWithBids[]> {
    // Start with a base query
    let baseQuery = db.select().from(lanes);
    
    // Add filters if provided
    if (filters) {
      const conditions = [];
      
      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(lanes.status, filters.status as any));
      }
      
      if (filters.vehicleType && filters.vehicleType !== 'all') {
        conditions.push(eq(lanes.vehicleType, filters.vehicleType as any));
      }
      
      if (filters.loadingLocation && filters.loadingLocation !== 'all') {
        conditions.push(like(lanes.loadingLocation, `%${filters.loadingLocation}%`));
      }
      
      if (filters.unloadingLocation && filters.unloadingLocation !== 'all') {
        conditions.push(like(lanes.unloadingLocation, `%${filters.unloadingLocation}%`));
      }
      
      // Apply conditions if any exist
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }
    }
    
    // Get filtered lanes
    const filteredLanes = await baseQuery.orderBy(desc(lanes.createdAt));
    
    // Add min bid and bid count for each lane
    const lanesWithBids: LaneWithBids[] = await Promise.all(
      filteredLanes.map(async lane => {
        const minBid = await this.getLowestBidForLane(lane.id);
        const bidCount = await this.getBidCountForLane(lane.id);
        return {
          ...lane,
          minBid,
          bidCount
        };
      })
    );
    
    return lanesWithBids;
  }

  async createLane(lane: InsertLane): Promise<Lane> {
    // Convert string dates to Date objects if necessary
    const validFrom = typeof lane.validFrom === 'string' 
      ? new Date(lane.validFrom) 
      : lane.validFrom;
    
    const validUntil = typeof lane.validUntil === 'string' 
      ? new Date(lane.validUntil) 
      : lane.validUntil;
    
    // Create lane with correct date types
    const insertData = {
      bidName: lane.bidName,
      status: lane.status,
      vehicleType: lane.vehicleType,
      loadingLocation: lane.loadingLocation,
      unloadingLocation: lane.unloadingLocation,
      validFrom,
      validUntil,
      createdBy: lane.createdBy
    };
    
    const result = await db.insert(lanes).values(insertData).returning();
    return result[0];
  }

  async updateLane(id: number, laneUpdate: Partial<InsertLane>): Promise<Lane | undefined> {
    // Create a clean update object with only the fields that are present
    const updateData: any = {};
    
    if (laneUpdate.bidName !== undefined) {
      updateData.bidName = laneUpdate.bidName;
    }
    
    if (laneUpdate.status !== undefined) {
      updateData.status = laneUpdate.status;
    }
    
    if (laneUpdate.vehicleType !== undefined) {
      updateData.vehicleType = laneUpdate.vehicleType;
    }
    
    if (laneUpdate.loadingLocation !== undefined) {
      updateData.loadingLocation = laneUpdate.loadingLocation;
    }
    
    if (laneUpdate.unloadingLocation !== undefined) {
      updateData.unloadingLocation = laneUpdate.unloadingLocation;
    }
    
    if (laneUpdate.validFrom !== undefined) {
      updateData.validFrom = typeof laneUpdate.validFrom === 'string' 
        ? new Date(laneUpdate.validFrom) 
        : laneUpdate.validFrom;
    }
    
    if (laneUpdate.validUntil !== undefined) {
      updateData.validUntil = typeof laneUpdate.validUntil === 'string' 
        ? new Date(laneUpdate.validUntil) 
        : laneUpdate.validUntil;
    }
    
    if (laneUpdate.createdBy !== undefined) {
      updateData.createdBy = laneUpdate.createdBy;
    }
    
    const result = await db.update(lanes)
      .set(updateData)
      .where(eq(lanes.id, id))
      .returning();
      
    return result[0];
  }

  async deleteLane(id: number): Promise<boolean> {
    // First, delete all bids associated with this lane
    await db.delete(bids).where(eq(bids.laneId, id));
    
    // Then delete the lane
    const result = await db.delete(lanes).where(eq(lanes.id, id)).returning();
    return result.length > 0;
  }

  // Bid operations
  async getBid(id: number): Promise<Bid | undefined> {
    const result = await db.select().from(bids).where(eq(bids.id, id));
    return result[0];
  }

  async getBidsByLane(laneId: number): Promise<BidWithUser[]> {
    // Get all bids for the lane, ordered by amount
    const bidResults = await db.select()
      .from(bids)
      .where(eq(bids.laneId, laneId))
      .orderBy(asc(bids.amount));
    
    // Attach user information to each bid
    const bidsWithUser: BidWithUser[] = [];
    
    for (const bid of bidResults) {
      const user = await this.getUser(bid.userId);
      bidsWithUser.push({
        ...bid,
        username: user?.username || 'Unknown',
        companyName: user?.companyName || 'Unknown Company'
      });
    }
    
    return bidsWithUser;
  }

  async getLowestBidForLane(laneId: number): Promise<number | undefined> {
    // Get the lowest bid for a lane
    const result = await db.select()
      .from(bids)
      .where(eq(bids.laneId, laneId))
      .orderBy(asc(bids.amount))
      .limit(1);
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Convert from string (numeric type) to number
    const amount = result[0].amount;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  }

  async getBidCountForLane(laneId: number): Promise<number> {
    // Count bids for a lane using SQL count
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(bids)
      .where(eq(bids.laneId, laneId));
    
    return result[0]?.count || 0;
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    // Ensure amount is stored as a string (for PostgreSQL numeric type)
    const insertData = {
      ...bid,
      amount: formatBidAmount(bid.amount)
    };
    
    const result = await db.insert(bids).values(insertData).returning();
    return result[0];
  }
}

export const pgStorage = new PgStorage();
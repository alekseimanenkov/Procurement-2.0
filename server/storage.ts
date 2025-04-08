import { z } from "zod";
import { 
  users, User, InsertUser, 
  lanes, Lane, InsertLane, 
  bids, Bid, InsertBid,
  BidWithUser, LaneWithBids
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // Lane operations
  getLane(id: number): Promise<Lane | undefined>;
  getLanes(filters?: {
    status?: string;
    vehicleType?: string;
    loadingLocation?: string;
    unloadingLocation?: string;
  }): Promise<LaneWithBids[]>;
  createLane(lane: InsertLane): Promise<Lane>;
  updateLane(id: number, lane: Partial<InsertLane>): Promise<Lane | undefined>;
  deleteLane(id: number): Promise<boolean>;

  // Bid operations
  getBid(id: number): Promise<Bid | undefined>;
  getBidsByLane(laneId: number): Promise<BidWithUser[]>;
  getLowestBidForLane(laneId: number): Promise<number | undefined>;
  getBidCountForLane(laneId: number): Promise<number>;
  createBid(bid: InsertBid): Promise<Bid>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private lanes: Map<number, Lane>;
  private bids: Map<number, Bid>;
  
  private userId: number;
  private laneId: number;
  private bidId: number;

  constructor() {
    this.users = new Map();
    this.lanes = new Map();
    this.bids = new Map();
    
    this.userId = 1;
    this.laneId = 1;
    this.bidId = 1;
    
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      companyName: "Admin Company",
      role: "admin"
    });
    
    // Create default freight forwarder user
    this.createUser({
      username: "user",
      password: "user123",
      companyName: "Freight Co.",
      role: "forwarder"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Ensure role is properly set with a default value if undefined
    const role = insertUser.role || "forwarder";
    const user: User = { 
      ...insertUser, 
      id,
      role // Explicitly set the role to ensure it's not undefined
    };
    this.users.set(id, user);
    return user;
  }

  // Lane operations
  async getLane(id: number): Promise<Lane | undefined> {
    return this.lanes.get(id);
  }

  async getLanes(filters?: {
    status?: string;
    vehicleType?: string;
    loadingLocation?: string;
    unloadingLocation?: string;
  }): Promise<LaneWithBids[]> {
    let results = Array.from(this.lanes.values());
    
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        results = results.filter(lane => lane.status === filters.status);
      }
      
      if (filters.vehicleType && filters.vehicleType !== 'all') {
        results = results.filter(lane => lane.vehicleType === filters.vehicleType);
      }
      
      if (filters.loadingLocation && filters.loadingLocation !== 'all') {
        const loadingLocation = filters.loadingLocation; // Assign to a local variable to satisfy TypeScript
        results = results.filter(lane => lane.loadingLocation.toLowerCase().includes(loadingLocation.toLowerCase()));
      }
      
      if (filters.unloadingLocation && filters.unloadingLocation !== 'all') {
        const unloadingLocation = filters.unloadingLocation; // Assign to a local variable to satisfy TypeScript
        results = results.filter(lane => lane.unloadingLocation.toLowerCase().includes(unloadingLocation.toLowerCase()));
      }
    }
    
    // Add min bid and bid count for each lane
    const lanesWithBids: LaneWithBids[] = await Promise.all(
      results.map(async lane => {
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

  async createLane(insertLane: InsertLane): Promise<Lane> {
    const id = this.laneId++;
    const createdAt = new Date();
    
    // Convert string dates to Date objects if necessary
    const validFrom = typeof insertLane.validFrom === 'string' 
      ? new Date(insertLane.validFrom) 
      : insertLane.validFrom;
    
    const validUntil = typeof insertLane.validUntil === 'string' 
      ? new Date(insertLane.validUntil) 
      : insertLane.validUntil;
    
    // Make sure status has a value
    const status = insertLane.status || 'active';
    
    // Create a new lane object with the correct types
    const lane: Lane = {
      id,
      bidName: insertLane.bidName,
      status: status as "active" | "archived" | "ending_soon",
      vehicleType: insertLane.vehicleType,
      loadingLocation: insertLane.loadingLocation,
      unloadingLocation: insertLane.unloadingLocation,
      validFrom: validFrom as Date,
      validUntil: validUntil as Date,
      createdAt: createdAt,
      createdBy: insertLane.createdBy
    };
    
    this.lanes.set(id, lane);
    return lane;
  }

  async updateLane(id: number, laneUpdate: Partial<InsertLane>): Promise<Lane | undefined> {
    const existingLane = this.lanes.get(id);
    
    if (!existingLane) {
      return undefined;
    }
    
    // Handle date fields specifically to ensure they are Date objects
    let validFrom = existingLane.validFrom;
    if (laneUpdate.validFrom) {
      validFrom = typeof laneUpdate.validFrom === 'string' 
        ? new Date(laneUpdate.validFrom) 
        : laneUpdate.validFrom;
    }
    
    let validUntil = existingLane.validUntil;
    if (laneUpdate.validUntil) {
      validUntil = typeof laneUpdate.validUntil === 'string' 
        ? new Date(laneUpdate.validUntil) 
        : laneUpdate.validUntil;
    }
    
    // Create a new lane object with proper types
    const updatedLane: Lane = { 
      ...existingLane,
      bidName: laneUpdate.bidName || existingLane.bidName,
      status: (laneUpdate.status as "active" | "archived" | "ending_soon") || existingLane.status,
      vehicleType: laneUpdate.vehicleType || existingLane.vehicleType,
      loadingLocation: laneUpdate.loadingLocation || existingLane.loadingLocation,
      unloadingLocation: laneUpdate.unloadingLocation || existingLane.unloadingLocation,
      validFrom: validFrom as Date,
      validUntil: validUntil as Date,
      createdBy: laneUpdate.createdBy || existingLane.createdBy
    };
    
    this.lanes.set(id, updatedLane);
    
    return updatedLane;
  }

  async deleteLane(id: number): Promise<boolean> {
    return this.lanes.delete(id);
  }

  // Bid operations
  async getBid(id: number): Promise<Bid | undefined> {
    return this.bids.get(id);
  }

  async getBidsByLane(laneId: number): Promise<BidWithUser[]> {
    const laneBids = Array.from(this.bids.values())
      .filter(bid => bid.laneId === laneId)
      .sort((a, b) => {
        // Sort by amount ascending (lowest first)
        if (typeof a.amount === 'number' && typeof b.amount === 'number') {
          return a.amount - b.amount;
        }
        // If amount is string (from numeric type), convert to number
        const amountA = typeof a.amount === 'string' ? parseFloat(a.amount) : a.amount;
        const amountB = typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount;
        return amountA - amountB;
      });
      
    // Attach user information to each bid
    const bidsWithUser: BidWithUser[] = await Promise.all(
      laneBids.map(async bid => {
        const user = await this.getUser(bid.userId);
        return {
          ...bid,
          username: user?.username || 'Unknown',
          companyName: user?.companyName || 'Unknown Company'
        };
      })
    );
    
    return bidsWithUser;
  }

  async getLowestBidForLane(laneId: number): Promise<number | undefined> {
    const bids = Array.from(this.bids.values())
      .filter(bid => bid.laneId === laneId);
      
    if (bids.length === 0) {
      return undefined;
    }
    
    // Find minimum bid amount
    const minBid = bids.reduce((min, bid) => {
      const amount = typeof bid.amount === 'string' ? parseFloat(bid.amount) : bid.amount;
      return amount < min ? amount : min;
    }, Infinity);
    
    return minBid === Infinity ? undefined : minBid;
  }

  async getBidCountForLane(laneId: number): Promise<number> {
    return Array.from(this.bids.values())
      .filter(bid => bid.laneId === laneId)
      .length;
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const id = this.bidId++;
    const createdAt = new Date();
    // Initialize with empty comment if not provided
    const comment = insertBid.comment ?? null;
    const bid: Bid = { ...insertBid, comment, id, createdAt };
    this.bids.set(id, bid);
    return bid;
  }
}

// Create the storage instance based on environment
import { pgStorage } from './pg-storage';

// Use PostgreSQL storage instead of memory storage
export const storage = pgStorage;

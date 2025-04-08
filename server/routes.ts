import express, { type Express, Request, Response } from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema, insertLaneSchema, insertBidSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "procurement-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  };

  // AUTH ROUTES
  app.post("/api/register", requireAdmin, async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      const { username, password, companyName, role } = result.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create user (force role to be forwarder when created by admin)
      const user = await storage.createUser({
        username,
        password, // In a real app, this would be hashed
        companyName,
        role: "forwarder" // Always set to forwarder when created by admin
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        companyName: user.companyName,
        role: user.role
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) { // In a real app, passwords would be hashed and compared securely
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      res.json({
        id: user.id,
        username: user.username,
        companyName: user.companyName,
        role: user.role
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        companyName: user.companyName,
        role: user.role
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Include passwords since we need to display them in the admin view
      // In a real production app, we would never expose passwords like this
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // LANE ROUTES
  app.get("/api/lanes", requireAuth, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        vehicleType: req.query.vehicleType as string | undefined,
        loadingLocation: req.query.loadingLocation as string | undefined,
        unloadingLocation: req.query.unloadingLocation as string | undefined
      };
      
      const lanes = await storage.getLanes(filters);
      res.json(lanes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/lanes/:id", requireAuth, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      const lane = await storage.getLane(laneId);
      
      if (!lane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      const minBid = await storage.getLowestBidForLane(laneId);
      const bidCount = await storage.getBidCountForLane(laneId);
      
      res.json({
        ...lane,
        minBid,
        bidCount
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/lanes", requireAdmin, async (req, res) => {
    try {
      // Debug what's being sent
      console.log("Lane creation request body:", JSON.stringify(req.body));
      
      // Add the createdBy field before validation
      const dataWithCreatedBy = {
        ...req.body,
        createdBy: req.session.userId!
      };
      
      console.log("Lane creation data with createdBy:", JSON.stringify(dataWithCreatedBy));
      
      const result = insertLaneSchema.safeParse(dataWithCreatedBy);
      
      if (!result.success) {
        console.log("Lane validation error:", fromZodError(result.error).message);
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      const lane = await storage.createLane(result.data);
      console.log("Lane created:", JSON.stringify(lane));
      
      // Send email notifications
      try {
        const users = await storage.getAllUsers();
        const forwarderEmails = users
          .filter(user => user.role === 'forwarder')
          .map(user => user.email);
        
        if (forwarderEmails.length > 0) {
          await sendLaneNotification(forwarderEmails, lane);
        }
      } catch (error) {
        console.error('Failed to send email notifications:', error);
      }
      
      res.status(201).json(lane);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/lanes/:id", requireAdmin, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      // Get existing lane
      const existingLane = await storage.getLane(laneId);
      
      if (!existingLane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      // Validate update
      const partialSchema = insertLaneSchema.partial();
      const result = partialSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      // Update lane
      const updatedLane = await storage.updateLane(laneId, result.data);
      
      if (!updatedLane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      res.json(updatedLane);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/lanes/:id", requireAdmin, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      const deleted = await storage.deleteLane(laneId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      res.json({ message: "Lane deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // BID ROUTES
  app.get("/api/lanes/:id/bids", requireAuth, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      const lane = await storage.getLane(laneId);
      
      if (!lane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      // Only admins can see all bids
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const bids = await storage.getBidsByLane(laneId);
      res.json(bids);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get user's bids (for bid history)
  app.get("/api/user/bids", requireAuth, async (req, res) => {
    try {
      // Get all lanes first
      const lanes = await storage.getLanes();
      
      // Get all bids for each lane
      const allBids: any[] = [];
      
      for (const lane of lanes) {
        try {
          const laneBids = await storage.getBidsByLane(lane.id);
          // Filter to just the user's bids
          const userBids = laneBids.filter(bid => bid.userId === req.session.userId);
          
          // Add lane info to each bid
          userBids.forEach(bid => {
            allBids.push({
              ...bid,
              lane: {
                id: lane.id,
                bidName: lane.bidName,
                status: lane.status,
                vehicleType: lane.vehicleType,
                loadingLocation: lane.loadingLocation,
                unloadingLocation: lane.unloadingLocation,
                validFrom: lane.validFrom,
                validUntil: lane.validUntil,
                minBid: lane.minBid
              }
            });
          });
        } catch (err) {
          console.error(`Error fetching bids for lane ${lane.id}:`, err);
          // Continue to next lane even if there's an error with one
        }
      }
      
      // Sort by most recent first
      allBids.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      res.json(allBids);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/lanes/:id/bids", requireAuth, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      const lane = await storage.getLane(laneId);
      
      if (!lane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      // Only forwarders can place bids
      if (req.session.role !== 'forwarder') {
        return res.status(403).json({ message: "Forbidden: Only freight forwarders can submit bids" });
      }
      
      // Validate input
      const schema = z.object({
        amount: z.number().positive(),
        comment: z.string().optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }
      
      // Check if lane is active
      if (lane.status !== 'active' && lane.status !== 'ending_soon') {
        return res.status(400).json({ message: "Cannot bid on inactive lanes" });
      }
      
      // Create bid
      const bid = await storage.createBid({
        laneId,
        userId: req.session.userId!,
        amount: result.data.amount.toString(),
        comment: result.data.comment
      });
      
      res.status(201).json(bid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/lanes/:id/min-bid", requireAuth, async (req, res) => {
    try {
      const laneId = parseInt(req.params.id);
      
      if (isNaN(laneId)) {
        return res.status(400).json({ message: "Invalid lane ID" });
      }
      
      const lane = await storage.getLane(laneId);
      
      if (!lane) {
        return res.status(404).json({ message: "Lane not found" });
      }
      
      const minBid = await storage.getLowestBidForLane(laneId);
      res.json({ minBid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

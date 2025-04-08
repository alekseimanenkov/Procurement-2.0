export interface User {
  id: number;
  username: string;
  companyName: string;
  role: "admin" | "forwarder";
  password?: string; // Optional for frontend display purposes
}

export interface Lane {
  id: number;
  bidName: string;
  status: "active" | "archived" | "ending_soon";
  vehicleType: "40t" | "12t" | "van";
  loadingLocation: string;
  unloadingLocation: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  createdBy: number;
  minBid?: number;
  bidCount?: number;
}

export interface Bid {
  id: number;
  laneId: number;
  userId: number;
  amount: number;
  comment?: string; // Optional comment field
  createdAt: string;
  username: string;
  companyName: string;
}

export interface LaneFilters {
  status?: string;
  vehicleType?: string;
  loadingLocation?: string;
  unloadingLocation?: string;
}

export interface LaneFormValues {
  bidName: string;
  status: "active" | "archived" | "ending_soon";
  vehicleType: "40t" | "12t" | "van";
  loadingLocation: string;
  unloadingLocation: string;
  validFrom: string;
  validUntil: string;
}

export interface BidFormValues {
  amount: number;
  comment?: string;
}

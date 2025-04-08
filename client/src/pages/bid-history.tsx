import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ArrowLeftIcon,
} from "lucide-react";
import { Bid } from "@/lib/types";

interface BidWithLane extends Bid {
  lane: {
    id: number;
    bidName: string;
    status: "active" | "archived" | "ending_soon";
    vehicleType: "40t" | "12t" | "van";
    loadingLocation: string;
    unloadingLocation: string;
    validFrom: string;
    validUntil: string;
    minBid?: number;
  };
}

interface GroupedBids {
  [key: string]: {
    laneId: number;
    bidName: string;
    status: "active" | "archived" | "ending_soon";
    vehicleType: "40t" | "12t" | "van";
    loadingLocation: string;
    unloadingLocation: string;
    validFrom: string;
    validUntil: string;
    minBid?: number;
    bids: BidWithLane[];
  };
}

export default function BidHistory() {
  const [, setLocation] = useLocation();
  const [expandedLanes, setExpandedLanes] = useState<{[key: string]: boolean}>({});
  
  // Fetch user's bids
  const { data: bids, isLoading, error } = useQuery<BidWithLane[]>({
    queryKey: ["/api/user/bids"],
    queryFn: async () => {
      const response = await fetch("/api/user/bids", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching bid history: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const toggleExpand = (laneId: number) => {
    setExpandedLanes(prev => ({
      ...prev,
      [laneId]: !prev[laneId]
    }));
  };
  
  const groupBidsByLane = (bids: BidWithLane[]): GroupedBids => {
    const grouped: GroupedBids = {};
    
    bids.forEach(bid => {
      const laneId = bid.lane.id;
      
      if (!grouped[laneId]) {
        grouped[laneId] = {
          laneId: bid.lane.id,
          bidName: bid.lane.bidName,
          status: bid.lane.status,
          vehicleType: bid.lane.vehicleType,
          loadingLocation: bid.lane.loadingLocation,
          unloadingLocation: bid.lane.unloadingLocation,
          validFrom: bid.lane.validFrom,
          validUntil: bid.lane.validUntil,
          minBid: bid.lane.minBid,
          bids: []
        };
      }
      
      grouped[laneId].bids.push(bid);
    });
    
    // Sort bids within each lane by date (newest first)
    Object.keys(grouped).forEach(laneId => {
      grouped[laneId].bids.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    
    return grouped;
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Bid History</h1>
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">
            Error loading bid history. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  const goBackToDashboard = () => {
    setLocation("/");
  };
  
  const groupedBids = bids ? groupBidsByLane(bids) : {};
  const groupedLaneKeys = Object.keys(groupedBids).sort((a, b) => {
    // Sort by status: active first, then ending_soon, then archived
    const statusA = groupedBids[a].status;
    const statusB = groupedBids[b].status;
    
    const statusPriority = {
      "active": 0,
      "ending_soon": 1, 
      "archived": 2
    };
    
    return statusPriority[statusA] - statusPriority[statusB];
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bid History</h1>
        <Button 
          onClick={goBackToDashboard} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon size={16} />
          Back to Lanes
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bids && bids.length > 0 ? (
        <div className="space-y-4">
          {groupedLaneKeys.map((laneId) => {
            const lane = groupedBids[laneId];
            const latestBid = lane.bids[0]; // Already sorted, most recent first
            const bidAmount = typeof latestBid.amount === 'string' ? parseFloat(latestBid.amount) : latestBid.amount;
            const isLowest = lane.minBid === bidAmount;
            const isExpanded = expandedLanes[lane.laneId] || false;
            
            return (
              <Card key={lane.laneId} className="overflow-hidden">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpand(lane.laneId)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{lane.bidName}</CardTitle>
                      <Badge variant={
                        lane.status === "active" ? "default" :
                        lane.status === "ending_soon" ? "destructive" : "outline"
                      }>
                        {lane.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isLowest ? "default" : "secondary"}>
                        {isLowest ? "Lowest Bid" : "Outbid"}
                      </Badge>
                      {isExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
                    </div>
                  </div>
                  <CardDescription className="flex justify-between items-center mt-2">
                    <span>
                      {lane.loadingLocation} → {lane.unloadingLocation} ({lane.vehicleType})
                    </span>
                    <span className="font-medium">
                      Latest bid: €{bidAmount.toFixed(2)}
                    </span>
                  </CardDescription>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">Lane Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                        <div>
                          <p className="text-xs text-gray-500">Route</p>
                          <p className="text-sm font-medium">{lane.loadingLocation} → {lane.unloadingLocation}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Vehicle Type</p>
                          <p className="text-sm font-medium">{lane.vehicleType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Valid Period</p>
                          <p className="text-sm font-medium">{formatDate(lane.validFrom)} - {formatDate(lane.validUntil)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Lowest Bid</p>
                          <p className="text-sm font-medium">€{lane.minBid?.toFixed(2) || 'No bids yet'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-500 mb-3">Your Bid History</p>
                    <div className="space-y-3">
                      {lane.bids.map((bid) => {
                        const bidAmount = typeof bid.amount === 'string' ? parseFloat(bid.amount) : bid.amount;
                        const isLowestBid = lane.minBid === bidAmount;
                        
                        return (
                          <div key={bid.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">
                                Bid Amount: <span className="text-primary">€{bidAmount.toFixed(2)}</span>
                              </p>
                              {isLowestBid && (
                                <Badge variant="default" className="text-xs">Lowest Bid</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Placed on {formatDate(bid.createdAt)} at {formatTime(bid.createdAt)}
                            </p>
                            {bid.comment && (
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs text-gray-500">Comment:</p>
                                <p className="text-sm">{bid.comment}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-md text-center">
          <p className="text-gray-500">
            You haven't placed any bids yet. Browse the available lanes and start bidding!
          </p>
        </div>
      )}
    </div>
  );
}
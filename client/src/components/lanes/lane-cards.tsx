import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lane, LaneFilters } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  ArrowUpDown,
  MapPin,
  Clock,
  Eye,
  Truck,
  Calendar
} from "lucide-react";

interface LaneCardsProps {
  filters: LaneFilters;
  userId: number;
}

export default function LaneCards({ filters, userId }: LaneCardsProps) {
  const [successfulBidLaneId, setSuccessfulBidLaneId] = useState<number | null>(null);
  const [bidAmounts, setBidAmounts] = useState<Record<number, number>>({});
  const [bidComments, setBidComments] = useState<Record<number, string>>({});
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  
  // Build query string from filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all") {
      params.append("status", filters.status);
    }
    if (filters.vehicleType && filters.vehicleType !== "all") {
      params.append("vehicleType", filters.vehicleType);
    }
    if (filters.loadingLocation && filters.loadingLocation !== "all") {
      params.append("loadingLocation", filters.loadingLocation);
    }
    if (filters.unloadingLocation && filters.unloadingLocation !== "all") {
      params.append("unloadingLocation", filters.unloadingLocation);
    }
    return params.toString() ? `?${params.toString()}` : "";
  };
  
  // Fetch lanes
  const { data: lanes, isLoading, error } = useQuery<Lane[]>({
    queryKey: ["/api/lanes", filters],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/lanes${queryString}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching lanes: ${response.statusText}`);
      }
      return response.json();
    },
  });
  
  // Initialize bid amounts using useEffect to avoid render loop
  useEffect(() => {
    if (lanes && Object.keys(bidAmounts).length === 0) {
      const initialBidAmounts: Record<number, number> = {};
      lanes.forEach(lane => {
        initialBidAmounts[lane.id] = lane.minBid ? lane.minBid - 5 : 1000;
      });
      setBidAmounts(initialBidAmounts);
    }
  }, [lanes, bidAmounts]);
  
  // Place bid mutation
  const placeBidMutation = useMutation({
    mutationFn: async ({ laneId, amount, comment }: { laneId: number, amount: number, comment?: string }) => {
      // Send comment along with the amount to store in the database
      return apiRequest("POST", `/api/lanes/${laneId}/bids`, { amount, comment });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Bid placed",
        description: "Your bid has been placed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lanes"] });
      setSuccessfulBidLaneId(variables.laneId);
      
      // Reset the success message after 3 seconds
      setTimeout(() => {
        setSuccessfulBidLaneId(null);
      }, 3000);
      
      // Close modal if open
      setIsDetailsModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place bid",
        variant: "destructive",
      });
    },
  });
  
  const handleBidAmountChange = (laneId: number, value: string) => {
    const amount = value ? parseFloat(value) : 0;
    setBidAmounts(prev => ({
      ...prev,
      [laneId]: amount
    }));
  };
  
  const handleBidCommentChange = (laneId: number, value: string) => {
    setBidComments(prev => ({
      ...prev,
      [laneId]: value
    }));
  };
  
  const handleSubmitBid = (laneId: number, e: React.FormEvent) => {
    e.preventDefault();
    const amount = bidAmounts[laneId];
    const comment = bidComments[laneId] || '';
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive"
      });
      return;
    }
    
    placeBidMutation.mutate({ laneId, amount, comment });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const openDetailsModal = (lane: Lane) => {
    setSelectedLane(lane);
    setIsDetailsModalOpen(true);
  };
  
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedLane(null);
  };
  
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if the same column is clicked
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  
  // Sort the lanes based on current sort settings
  const sortedLanes = lanes 
    ? [...lanes].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case "bidName":
            comparison = a.bidName.localeCompare(b.bidName);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "vehicleType":
            comparison = a.vehicleType.localeCompare(b.vehicleType);
            break;
          case "route":
            comparison = `${a.loadingLocation}-${a.unloadingLocation}`.localeCompare(
              `${b.loadingLocation}-${b.unloadingLocation}`
            );
            break;
          case "validUntil":
            comparison = new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
            break;
          case "minBid":
            comparison = (a.minBid || 0) - (b.minBid || 0);
            break;
          default: // id
            comparison = a.id - b.id;
        }
        
        return sortOrder === "asc" ? comparison : -comparison;
      })
    : [];
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading lanes. Please try again.</p>
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
    } else if (status === "ending_soon") {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Ending Soon</Badge>;
    } else {
      return <Badge variant="outline">Archived</Badge>;
    }
  };
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center">
                  ID
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("bidName")}
              >
                <div className="flex items-center">
                  Bid Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("vehicleType")}
              >
                <div className="flex items-center">
                  Vehicle
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("route")}
              >
                <div className="flex items-center">
                  Route
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("validUntil")}
              >
                <div className="flex items-center">
                  Valid Until
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("minBid")}
              >
                <div className="flex items-center">
                  Min Bid
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                </TableRow>
              ))
            ) : sortedLanes && sortedLanes.length > 0 ? (
              sortedLanes.map((lane) => (
                <TableRow key={lane.id} className="hover:bg-gray-50">
                  <TableCell>{lane.id}</TableCell>
                  <TableCell className="font-medium">{lane.bidName}</TableCell>
                  <TableCell>{getStatusBadge(lane.status)}</TableCell>
                  <TableCell>{lane.vehicleType}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">From</span>
                      <span className="font-medium">{lane.loadingLocation}</span>
                      <span className="text-xs text-gray-500 mt-1">To</span>
                      <span className="font-medium">{lane.unloadingLocation}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(lane.validUntil)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {lane.minBid ? `€${lane.minBid.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDetailsModal(lane)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                  No lanes found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lane Details Modal */}
      {selectedLane && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedLane.bidName}</DialogTitle>
              <DialogDescription>Freight Lane ID: {selectedLane.id}</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <div>{getStatusBadge(selectedLane.status)}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Vehicle Type</h3>
                  <div className="flex items-center">
                    <Truck className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{selectedLane.vehicleType}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Loading Location</h3>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                    <span>{selectedLane.loadingLocation}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Unloading Location</h3>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    <span>{selectedLane.unloadingLocation}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Valid Period</h3>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{formatDate(selectedLane.validFrom)} - {formatDate(selectedLane.validUntil)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Created On</h3>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{formatDate(selectedLane.createdAt)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Current Minimum Bid</h3>
                  <p className="text-lg font-bold text-primary">
                    {selectedLane.minBid !== undefined ? `€${selectedLane.minBid.toFixed(2)}` : "No bids yet"}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Bids</h3>
                  <p>{selectedLane.bidCount || 0}</p>
                </div>
              </div>
            </div>
            
            {/* Place Bid Form */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-lg mb-4">Place Your Bid</h3>
              <form onSubmit={(e) => handleSubmitBid(selectedLane.id, e)} className="space-y-4">
                <div>
                  <label htmlFor={`amount-${selectedLane.id}`} className="block text-sm font-medium text-gray-700">
                    Your Bid Amount (EUR)
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">€</span>
                    </div>
                    <Input
                      id={`amount-${selectedLane.id}`}
                      type="number"
                      value={bidAmounts[selectedLane.id] || ""}
                      onChange={(e) => handleBidAmountChange(selectedLane.id, e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      min={0}
                      step={10}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor={`comment-${selectedLane.id}`} className="block text-sm font-medium text-gray-700">
                    Comment (Optional)
                  </label>
                  <Textarea 
                    id={`comment-${selectedLane.id}`}
                    placeholder="Add any notes or special requirements..."
                    className="mt-1"
                    value={bidComments[selectedLane.id] || ""}
                    onChange={(e) => handleBidCommentChange(selectedLane.id, e.target.value)}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDetailsModal}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={placeBidMutation.isPending}
                  >
                    {placeBidMutation.isPending ? "Submitting..." : "Place Bid"}
                  </Button>
                </DialogFooter>
              </form>
              
              {successfulBidLaneId === selectedLane.id && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <div className="flex">
                    <svg
                      className="h-5 w-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Bid successfully placed!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

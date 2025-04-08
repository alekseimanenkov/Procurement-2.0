import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lane, LaneFilters } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface LaneTableProps {
  filters: LaneFilters;
  onEdit: (laneId: number) => void;
  onViewBids: (laneId: number) => void;
}

export default function LaneTable({ filters, onEdit, onViewBids }: LaneTableProps) {
  const [laneToDelete, setLaneToDelete] = useState<number | null>(null);
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
  
  // Delete lane mutation
  const deleteLaneMutation = useMutation({
    mutationFn: async (laneId: number) => {
      return apiRequest("DELETE", `/api/lanes/${laneId}`);
    },
    onSuccess: () => {
      toast({
        title: "Lane deleted",
        description: "The lane has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lanes"] });
      setLaneToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete lane",
        variant: "destructive",
      });
      setLaneToDelete(null);
    },
  });
  
  const handleDeleteLane = (laneId: number) => {
    setLaneToDelete(laneId);
  };
  
  const confirmDelete = () => {
    if (laneToDelete) {
      deleteLaneMutation.mutate(laneToDelete);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-red-500">Error loading lanes. Please try again.</p>
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : lanes && lanes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bid Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min. Bid
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bids
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lanes.map((lane) => (
                  <tr key={lane.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lane.bidName}</div>
                      <div className="text-sm text-gray-500">#{lane.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lane.status === "active" 
                          ? "bg-green-100 text-green-800" 
                          : lane.status === "ending_soon" 
                            ? "bg-yellow-100 text-yellow-800" 
                            : "bg-gray-100 text-gray-800"
                      }`}>
                        {lane.status.charAt(0).toUpperCase() + lane.status.slice(1).replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lane.vehicleType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lane.loadingLocation}</div>
                      <div className="text-sm text-gray-500">→ {lane.unloadingLocation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(lane.validFrom)}</div>
                      <div className="text-sm text-gray-500">to {formatDate(lane.validUntil)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lane.minBid !== undefined ? `€${lane.minBid.toFixed(2)}` : "No bids"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lane.bidCount || 0} bids
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onViewBids(lane.id)}
                        className="text-primary hover:text-blue-700 mr-3"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(lane.id)}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteLane(lane.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No lanes found matching your filters.</p>
          </div>
        )}
      </Card>
      
      <AlertDialog 
        open={laneToDelete !== null} 
        onOpenChange={(open) => !open && setLaneToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lane
              and all associated bids.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLaneMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

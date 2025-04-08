import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Lane } from "@/lib/types";

interface ViewBidsModalProps {
  isOpen: boolean;
  onClose: () => void;
  laneId: number;
}

export default function ViewBidsModal({ isOpen, onClose, laneId }: ViewBidsModalProps) {
  // Fetch lane details
  const { data: lane, isLoading: isLaneLoading } = useQuery<Lane>({
    queryKey: [`/api/lanes/${laneId}`],
    queryFn: async () => {
      const response = await fetch(`/api/lanes/${laneId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching lane: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isOpen && laneId > 0,
  });
  
  // Fetch bids for the lane
  const { data: bids, isLoading: isBidsLoading } = useQuery<Bid[]>({
    queryKey: [`/api/lanes/${laneId}/bids`],
    queryFn: async () => {
      const response = await fetch(`/api/lanes/${laneId}/bids`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching bids: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isOpen && laneId > 0,
  });
  
  const isLoading = isLaneLoading || isBidsLoading;
  
  // Get the current minimum bid amount
  const minBidAmount = bids && bids.length > 0
    ? Math.min(...bids.map(bid => typeof bid.amount === 'string' ? parseFloat(bid.amount) : bid.amount))
    : null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLaneLoading ? (
              <Skeleton className="h-7 w-56" />
            ) : (
              lane ? `Bid History - ${lane.bidName}` : "Bid History"
            )}
          </DialogTitle>
          <DialogDescription>
            {isLaneLoading ? (
              <Skeleton className="h-5 w-32 mt-1" />
            ) : (
              lane ? `Lane #${lane.id}` : "Loading lane details..."
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flow-root">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : bids && bids.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Freight Forwarder
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bid Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bids.map((bid) => {
                    const bidAmount = typeof bid.amount === 'string' ? parseFloat(bid.amount) : bid.amount;
                    const isLowest = minBidAmount === bidAmount;
                    
                    return (
                      <tr key={bid.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bid.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          €{bidAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bid.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {bid.comment || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isLowest 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {isLowest ? "Current Lowest" : "Outbid"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No bids have been placed for this lane yet.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

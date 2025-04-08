import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LaneFilters, Lane } from "@/lib/types";

interface LaneFiltersProps {
  onFilterChange: (filters: LaneFilters) => void;
  filters: LaneFilters;
}

export default function LaneFiltersComponent({ onFilterChange, filters }: LaneFiltersProps) {
  const [status, setStatus] = useState<string>(filters.status || "all");
  const [vehicleType, setVehicleType] = useState<string>(filters.vehicleType || "all");
  const [loadingLocation, setLoadingLocation] = useState<string>(filters.loadingLocation || "all");
  const [unloadingLocation, setUnloadingLocation] = useState<string>(filters.unloadingLocation || "all");
  
  // Fetch all lanes to extract unique locations
  const { data: lanes } = useQuery<Lane[]>({
    queryKey: ["/api/lanes"],
    queryFn: async () => {
      const response = await fetch(`/api/lanes`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Error fetching lanes: ${response.statusText}`);
      }
      return response.json();
    },
  });
  
  // Extract unique locations from lanes
  const loadingLocations = lanes 
    ? Array.from(new Set(lanes.map(lane => lane.loadingLocation)))
    : [];
    
  const unloadingLocations = lanes
    ? Array.from(new Set(lanes.map(lane => lane.unloadingLocation)))
    : [];
  
  // Update component state when filters prop changes
  useEffect(() => {
    setStatus(filters.status || "all");
    setVehicleType(filters.vehicleType || "all");
    setLoadingLocation(filters.loadingLocation || "all");
    setUnloadingLocation(filters.unloadingLocation || "all");
  }, [filters]);
  
  const handleApplyFilters = () => {
    onFilterChange({
      status,
      vehicleType,
      loadingLocation,
      unloadingLocation
    });
  };
  
  const handleReset = () => {
    setStatus("all");
    setVehicleType("all");
    setLoadingLocation("all");
    setUnloadingLocation("all");
    
    onFilterChange({
      status: "all",
      vehicleType: "all",
      loadingLocation: "all",
      unloadingLocation: "all"
    });
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-full md:w-auto">
            <Label className="block text-sm font-medium text-gray-700 mb-1">Status</Label>
            <Select 
              value={status} 
              onValueChange={setStatus}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto">
            <Label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</Label>
            <Select 
              value={vehicleType} 
              onValueChange={setVehicleType}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="40t">40t</SelectItem>
                <SelectItem value="12t">12t</SelectItem>
                <SelectItem value="van">Van</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto">
            <Label className="block text-sm font-medium text-gray-700 mb-1">Loading Location</Label>
            <Select 
              value={loadingLocation} 
              onValueChange={setLoadingLocation}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {loadingLocations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto">
            <Label className="block text-sm font-medium text-gray-700 mb-1">Unloading Location</Label>
            <Select 
              value={unloadingLocation} 
              onValueChange={setUnloadingLocation}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {unloadingLocations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-auto mt-auto flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleApplyFilters}
              className="w-full md:w-auto"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Apply Filters
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="w-full md:w-auto"
            >
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import type { LaneFilters } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/ui/sidebar";
import LaneTable from "@/components/lanes/lane-table";
import LaneCards from "@/components/lanes/lane-cards";
import LaneFiltersComponent from "@/components/lanes/lane-filters";
import CreateLaneModal from "@/components/lanes/create-lane-modal";
import EditLaneModal from "@/components/lanes/edit-lane-modal";
import ViewBidsModal from "@/components/lanes/view-bids-modal";
import UserManagement from "@/components/users/user-management";
import UserList from "@/components/users/user-list";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<LaneFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBidsModalOpen, setIsBidsModalOpen] = useState(false);
  const [selectedLaneId, setSelectedLaneId] = useState<number | null>(null);
  
  // Query for the current user
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: getCurrentUser,
    refetchOnWindowFocus: true,
  });

  // Redirect to login if no user is found
  useEffect(() => {
    if (!isUserLoading && !user) {
      setLocation("/login");
    }
  }, [user, isUserLoading, setLocation]);

  const handleCreateLane = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditLane = (laneId: number) => {
    setSelectedLaneId(laneId);
    setIsEditModalOpen(true);
  };

  const handleViewBids = (laneId: number) => {
    setSelectedLaneId(laneId);
    setIsBidsModalOpen(true);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user as User} />
      
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center md:hidden">
              <button className="text-gray-500 focus:outline-none focus:text-gray-700">
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900 ml-3">Procurement 2.0</h1>
            </div>
            
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-gray-900">Lane Management</h1>
            </div>
            
            <div className="flex items-center">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-48 md:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <svg 
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation - Removed */}
        </header>

        {/* Content based on role */}
        <div className="p-6">
          {user.role === "admin" ? (
            <div className="grid grid-cols-1 gap-6 mb-6">
              {/* Admin Lane Management Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Manage Lanes</h2>
                  <button 
                    onClick={handleCreateLane}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <svg 
                      className="h-5 w-5 mr-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    Create New Lane
                  </button>
                </div>
                
                {/* User Management Section */}
                <div className="mb-6">
                  <UserManagement />
                </div>
                
                <LaneFiltersComponent 
                  onFilterChange={setFilters} 
                  filters={filters}
                />
                
                <LaneTable 
                  filters={filters}
                  onEdit={handleEditLane}
                  onViewBids={handleViewBids}
                />
              </div>
            </div>
          ) : (
            /* Forwarder View */
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Available Lanes for Bidding</h2>
              </div>
              
              <LaneFiltersComponent 
                onFilterChange={setFilters} 
                filters={filters}
              />
              
              <LaneCards 
                filters={filters}
                userId={user.id}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateLaneModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      {selectedLaneId && (
        <>
          <EditLaneModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)}
            laneId={selectedLaneId}
          />
          
          <ViewBidsModal 
            isOpen={isBidsModalOpen} 
            onClose={() => setIsBidsModalOpen(false)}
            laneId={selectedLaneId}
          />
        </>
      )}
    </div>
  );
}

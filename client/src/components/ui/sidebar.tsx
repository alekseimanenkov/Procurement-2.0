import { useState } from "react";
import { useLocation, Link } from "wouter";
import { logout } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";
import { 
  TruckIcon, 
  HistoryIcon,
  LogOutIcon
} from "lucide-react";

interface SidebarProps {
  user: User;
}

export default function Sidebar({ user }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = user.role === 'admin';
  
  const handleLogout = async () => {
    try {
      await logout();
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="w-64 bg-white shadow-md hidden md:block">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Procurement 2.0</h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Management
          </p>
        </div>
        <Link 
          href="/" 
          className={`flex items-center px-6 py-3 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors ${
            location === "/" ? "bg-gray-100 text-primary" : ""
          }`}
        >
          <TruckIcon className="mr-3 h-5 w-5" />
          <span>Lanes</span>
        </Link>
        
        {/* Only show bid history for forwarders */}
        {!isAdmin && (
          <>
            <div className="px-4 mt-6 mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Reports
              </p>
            </div>
            <Link 
              href="/bid-history" 
              className={`flex items-center px-6 py-3 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors ${
                location === "/bid-history" ? "bg-gray-100 text-primary" : ""
              }`}
            >
              <HistoryIcon className="mr-3 h-5 w-5" />
              <span>Bid History</span>
            </Link>
          </>
        )}
        
        <div className="px-4 mt-6 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Account
          </p>
        </div>
        <a 
          onClick={handleLogout}
          className="flex items-center px-6 py-3 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors cursor-pointer"
        >
          <LogOutIcon className="mr-3 h-5 w-5" />
          <span>Logout</span>
        </a>
      </nav>
      
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user.companyName}</p>
            <p className="text-xs text-gray-500">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

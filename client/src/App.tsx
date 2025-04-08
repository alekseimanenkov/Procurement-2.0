import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { getCurrentUser } from "@/lib/auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import BidHistory from "@/pages/bid-history";
import NotFound from "@/pages/not-found";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (location !== "/login" && location !== "/register") {
        const user = await getCurrentUser();
        if (!user && location !== "/") {
          setLocation("/login");
        } else if (location === "/") {
          setLocation("/dashboard");
        }
      }
    };
    
    checkAuth();
  }, [location, setLocation]);
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bid-history" component={BidHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

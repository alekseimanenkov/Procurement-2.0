import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Lane, LaneFormValues } from "@/lib/types";

interface EditLaneModalProps {
  isOpen: boolean;
  onClose: () => void;
  laneId: number;
}

const formSchema = z.object({
  bidName: z.string().min(3, "Bid name must be at least 3 characters"),
  status: z.enum(["active", "archived", "ending_soon"]),
  vehicleType: z.enum(["40t", "12t", "van"]),
  loadingLocation: z.string().min(2, "Loading location is required"),
  unloadingLocation: z.string().min(2, "Unloading location is required"),
  validFrom: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid from date is required",
  }),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid until date is required",
  }),
}).refine(data => {
  const from = new Date(data.validFrom);
  const until = new Date(data.validUntil);
  return from < until;
}, {
  message: "Valid until date must be after valid from date",
  path: ["validUntil"],
});

export default function EditLaneModal({ isOpen, onClose, laneId }: EditLaneModalProps) {
  const { toast } = useToast();
  
  const form = useForm<LaneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bidName: "",
      status: "active",
      vehicleType: "40t",
      loadingLocation: "",
      unloadingLocation: "",
      validFrom: "",
      validUntil: "",
    },
  });
  
  // Fetch lane data
  const { data: lane, isLoading, error } = useQuery<Lane>({
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
  
  // Set form values when lane data is loaded
  useEffect(() => {
    if (lane) {
      form.reset({
        bidName: lane.bidName,
        status: lane.status,
        vehicleType: lane.vehicleType,
        loadingLocation: lane.loadingLocation,
        unloadingLocation: lane.unloadingLocation,
        validFrom: new Date(lane.validFrom).toISOString().split('T')[0],
        validUntil: new Date(lane.validUntil).toISOString().split('T')[0],
      });
    }
  }, [lane, form]);
  
  const updateLaneMutation = useMutation({
    mutationFn: async (values: LaneFormValues) => {
      return apiRequest("PUT", `/api/lanes/${laneId}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Lane updated",
        description: "The lane has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lanes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/lanes/${laneId}`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lane",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: LaneFormValues) {
    // Convert string dates to proper date objects
    const formattedValues = {
      ...values,
      validFrom: new Date(values.validFrom).toISOString(),
      validUntil: new Date(values.validUntil).toISOString()
    };
    
    updateLaneMutation.mutate(formattedValues);
  }
  
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Failed to load lane data. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lane</DialogTitle>
          <DialogDescription>
            Update the details for this lane.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="bidName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bid Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter bid name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="ending_soon">Ending Soon</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="40t">40t</SelectItem>
                          <SelectItem value="12t">12t</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="loadingLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loading Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter loading location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unloadingLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unloading Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter unloading location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={updateLaneMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateLaneMutation.isPending}
                >
                  {updateLaneMutation.isPending ? "Updating..." : "Update Lane"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

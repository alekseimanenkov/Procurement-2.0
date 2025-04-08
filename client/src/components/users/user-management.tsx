import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateUserModal from "./create-user-modal";
import { PlusCircle } from "lucide-react";

export default function UserManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage freight forwarder accounts</CardDescription>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          As an administrator, you can create new freight forwarder accounts that can participate in bidding for lanes.
        </p>
      </CardContent>

      <CreateUserModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </Card>
  );
}
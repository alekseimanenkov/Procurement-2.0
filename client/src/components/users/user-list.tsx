import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@/lib/types';

export default function UserList() {
  // Query for all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    refetchOnWindowFocus: true,
  });

  // Show loading state while users are being fetched
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Freight Forwarders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter only forwarder users
  const forwarders = users?.filter((user: User) => user.role === 'forwarder') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freight Forwarders</CardTitle>
      </CardHeader>
      <CardContent>
        {forwarders.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No freight forwarders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forwarders.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.companyName}</TableCell>
                    <TableCell>{user.password}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {user.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
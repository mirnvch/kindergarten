import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { getInitials } from "@/lib/utils";
import { UserActions } from "@/components/admin/user-actions";

interface SearchParams {
  search?: string;
  role?: string;
  status?: string;
  page?: string;
}

async function getUsers(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (searchParams.search) {
    where.OR = [
      { firstName: { contains: searchParams.search, mode: "insensitive" } },
      { lastName: { contains: searchParams.search, mode: "insensitive" } },
      { email: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  if (searchParams.role) {
    where.role = searchParams.role;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  };
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "DAYCARE_OWNER":
      return "default";
    case "DAYCARE_STAFF":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { users, total, page, totalPages } = await getUsers(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage all platform users ({total} total)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <form className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search users..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
              <select
                name="role"
                defaultValue={params.role}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Roles</option>
                <option value="PARENT">Parent</option>
                <option value="DAYCARE_OWNER">Daycare Owner</option>
                <option value="DAYCARE_STAFF">Daycare Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-green-600">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user._count.bookings}</TableCell>
                    <TableCell>{user._count.reviews}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <UserActions userId={user.id} userRole={user.role} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  asChild
                >
                  <Link
                    href={`/admin/users?page=${page - 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.role ? `&role=${params.role}` : ""}`}
                  >
                    Previous
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  asChild
                >
                  <Link
                    href={`/admin/users?page=${page + 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.role ? `&role=${params.role}` : ""}`}
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

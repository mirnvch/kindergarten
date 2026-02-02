import Link from "next/link";
import { Search, Filter, MessageSquare, Archive, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { MessageActions } from "@/components/admin/message-actions";

interface SearchParams {
  search?: string;
  status?: string;
  page?: string;
}

async function getThreads(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || "1");
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (searchParams.search) {
    where.OR = [
      { subject: { contains: searchParams.search, mode: "insensitive" } },
      { provider: { name: { contains: searchParams.search, mode: "insensitive" } } },
    ];
  }

  if (searchParams.status === "archived") {
    where.isArchived = true;
  } else if (searchParams.status === "active") {
    where.isArchived = false;
  }

  const [threads, total, stats] = await Promise.all([
    db.messageThread.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { lastMessageAt: "desc" },
      include: {
        provider: { select: { name: true, slug: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    }),
    db.messageThread.count({ where }),
    Promise.all([
      db.messageThread.count({ where: { isArchived: false } }),
      db.messageThread.count({ where: { isArchived: true } }),
    ]),
  ]);

  return {
    threads,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
    activeCount: stats[0],
    archivedCount: stats[1],
  };
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { threads, total, page, totalPages, activeCount, archivedCount } =
    await getThreads(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            View and moderate message threads ({total} total)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={params.status === undefined ? "ring-2 ring-primary" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/messages" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Threads</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "active" ? "ring-2 ring-green-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/messages?status=active" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                </div>
                <Inbox className="h-8 w-8 text-green-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className={params.status === "archived" ? "ring-2 ring-gray-500" : ""}>
          <CardContent className="pt-6">
            <Link href="/admin/messages?status=archived" className="block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Archived</p>
                  <p className="text-2xl font-bold text-gray-600">{archivedCount}</p>
                </div>
                <Archive className="h-8 w-8 text-gray-600" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <form className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search threads..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
              <select
                name="status"
                defaultValue={params.status}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Threads</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              {(params.search || params.status) && (
                <Button variant="ghost" asChild>
                  <Link href="/admin/messages">Clear</Link>
                </Button>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thread</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {threads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No message threads found
                  </TableCell>
                </TableRow>
              ) : (
                threads.map((thread) => {
                  const lastMessage = thread.messages[0];
                  return (
                    <TableRow key={thread.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium">
                            {thread.subject || "No Subject"}
                          </p>
                          {lastMessage && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              <span className="font-medium">
                                {lastMessage.sender.firstName}:
                              </span>{" "}
                              {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/provider/${thread.provider.slug}`}
                          className="text-sm hover:underline"
                          target="_blank"
                        >
                          {thread.provider.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{thread._count.messages}</Badge>
                      </TableCell>
                      <TableCell>
                        {thread.isArchived ? (
                          <Badge variant="outline" className="text-gray-600">
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <MessageActions
                          threadId={thread.id}
                          isArchived={thread.isArchived}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
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
                <Button variant="outline" size="sm" disabled={page <= 1} asChild>
                  <Link
                    href={`/admin/messages?page=${page - 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}`}
                  >
                    Previous
                  </Link>
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
                  <Link
                    href={`/admin/messages?page=${page + 1}${
                      params.search ? `&search=${params.search}` : ""
                    }${params.status ? `&status=${params.status}` : ""}`}
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

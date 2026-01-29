"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Check, Trash2, MessageSquare, Calendar, Star, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/server/actions/notifications";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}

const typeIcons: Record<string, typeof Bell> = {
  booking_confirmed: Calendar,
  booking_cancelled: Calendar,
  booking_reminder: Calendar,
  message_received: MessageSquare,
  review_received: Star,
  review_response: Star,
  enrollment_status: UserPlus,
  welcome: Bell,
};

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    const data = await getNotifications(10);
    setNotifications(data as Notification[]);
    setUnreadCount(data.filter((n) => !n.readAt).length);
  };

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteNotification(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.readAt) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });
  };

  const getIcon = (type: string) => {
    const Icon = typeIcons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-default",
                  !notification.readAt && "bg-muted/50"
                )}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex w-full items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-1.5",
                      !notification.readAt ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.readAt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(notification.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

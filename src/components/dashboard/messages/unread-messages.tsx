// src/components/dashboard/unread-messages.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUnreadContactMessages } from "@/app/actions/contact/get-unread-contact-messages";
import { updateContactMessageStatus } from "@/app/actions/contact/update-contact-message-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  inquiry_type: string;
  status: string;
};

export function UnreadMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    const results = await getUnreadContactMessages({ page: 1, limit: 10 });
    setMessages(results.data);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unread":
        return "bg-blue-500";
      case "read":
        return "bg-green-500";
      case "replied":
        return "bg-purple-500";
      case "archived":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      await updateContactMessageStatus(id, "read");
      await fetchMessages();
      // Notify header to refresh unread count
      window.dispatchEvent(new Event("messageStatusUpdated"));
      router.refresh();
    } catch (err) {
      console.error("Failed to mark as read", err);
      setError("Failed to update message. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Latest Unread Messages</h2>
          <p className="text-sm text-muted-foreground">
            Showing the 10 most recent unread messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchMessages()}>
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/admin/messages">All Messages</a>
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Subject</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length > 0 ? (
              messages.map((message) => (
                <TableRow
                  key={message.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/dashboard/admin/messages/${message.id}`)
                  }
                >
                  <TableCell className="font-medium">{message.name}</TableCell>
                  <TableCell>{message.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {message.subject}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {message.inquiry_type}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(message.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(message.status)}>
                      {message.status.charAt(0).toUpperCase() +
                        message.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(message.id);
                      }}
                      disabled={loadingId === message.id}
                    >
                      {loadingId === message.id ? "Marking..." : "Mark as Read"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No unread messages 🎉
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

//src/components/dashboard/messages/messages-table.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash,
  MailCheck,
  MailX,
} from "lucide-react";
import { getAllContactMessages } from "@/app/actions/contact/get-all-contact-messages";
import { useRouter } from "next/navigation";
import { deleteContactMessages } from "@/app/actions/contact/delete-contact-messages";
import { updateContactMessageStatus } from "@/app/actions/contact/update-contact-message-status";

// Define the message type based on the provided schema
type Message = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  inquiry_type: string;
  created_at: string;
  status: string;
};

export function MessagesTable() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Message | null;
    direction: "ascending" | "descending";
  }>({
    key: "created_at",
    direction: "descending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const messagesPerPage = 10;
  const fetchMessages = async () => {
    const { data, total } = await getAllContactMessages({
      page: 1,
      limit: 10,
    });
    setMessages(data);
    setSelectedIds((prev) =>
      prev.filter((id) => data.some((m) => m.id === id))
    );
    console.log(total);
  };

  // Load mock data
  useEffect(() => {
    fetchMessages();
  }, []);

  // Handle sorting
  const requestSort = (key: keyof Message) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort messages
  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      searchTerm === "" ||
      Object.values(message).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === "all" || message.status === statusFilter;
    const matchesType =
      typeFilter === "all" || message.inquiry_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null) return sortConfig.direction === "ascending" ? -1 : 1;
    if (bValue === null) return sortConfig.direction === "ascending" ? 1 : -1;

    if (aValue < bValue) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = sortedMessages.slice(
    indexOfFirstMessage,
    indexOfLastMessage
  );
  const totalPages = Math.ceil(sortedMessages.length / messagesPerPage);

  const isAllCurrentSelected =
    currentMessages.length > 0 &&
    currentMessages.every((msg) => selectedIds.includes(msg.id));

  const toggleSelectAllCurrent = (checked: boolean) => {
    if (checked) {
      const idsToAdd = currentMessages
        .map((msg) => msg.id)
        .filter((id) => !selectedIds.includes(id));
      setSelectedIds([...selectedIds, ...idsToAdd]);
    } else {
      const remaining = selectedIds.filter(
        (id) => !currentMessages.some((msg) => msg.id === id)
      );
      setSelectedIds(remaining);
    }
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((existing) => existing !== id)
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected message${
        selectedIds.length > 1 ? "s" : ""
      }?`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    setActionError(null);
    try {
      await deleteContactMessages(selectedIds);
      await fetchMessages();
      // Notify header to refresh unread count
      window.dispatchEvent(new Event("messageStatusUpdated"));
    } catch (error) {
      console.error("Failed to delete selected messages", error);
      setActionError("Failed to delete selected messages. Please try again.");
    } finally {
      setBulkDeleting(false);
      setSelectedIds([]);
    }
  };

  const handleDeleteOneClick = (id: string, name: string) => {
    setMessageToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteOne = async () => {
    if (!messageToDelete) return;

    const id = messageToDelete.id;
    setDeletingIds((prev) => [...prev, id]);
    setActionError(null);
    try {
      await deleteContactMessages([id]);
      await fetchMessages();
      // Notify header to refresh unread count (in case deleted message was unread)
      window.dispatchEvent(new Event("messageStatusUpdated"));
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error("Failed to delete message", error);
      setActionError("Failed to delete message. Please try again.");
    } finally {
      setDeletingIds((prev) => prev.filter((existing) => existing !== id));
    }
  };

  const handleToggleReadStatus = async (
    e: React.MouseEvent,
    messageId: string,
    currentStatus: string
  ) => {
    e.stopPropagation(); // Prevent row click navigation
    if (currentStatus !== "read" && currentStatus !== "unread") return;

    setUpdatingStatusIds((prev) => [...prev, messageId]);
    setActionError(null);

    const nextStatus = currentStatus === "read" ? "unread" : "read";

    try {
      await updateContactMessageStatus(
        messageId,
        nextStatus as "read" | "unread"
      );
      // Update local state optimistically
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: nextStatus } : msg
        )
      );
      // Notify header to refresh unread count
      window.dispatchEvent(new Event("messageStatusUpdated"));
    } catch (error) {
      console.error("Failed to update message status", error);
      setActionError("Failed to update message status. Please try again.");
    } finally {
      setUpdatingStatusIds((prev) =>
        prev.filter((existing) => existing !== messageId)
      );
    }
  };

  // Get status badge color
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

  // Format date
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => setTypeFilter(value)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Partnership">Partnership</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                Clear Status Filter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                Clear Type Filter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("")}>
                Clear Search
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} selected
        </p>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleDeleteSelected}
            >
              {bulkDeleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        )}
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the message from{" "}
              {messageToDelete?.name}? This action cannot be undone and the
              message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                messageToDelete
                  ? deletingIds.includes(messageToDelete.id)
                  : false
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOne}
              disabled={
                messageToDelete
                  ? deletingIds.includes(messageToDelete.id)
                  : false
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {messageToDelete && deletingIds.includes(messageToDelete.id)
                ? "Deleting..."
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={isAllCurrentSelected}
                  onCheckedChange={(checked) =>
                    toggleSelectAllCurrent(Boolean(checked))
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead
                className="w-[180px] cursor-pointer"
                onClick={() => requestSort("name")}
              >
                Name
                {sortConfig.key === "name" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => requestSort("email")}
              >
                Email
                {sortConfig.key === "email" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer"
                onClick={() => requestSort("subject")}
              >
                Subject
                {sortConfig.key === "subject" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer"
                onClick={() => requestSort("inquiry_type")}
              >
                Type
                {sortConfig.key === "inquiry_type" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer"
                onClick={() => requestSort("created_at")}
              >
                Date
                {sortConfig.key === "created_at" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => requestSort("status")}
              >
                Status
                {sortConfig.key === "status" &&
                  (sortConfig.direction === "ascending" ? (
                    <ChevronUp className="ml-2 h-4 w-4 inline" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4 inline" />
                  ))}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentMessages.length > 0 ? (
              currentMessages.map((message) => (
                <TableRow
                  key={message.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/dashboard/admin/messages/${message.id}`)
                  }
                >
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="w-[40px]"
                  >
                    <Checkbox
                      checked={selectedIds.includes(message.id)}
                      onCheckedChange={(checked) =>
                        toggleSelectOne(message.id, Boolean(checked))
                      }
                      aria-label={`Select message from ${message.name}`}
                    />
                  </TableCell>
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getStatusColor(message.status)} ${
                          (message.status === "read" ||
                            message.status === "unread") &&
                          !updatingStatusIds.includes(message.id)
                            ? "cursor-pointer hover:opacity-80 transition-opacity"
                            : ""
                        }`}
                        onClick={(e) =>
                          handleToggleReadStatus(e, message.id, message.status)
                        }
                      >
                        {updatingStatusIds.includes(message.id) ? (
                          "..."
                        ) : (
                          <>
                            {message.status === "read" && (
                              <MailCheck className="mr-1 h-3 w-3 inline" />
                            )}
                            {message.status === "unread" && (
                              <MailX className="mr-1 h-3 w-3 inline" />
                            )}
                            {message.status.charAt(0).toUpperCase() +
                              message.status.slice(1)}
                          </>
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-right space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        handleDeleteOneClick(message.id, message.name)
                      }
                      disabled={deletingIds.includes(message.id)}
                    >
                      {deletingIds.includes(message.id) ? (
                        "..."
                      ) : (
                        <Trash className="h-4 w-4 cursor-pointer" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No messages found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {indexOfFirstMessage + 1}-
          {Math.min(indexOfLastMessage, sortedMessages.length)} of{" "}
          {sortedMessages.length} messages
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

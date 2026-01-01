"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Building,
  Mail,
  User,
  Calendar,
  MessageSquare,
  MailCheck,
  MailX,
  Trash,
} from "lucide-react";
import { getContactMessageById } from "@/app/actions/contact/get-contact-message-by-id";
import { updateContactMessageStatus } from "@/app/actions/contact/update-contact-message-status";
import { deleteContactMessage } from "@/app/actions/contact/delete-contact-message";
import { sendContactMessageReply } from "@/app/actions/contact/send-contact-message-reply";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      const id = params.id as string;
      if (id) {
        setLoading(true);
        const data = await getContactMessageById(id);
        setMessage(data);
        setLoading(false);
      }
    };
    fetchMessage();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container py-10">
        <div className="text-center">Loading message...</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Message not found</h1>
        <Button onClick={() => router.push("/dashboard/admin/messages")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Messages
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
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

  const handleToggleStatus = async () => {
    if (!message) return;

    setStatusUpdating(true);
    setActionError(null);

    const nextStatus = message.status === "read" ? "unread" : "read";

    try {
      await updateContactMessageStatus(message.id, nextStatus);
      setMessage((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      // Notify header to refresh unread count
      window.dispatchEvent(new Event("messageStatusUpdated"));
      router.refresh();
    } catch (error) {
      console.error("Failed to update message status", error);
      setActionError("Failed to update message status. Please try again.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!message) return;

    setDeleting(true);
    setActionError(null);

    try {
      await deleteContactMessage(message.id);
      router.push("/dashboard/admin/messages");
    } catch (error) {
      console.error("Failed to delete message", error);
      setActionError("Failed to delete message. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSendReply = async () => {
    if (!message || !reply.trim()) return;

    setSendingReply(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await sendContactMessageReply({
        messageId: message.id,
        toEmail: message.email,
        toName: message.name,
        originalSubject: message.subject,
        originalMessage: message.message,
        replyText: reply.trim(),
      });

      setActionSuccess("Reply sent successfully!");
      setReply("");
      // Refresh message to update status
      const updatedMessage = await getContactMessageById(message.id);
      if (updatedMessage) {
        setMessage(updatedMessage);
      }
      // Notify header to refresh unread count (status changed to "replied")
      window.dispatchEvent(new Event("messageStatusUpdated"));
      router.refresh();
    } catch (error) {
      console.error("Failed to send reply", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to send reply. Please try again."
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleCancelReply = () => {
    setReply("");
    setActionError(null);
    setActionSuccess(null);
  };

  return (
    <div className="container py-10">
      <Button
        onClick={() => router.push("/dashboard/admin/messages")}
        variant="outline"
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Messages
      </Button>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{message.subject}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(message.status)}>
                {message.status.charAt(0).toUpperCase() +
                  message.status.slice(1)}
              </Badge>
              <span className="text-muted-foreground">
                {message.inquiry_type}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              disabled={statusUpdating || deleting}
            >
              {statusUpdating ? (
                "Updating..."
              ) : message.status === "read" ? (
                <>
                  <MailX className="mr-2 h-4 w-4" />
                  Mark as Unread
                </>
              ) : (
                <>
                  <MailCheck className="mr-2 h-4 w-4" />
                  Mark as Read
                </>
              )}
            </Button>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={deleting || statusUpdating}
                >
                  <Trash className="mr-2 h-4 w-4 cursor-pointer" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The message will be
                    permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {actionError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{actionError}</p>
          </div>
        )}
        {actionSuccess && (
          <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {actionSuccess}
            </p>
          </div>
        )}

        <div className="grid gap-4 border rounded-lg p-6">
          <div className="grid grid-cols-[20px_1fr] items-start gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{message.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-[20px_1fr] items-start gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p>{message.email}</p>
            </div>
          </div>

          {message.company && (
            <div className="grid grid-cols-[20px_1fr] items-start gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p>{message.company}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-[20px_1fr] items-start gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p>{formatDate(message.created_at)}</p>
            </div>
          </div>

          <hr />

          <div className="grid grid-cols-[20px_1fr] items-start gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div className="px-4">
              <p className="whitespace-pre-wrap">{message.message}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Reply</h2>
          <Textarea
            placeholder="Type your reply here..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={6}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancelReply}
              disabled={sendingReply}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!reply.trim() || sendingReply}
            >
              {sendingReply ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

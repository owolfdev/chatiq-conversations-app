"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Building, Mail, User, Calendar, MessageSquare } from "lucide-react"

type Message = {
  id: string
  name: string
  email: string
  company: string | null
  subject: string
  message: string
  inquiry_type: string
  created_at: string
  status: string
}

interface MessageDetailProps {
  message: Message | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (id: string, status: string) => void
}

export function MessageDetail({ message, open, onOpenChange, onStatusChange }: MessageDetailProps) {
  const [reply, setReply] = useState("")

  if (!message) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unread":
        return "bg-blue-500"
      case "read":
        return "bg-green-500"
      case "replied":
        return "bg-purple-500"
      case "archived":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleStatusChange = (status: string) => {
    if (onStatusChange) {
      onStatusChange(message.id, status)
    }
  }

  const handleSendReply = () => {
    // In a real app, this would send the reply
    if (reply.trim() && onStatusChange) {
      onStatusChange(message.id, "replied")
      setReply("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{message.subject}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge className={getStatusColor(message.status)}>
              {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
            </Badge>
            <span className="text-muted-foreground">{message.inquiry_type}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

          <div className="grid grid-cols-[20px_1fr] items-start gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="whitespace-pre-wrap">{message.message}</p>
            </div>
          </div>

          <div className="pt-4">
            <h4 className="mb-2 font-medium">Reply</h4>
            <Textarea
              placeholder="Type your reply here..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleStatusChange("read")} disabled={message.status === "read"}>
              Mark as Read
            </Button>
            <Button
              variant="outline"
              onClick={() => handleStatusChange("archived")}
              disabled={message.status === "archived"}
            >
              Archive
            </Button>
          </div>
          <Button onClick={handleSendReply} disabled={!reply.trim()}>
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

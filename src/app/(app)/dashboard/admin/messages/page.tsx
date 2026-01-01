import { MessagesTable } from "@/components/dashboard/messages/messages-table";

export default function MessagesPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <MessagesTable />
    </div>
  );
}

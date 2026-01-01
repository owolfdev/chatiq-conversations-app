"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FileText,
  Upload,
  Search,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  FolderOpen,
  Pencil,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { EmbeddingQueueWidget } from "@/components/dashboard/documents/embedding-queue-widget";
import { UrlCrawlerTree } from "@/components/documents/url-crawler-tree";
import type { PlanId } from "@/lib/teams/usage";

interface DocumentMeta {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  is_global: boolean;
  is_flagged: boolean;
  canonical_url?: string | null;
  name: string;
  size: string;
  uploadDate: string;
  pages: number;
  status: string;
  chatbots: string[];
  ownership: "team" | "personal";
}

interface DocumentsClientProps {
  initialTeamDocuments: DocumentMeta[];
  initialPersonalDocuments: DocumentMeta[];
  teamName: string | null;
  documentLimit: number | null;
  plan: PlanId;
}

function DocumentActions({
  doc,
  onDelete,
}: {
  doc: DocumentMeta;
  onDelete: (doc: DocumentMeta) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/documents/${doc.id}`}
            className="flex items-center"
          >
            <Eye className="h-4 w-4 mr-2" /> Preview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/documents/edit/${doc.id}`}
            className="flex items-center"
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download className="h-4 w-4 mr-2" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DocumentsClient({
  initialTeamDocuments,
  initialPersonalDocuments,
  teamName,
  documentLimit,
  plan,
}: DocumentsClientProps) {
  const [teamDocuments, setTeamDocuments] =
    useState<DocumentMeta[]>(initialTeamDocuments);
  const [personalDocuments, setPersonalDocuments] = useState<DocumentMeta[]>(
    initialPersonalDocuments
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBot, setSelectedBot] = useState("all");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [docPendingDelete, setDocPendingDelete] = useState<DocumentMeta | null>(
    null
  );
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [selectedTeamDocs, setSelectedTeamDocs] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setTeamDocuments(initialTeamDocuments);
  }, [initialTeamDocuments]);

  useEffect(() => {
    setPersonalDocuments(initialPersonalDocuments);
  }, [initialPersonalDocuments]);

  useEffect(() => {
    setSelectedTeamDocs((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(teamDocuments.map((doc) => doc.id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next;
    });
  }, [teamDocuments]);

  const botOptions = useMemo(() => {
    const names = new Set<string>();
    [...teamDocuments, ...personalDocuments].forEach((doc) =>
      doc.chatbots.forEach((name) => names.add(name))
    );
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [teamDocuments, personalDocuments]);

  const filterDocuments = (docs: DocumentMeta[]) =>
    docs.filter((doc) => {
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesBot =
        selectedBot === "all"
          ? true
          : selectedBot === "unlinked"
          ? !doc.is_global && doc.chatbots.length === 0
          : doc.is_global || doc.chatbots.includes(selectedBot);
      return matchesSearch && matchesBot;
    });

  const filteredTeamDocuments = useMemo(
    () => filterDocuments(teamDocuments),
    [teamDocuments, selectedBot, searchQuery]
  );

  const filteredPersonalDocuments = useMemo(
    () => filterDocuments(personalDocuments),
    [personalDocuments, selectedBot, searchQuery]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
        return "bg-green-600";
      case "Processing":
        return "bg-yellow-600";
      case "Failed":
        return "bg-red-600";
      default:
        return "bg-zinc-600";
    }
  };

  const getFileIcon = () => <FileText className="h-5 w-5 text-emerald-500" />;

  const confirmDelete = (doc: DocumentMeta) => {
    setDeleteError(null);
    setDocPendingDelete(doc);
    setConfirmOpen(true);
  };

  const toggleTeamDoc = (docId: string) => {
    setSelectedTeamDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const selectAllTeamDocs = () => {
    setSelectedTeamDocs(new Set(filteredTeamDocuments.map((doc) => doc.id)));
  };

  const clearSelectedTeamDocs = () => {
    setSelectedTeamDocs(new Set());
  };

  const handleDelete = async (target: DocumentMeta) => {
    setDeleteError(null);
    setDeleteStatus(`Deleting "${target.name}"...`);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${target.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = "Failed to delete document.";
        try {
          const body = await response.json();
          if (body?.message && typeof body.message === "string") {
            message = body.message;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      startTransition(() => {
        if (target.ownership === "team") {
          setTeamDocuments((docs) =>
            docs.filter((doc) => doc.id !== target.id)
          );
        } else {
          setPersonalDocuments((docs) =>
            docs.filter((doc) => doc.id !== target.id)
          );
        }
      });
      setDeleteStatus(`Deleted "${target.name}".`);
    } catch (error) {
      console.error("[documents:delete]", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete document."
      );
      setDeleteStatus(null);
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
      setDocPendingDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeamDocs.size === 0) {
      setBulkConfirmOpen(false);
      return;
    }

    setDeleteError(null);
    setDeleteStatus(`Deleting ${selectedTeamDocs.size} documents...`);
    setIsLoading(true);
    try {
      for (const docId of selectedTeamDocs) {
        const response = await fetch(`/api/documents/${docId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          let message = "Failed to delete document.";
          try {
            const body = await response.json();
            if (body?.message && typeof body.message === "string") {
              message = body.message;
            }
          } catch {
            // ignore parse errors
          }
          throw new Error(message);
        }
      }

      const deletedIds = new Set(selectedTeamDocs);
      startTransition(() => {
        setTeamDocuments((docs) =>
          docs.filter((doc) => !deletedIds.has(doc.id))
        );
      });
      clearSelectedTeamDocs();
      setDeleteStatus(`Deleted ${deletedIds.size} documents.`);
    } catch (error) {
      console.error("[documents:bulk-delete]", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete documents."
      );
      setDeleteStatus(null);
    } finally {
      setIsLoading(false);
      setBulkConfirmOpen(false);
    }
  };

  const totalDocuments = teamDocuments.length + personalDocuments.length;
  const canCrawl = plan !== "free";
  const documentLimitLabel =
    documentLimit === null ? "Unlimited" : documentLimit.toLocaleString();
  const documentUsagePercent =
    documentLimit === null || documentLimit === 0
      ? 0
      : Math.min((totalDocuments / documentLimit) * 100, 100);
  const selectedTeamCount = selectedTeamDocs.size;
  const teamHeaderActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={selectAllTeamDocs}
        disabled={filteredTeamDocuments.length === 0}
      >
        Select all
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearSelectedTeamDocs}
        disabled={selectedTeamCount === 0}
      >
        Clear
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setBulkConfirmOpen(true)}
        disabled={selectedTeamCount === 0 || isLoading}
      >
        Delete selected ({selectedTeamCount})
      </Button>
    </div>
  );

  const renderSection = (
    title: string,
    description: string,
    documents: DocumentMeta[],
    emptyMessage: string,
    options?: {
      headerActions?: ReactNode;
      showSelection?: boolean;
    }
  ) => (
    <Card>
      <CardHeader className={options?.headerActions ? "space-y-4" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {options?.headerActions}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Loading documents...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto mb-4 h-16 w-16 text-zinc-400" />
            <h3 className="text-xl font-semibold mb-2">No documents found</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              {emptyMessage}
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              asChild
            >
              <Link href="/dashboard/documents/new">
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  {options?.showSelection && (
                    <Checkbox
                      checked={selectedTeamDocs.has(doc.id)}
                      onCheckedChange={() => toggleTeamDoc(doc.id)}
                      className="mt-1"
                    />
                  )}
                  {getFileIcon()}
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{doc.size}</span>
                      <span>{doc.pages} pages</span>
                      <span>Uploaded {doc.uploadDate}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {doc.canonical_url && (
                        <a
                          href={doc.canonical_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          View source
                        </a>
                      )}
                      {doc.is_global && (
                        <Badge variant="outline" className="text-xs">
                          Global
                        </Badge>
                      )}
                      {doc.chatbots.length > 0 && (
                        <div className="flex gap-1">
                          {doc.chatbots.map((chatbot) => (
                            <Badge
                              key={chatbot}
                              variant="secondary"
                              className="text-xs"
                            >
                              {chatbot}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!doc.is_global && doc.chatbots.length === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Not linked
                        </Badge>
                      )}
                      {doc.is_flagged && (
                        <Badge
                          variant="destructive"
                          className="text-xs flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                  <DocumentActions doc={doc} onDelete={confirmDelete} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const flaggedDocuments = [
    ...teamDocuments.filter((d) => d.is_flagged),
    ...personalDocuments.filter((d) => d.is_flagged),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {deleteError && (
        <Alert variant="destructive">
          <AlertTitle>Deletion failed</AlertTitle>
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}
      {deleteStatus && (
        <Alert>
          <AlertTitle>Document deletion</AlertTitle>
          <AlertDescription>{deleteStatus}</AlertDescription>
        </Alert>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the document and its embeddings. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => docPendingDelete && handleDelete(docPendingDelete)}
              disabled={isLoading}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedTeamCount} documents and their
              embeddings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isLoading || selectedTeamCount === 0}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {flaggedDocuments.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Content Moderation Alert</AlertTitle>
          <AlertDescription>
            {flaggedDocuments.length} document
            {flaggedDocuments.length > 1 ? "s have" : " has"} been flagged by
            our content moderation system. Flagged documents are excluded from
            AI retrieval and will not appear in chat responses.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Document Library</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {teamName
              ? `Manage documents for ${teamName} and your personal workspace.`
              : "Separate views for team-wide and personal knowledge bases. Switch teams from the header to view different workspaces."}
          </p>
          {teamName && (
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {teamName}
              </Badge>
            </div>
          )}
        </div>
        <Link href="/dashboard/documents/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
            <Plus className="mr-2 h-4 w-4" /> New Document
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {totalDocuments}
              {documentLimit === null ? "" : `/${documentLimitLabel}`} documents
              used
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${documentUsagePercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <EmbeddingQueueWidget />

      <UrlCrawlerTree
        isEnabled={canCrawl}
        documentLimit={documentLimit}
        currentDocuments={totalDocuments}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBot} onValueChange={setSelectedBot}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by bot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bots</SelectItem>
            <SelectItem value="unlinked">Unlinked</SelectItem>
            {botOptions.map((bot) => (
              <SelectItem key={bot} value={bot}>
                {bot}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderSection(
        teamName ? `${teamName} documents` : "Team documents",
        teamName
          ? `Shared documents for ${teamName}. All team members can access these documents.`
          : "Shared documents for your active team. Switch teams from the header to view different workspaces.",
        filteredTeamDocuments,
        teamName
          ? `No documents in ${teamName} yet. Upload a document to make it available to everyone on your team.`
          : "No team documents yet. Switch teams from the header or upload a document to get started.",
        {
          headerActions: teamHeaderActions,
          showSelection: true,
        }
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {renderSection(
        "Personal documents",
        "Your personal documents that are only visible to you. These documents are separate from your team workspace.",
        filteredPersonalDocuments,
        "Nothing here yet. Upload a reference file or paste raw context to start experimenting in your personal workspace."
      )}
    </div>
  );
}

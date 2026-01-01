# Document Deletion Verification

To confirm the hard-delete workflow removes all artefacts:

1. Upload or create a document, ensuring it is linked to at least one bot so chunks/embeddings are produced.
2. Trigger ingest (edit the document or run `/api/documents/ingest`) so `bot_doc_chunks`, `bot_embeddings`, and `bot_embedding_jobs` contain rows for the document.
3. Delete the document from the dashboard UI. The client calls `DELETE /api/documents/:id`, which runs the `deleteDocumentHard` helper.
4. In Supabase SQL editor (or psql), run:
   ```sql
   -- Replace with the document UUID you deleted
   select count(*) from bot_documents where id = '...';
   select count(*) from bot_doc_chunks where document_id = '...';
   select count(*) from bot_embeddings where chunk_id in (
     select id from bot_doc_chunks where document_id = '...'
   );
   select count(*) from bot_embedding_jobs where chunk_id in (
     select id from bot_doc_chunks where document_id = '...'
   );
   select count(*) from bot_conversations
     where context_chunk_ids ?| array[
       -- chunk ids removed above
     ];
   select count(*) from bot_audit_log
     where resource_type = 'document' and resource_id = '...';
   ```
   All counts should be `0`.
5. If the document referenced a Supabase Storage object, delete it manually for now (no storage keys are recorded yet). Once storage paths are tracked, wire the helper to remove the corresponding object.

Because cascades clear rows immediately, removals happen synchronously—no background workers are required beyond the existing embedding worker catching orphaned jobs (which are now deleted directly).


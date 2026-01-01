-- Add language metadata for documents and chunks (minimal, non-breaking)

ALTER TABLE bot_documents
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS language_confidence double precision,
  ADD COLUMN IF NOT EXISTS language_override text,
  ADD COLUMN IF NOT EXISTS translation_group_id text;

ALTER TABLE bot_doc_chunks
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS language_confidence double precision,
  ADD COLUMN IF NOT EXISTS language_override text;

CREATE INDEX IF NOT EXISTS idx_bot_documents_language ON bot_documents(language);
CREATE INDEX IF NOT EXISTS idx_bot_documents_translation_group_id ON bot_documents(translation_group_id);
CREATE INDEX IF NOT EXISTS idx_bot_doc_chunks_language ON bot_doc_chunks(language);

COMMENT ON COLUMN bot_documents.language IS 'BCP-47 language tag for the document; null/unknown when detection is uncertain.';
COMMENT ON COLUMN bot_documents.language_confidence IS 'Optional confidence score from language detection.';
COMMENT ON COLUMN bot_documents.language_override IS 'Manual language override; when set it supersedes auto-detection.';
COMMENT ON COLUMN bot_documents.translation_group_id IS 'Shared identifier for translated variants of the same document.';
COMMENT ON COLUMN bot_doc_chunks.language IS 'BCP-47 language tag for the chunk; null/unknown when detection is uncertain.';
COMMENT ON COLUMN bot_doc_chunks.language_confidence IS 'Optional confidence score from language detection.';
COMMENT ON COLUMN bot_doc_chunks.language_override IS 'Manual language override; when set it supersedes auto-detection.';

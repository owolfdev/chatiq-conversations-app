-- Core bot tables (ensure they exist before collections/linking)
CREATE TABLE IF NOT EXISTS bot_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  slug text UNIQUE,
  is_public boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  team_id uuid NOT NULL REFERENCES bot_teams(id),
  primary_color text CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  back_link_url text,
  back_link_text text,
  color_background text CHECK (color_background IS NULL OR color_background ~ '^#[0-9A-Fa-f]{6}$'),
  color_container_background text CHECK (color_container_background IS NULL OR color_container_background ~ '^#[0-9A-Fa-f]{6}$'),
  color_text text CHECK (color_text IS NULL OR color_text ~ '^#[0-9A-Fa-f]{6}$'),
  color_border text CHECK (color_border IS NULL OR color_border ~ '^#[0-9A-Fa-f]{6}$'),
  color_message_user text CHECK (color_message_user IS NULL OR color_message_user ~ '^#[0-9A-Fa-f]{6}$'),
  color_message_assistant text CHECK (color_message_assistant IS NULL OR color_message_assistant ~ '^#[0-9A-Fa-f]{6}$'),
  default_response text,
  rich_responses_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS bot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bot_bots(id),
  user_id uuid REFERENCES auth.users(id),
  title text,
  created_at timestamp without time zone DEFAULT now(),
  session_id text,
  ip_address text,
  team_id uuid NOT NULL REFERENCES bot_teams(id),
  context_chunk_ids jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES bot_conversations(id),
  sender text NOT NULL CHECK (sender IN ('user', 'bot')),
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  key text NOT NULL UNIQUE,
  label text,
  created_at timestamp without time zone DEFAULT now(),
  bot_id uuid REFERENCES bot_bots(id),
  active boolean DEFAULT true,
  team_id uuid REFERENCES bot_teams(id),
  allowed_domains text[],
  is_widget_only boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS bot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bot_bots(id),
  user_message text,
  assistant_response text,
  created_at timestamp without time zone DEFAULT now(),
  team_id uuid NOT NULL REFERENCES bot_teams(id)
);

CREATE TABLE IF NOT EXISTS bot_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  api_key text,
  date text NOT NULL,
  usage_count integer DEFAULT 1,
  team_id uuid REFERENCES bot_teams(id)
);

CREATE TABLE IF NOT EXISTS bot_user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,
  metadata jsonb,
  message text,
  created_at timestamp without time zone DEFAULT now(),
  team_id uuid REFERENCES bot_teams(id)
);

CREATE TABLE IF NOT EXISTS bot_contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  subject text NOT NULL,
  message text NOT NULL,
  inquiry_type text NOT NULL CHECK (inquiry_type IN ('technical', 'sales', 'partnership', 'billing', 'general')),
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'unread'
);

-- Collections must exist before documents (FK)
CREATE TABLE IF NOT EXISTS bot_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  visibility text DEFAULT 'private' NOT NULL CHECK (visibility IN ('private', 'team', 'public')),
  description text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now()
);

-- Documents and linking (needed before doc chunks/embeddings)
CREATE TABLE IF NOT EXISTS bot_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bot_bots(id),
  title text NOT NULL,
  content text NOT NULL,
  tags text[],
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  is_global boolean DEFAULT false,
  team_id uuid NOT NULL REFERENCES bot_teams(id),
  collection_id uuid REFERENCES bot_collections(id) ON DELETE SET NULL,
  canonical_url text,
  version integer NOT NULL DEFAULT 1,
  is_flagged boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS bot_document_links (
  bot_id uuid NOT NULL REFERENCES bot_bots(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES bot_documents(id) ON DELETE CASCADE,
  PRIMARY KEY (bot_id, document_id)
);

-- Create bot_collection_links table (bot-to-collection junction)
-- Many-to-many relationship: bots can use multiple collections, collections can be used by multiple bots

CREATE TABLE IF NOT EXISTS bot_collection_links (
  bot_id uuid REFERENCES bot_bots(id) ON DELETE CASCADE NOT NULL,
  collection_id uuid REFERENCES bot_collections(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (bot_id, collection_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_collections_team_id ON bot_collections(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_collections_visibility ON bot_collections(visibility);
CREATE INDEX IF NOT EXISTS idx_bot_collection_links_bot_id ON bot_collection_links(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_collection_links_collection_id ON bot_collection_links(collection_id);

-- Add comments for documentation
COMMENT ON TABLE bot_collections IS 'Document organization groups. Collections allow documents to be grouped and shared across multiple bots.';
COMMENT ON TABLE bot_collection_links IS 'Junction table linking bots to collections (many-to-many relationship).';
COMMENT ON COLUMN bot_collections.visibility IS 'Collection visibility: private (team only), team (all team members), public (all users)';

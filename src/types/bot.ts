export interface Bot {
  messages: number;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  team_id?: string | null;
  created_at: string;
  conversations?: number;
  documents?: number;
  status?: "active" | "draft" | "archived";
  system_prompt: string;
  // Color customization fields
  primary_color?: string | null;
  secondary_color?: string | null;
  color_background?: string | null;
  color_container_background?: string | null;
  color_text?: string | null;
  color_border?: string | null;
  color_message_user?: string | null;
  color_message_assistant?: string | null;
  // Navigation customization
  back_link_url?: string | null;
  back_link_text?: string | null;
  // Default response when LLM unavailable
  default_response?: string | null;
  // Formatting preference
  rich_responses_enabled?: boolean;
  // LLM toggle - when false, bot will only use pre-configured responses, cache, or default responses
  llm_enabled?: boolean;
}

export interface DocumentFormValues {
  title: string;
  content: string;
  tags: string[];
  is_global: boolean;
  linkedBots: string[];
  canonicalUrl?: string;
}

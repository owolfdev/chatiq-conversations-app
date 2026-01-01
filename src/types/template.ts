export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  uses: number;
  likes: number;
  preview: string;
  featured: boolean;
}

// types/profile.ts
export interface UserStats {
  chatbots: number;
  messages: number;
  followers: number;
  following: number;
}

export interface Profile {
  name: string;
  username: string;
  plan: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  website: string;
  joinDate: string;
  social: {
    twitter?: string;
    github?: string;
  };
  stats: UserStats;
}

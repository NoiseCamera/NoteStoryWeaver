
export type Genre = 'heartwarming' | 'romance' | 'mystery' | 'scifi' | 'fantasy' | 'horror' | 'essay' | 'business' | 'gourmet' | 'travel' | 'history' | 'comedy';

export interface KeywordCategory {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export interface GenreInfo {
  id: Genre;
  label: string;
  icon: string;
  description: string;
  themeColor: string;
  categories: KeywordCategory[];
}

export interface StoryState {
  isGenerating: boolean;
  content: string;
  error: string | null;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
export type ToneId = 
  | 'gentle' | 'nostalgic' | 'emotional' | 'fantastic' | 'realistic' 
  | 'dark' | 'logical' | 'inspiring' | 'humorous' | 'poetic' 
  | 'lonely' | 'sharp' | 'mysterious' | 'peaceful' | 'passionate' 
  | 'urban' | 'surreal' | 'philosophical';

export interface ToneOption {
  id: ToneId;
  label: string;
  icon: string;
}

export type Length = 'short' | 'standard' | 'long';

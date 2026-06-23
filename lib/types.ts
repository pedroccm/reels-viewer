export type Reel = {
  code: string;
  platform: string;
  source_url: string;
  by: string;
  creator: string;
  caption: string;
  date_ts: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  reshares: number | null;
  video_url: string;
  thumb_url: string | null;
  lang: string;
  transcript: string;
};

export type Curation = {
  tags: Record<string, string[]>; // code -> tags
  hidden: string[]; // codes
  langs?: Record<string, string>; // code -> overridden language
  notes?: Record<string, string>; // code -> free-text note
};

export type Manifest = {
  title?: string;
  emoji?: string;
  items: Reel[];
};

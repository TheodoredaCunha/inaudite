export interface InitResponse {
  type: 'init';
  postId: string;
  count: number;
  username: string;
  initialPosts: ScrapedPost[]; // <--- Add this line
}

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type ScrapedPost = {
  id: string;
  title: string;
  url: string;
  body: string;
  videoUrl?: string | null;
};


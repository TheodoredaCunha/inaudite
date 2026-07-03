import { RedditAPIClient } from '@devvit/public-api';

export type ScrapedPost = {
  id: string;
  title: string;
  url: string;
  body: string;
  videoUrl?: string | null;
  youtubeId?: string | null;
  genres: string[];
};

function extractYoutubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// r/listentothis convention: submitters tag the genre in square brackets,
// e.g. "SICKNER -- The Only Good Fascist (Is a Dead One) [Punk Rock] (2026)".
// A post can carry multiple genres separated by a slash, e.g. [Punk Rock/Hardcore].
const NON_GENRE_TAGS = /^(nsfw|explicit|video|official|lyrics?|hq|hd|remaster(ed)?|live|audio|cover|original)$/i;

function extractGenres(title: string): string[] {
  const bracketMatches = [...title.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim());

  for (const tag of bracketMatches) {
    if (!NON_GENRE_TAGS.test(tag) && !/^\d{4}$/.test(tag)) {
      return tag
        .split(/[/,]/)
        .map((g) => g.trim())
        .filter(Boolean);
    }
  }

  return ['Other'];
}

// Recurring stickied/discussion threads, not actual song submissions.
// e.g. "Music Melting Pot [Week of June 29, 2026]"
const MEGATHREAD_PATTERNS = [/music melting pot/i, /\[week of/i, /^rules\b/i, /genre spotlight/i];

function isMegathread(title: string): boolean {
  return MEGATHREAD_PATTERNS.some((pattern) => pattern.test(title));
}

export async function scrapeListentothis(clients: { reddit: RedditAPIClient }): Promise<ScrapedPost[]> {
  const listing = await clients.reddit.getHotPosts({
    subredditName: 'listentothis',
    limit: 100,
  }).all();

  console.log(`From scrapeListentothis() in scrapeListentothis.ts: Scraped ${listing.length} posts from r/listentothis`);

  const posts = listing
    .filter((post) => !isMegathread(post.title))
    .map((post) => {
      const rawPost = post as any;
      const redditData = rawPost.data ?? rawPost;

      const musicUrl = rawPost.linkUrl || rawPost.url || redditData.url || '';
      const bodyContent = rawPost.body || rawPost.selftext || redditData.selftext || '';

      const nativeVideoUrl =
        redditData.media?.reddit_video?.fallback_url ??
        rawPost.media?.reddit_video?.fallback_url ??
        redditData.secure_media?.reddit_video?.fallback_url ??
        rawPost.secure_media?.reddit_video?.fallback_url ??
        null;

      const normalizedVideoUrl =
        typeof nativeVideoUrl === 'string' && /v\.redd\.it/i.test(nativeVideoUrl) ? nativeVideoUrl : null;

      const youtubeId = extractYoutubeId(musicUrl);
      const genres = extractGenres(post.title);

      return {
        id: post.id,
        title: post.title,
        url: musicUrl,
        body: bodyContent,
        videoUrl: normalizedVideoUrl,
        youtubeId,
        genres,
      };
    });

  const youtubeCount = posts.filter((p) => p.youtubeId).length;
  console.log(
    `Kept ${posts.length} / ${listing.length} posts after removing megathreads; ${youtubeCount} have a recognizable YouTube link`
  );

  return posts;
}
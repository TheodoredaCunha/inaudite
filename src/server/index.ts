import express from 'express';
// Import the specific clients directly from the web server shim
import { 
  redis, 
  reddit, 
  createServer, 
  context, 
  getServerPort 
} from '@devvit/web/server';

import type { InitResponse, ScrapedPost } from '../shared/types/api';
import { scrapeListentothis } from './core/scrapeListentothis';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

async function ensureScrapedPosts(): Promise<ScrapedPost[]> {
  const cached = await redis.get('scraped:listentothis:v2');

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ScrapedPost[];
      }
    } catch {
      // fall through to a fresh scrape if the cache is invalid
    }
  }

  const posts = await scrapeListentothis({ reddit: reddit as any });
  await redis.set('scraped:listentothis', JSON.stringify(posts));
  return posts;
}

// --- 1. The Scraper Route ---
router.post('/internal/menu/scrape-listentothis', async (_req, res) => {
  try {
    const posts = await ensureScrapedPosts();
    res.json({
      showToast: { text: `Scraped ${posts.length} posts!` },
    });
  } catch (err) {
    res.json({
      showToast: { text: 'Scrape failed' },
    });
  }
});

// --- 2. The API for your Frontend ---
router.get('/api/scraped-posts', async (_req, res) => {
  try {
    const posts = await ensureScrapedPosts();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// --- 3. App Initialization ---
router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId missing' });
      return;
    }

    try {
      const [count, username, posts] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
        ensureScrapedPosts(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
        initialPosts: posts,
      });
    } catch (error) {
      res.status(400).json({ status: 'error', message: 'Init failed' });
    }
  }
);

/* ... Keep your Increment/Decrement/CreatePost routes as they were ... */

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.listen(port);
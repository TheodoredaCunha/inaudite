import { useEffect, useMemo, useState } from 'react';
import type { ScrapedPost } from '../../shared/types/api';

type DisplayMode = 'list' | 'genre';
type View = 'browse' | 'playlist';

const MAX_PLAYLIST_SIZE = 25;

function getSourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('soundcloud.com')) return 'SoundCloud';
    if (hostname.includes('bandcamp.com')) return 'Bandcamp';
    if (hostname.includes('spotify.com')) return 'Spotify';
    if (hostname.includes('vimeo.com')) return 'Vimeo';
    return hostname;
  } catch {
    return 'the source';
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildYoutubePlaylistUrl(ids: string[]): string {
  return `https://www.youtube.com/watch_videos?video_ids=${ids.join(',')}`;
}

function SongRow({ post }: { post: ScrapedPost }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 border-b border-zinc-800 py-2 hover:bg-zinc-900 transition-colors px-1 -mx-1 rounded"
    >
      <span className="text-sm text-zinc-300 truncate">{post.title}</span>
      <span className="text-[10px] uppercase tracking-wide text-zinc-600 shrink-0">
        {getSourceLabel(post.url)}
      </span>
    </a>
  );
}

export default function App() {
  const [posts, setPosts] = useState<ScrapedPost[]>([]);
  const [view, setView] = useState<View>('browse');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [playlistPosts, setPlaylistPosts] = useState<ScrapedPost[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/scraped-posts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
      })
      .catch(console.error);
  }, []);

  const genreGroups = useMemo(() => {
    const groups = new Map<string, { label: string; posts: ScrapedPost[] }>();

    for (const post of posts) {
      for (const genre of post.genres.length > 0 ? post.genres : ['Other']) {
        const key = genre.toLowerCase();
        if (!groups.has(key)) {
          groups.set(key, { label: genre, posts: [] });
        }
        groups.get(key)!.posts.push(post);
      }
    }

    return [...groups.values()].sort((a, b) => b.posts.length - a.posts.length);
  }, [posts]);

  const allGenres = useMemo(
    () => genreGroups.map((g) => g.label).sort((a, b) => a.localeCompare(b)),
    [genreGroups]
  );

  const toggleGenre = (label: string) => {
    const key = label.toLowerCase();
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearGenreFilter = () => setSelectedGenres(new Set());

  const matchesGenreFilter = (post: ScrapedPost) =>
    selectedGenres.size === 0 || post.genres.some((g) => selectedGenres.has(g.toLowerCase()));

  const youtubeEligibleCount = posts.filter((post) => post.youtubeId && matchesGenreFilter(post)).length;

  // Devvit webviews run in a sandboxed frame without 'allow-popups', so
  // window.open / target="_blank" can never open a new tab here. Copying
  // the link is the reliable path — the user pastes it into their browser.
  const buildPlaylist = async () => {
    const eligible = posts.filter((post) => post.youtubeId && matchesGenreFilter(post));
    if (eligible.length === 0) return;

    const selected = shuffle(eligible).slice(0, MAX_PLAYLIST_SIZE);
    const ids = selected.map((post) => post.youtubeId as string);
    const url = buildYoutubePlaylistUrl(ids);

    setPlaylistPosts(selected);
    setPlaylistUrl(url);
    setView('playlist');
    setCopyStatus('idle');

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const copyPlaylistUrl = async () => {
    if (!playlistUrl) return;
    try {
      await navigator.clipboard.writeText(playlistUrl);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  if (view === 'playlist') {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950 text-white p-6">
        <button
          onClick={() => setView('browse')}
          className="text-zinc-500 text-sm hover:text-white mb-6 self-start"
        >
          ← Back to Library
        </button>

        <h1 className="text-2xl font-black mb-1 tracking-tight">Your Playlist</h1>
        <p className="text-zinc-400 text-sm mb-6">{playlistPosts.length} songs from r/listentothis</p>

        {playlistUrl && (
          <div className="mb-8">
            <button
              onClick={copyPlaylistUrl}
              className="w-full bg-white text-black text-center px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform active:scale-95"
            >
              {copyStatus === 'copied' ? 'Link Copied ✓' : 'Copy Playlist Link'}
            </button>
            <p className="text-zinc-500 text-xs text-center mt-3">
              {copyStatus === 'copied'
                ? 'Paste it into your browser to open on YouTube.'
                : copyStatus === 'failed'
                  ? "Couldn't copy automatically — long-press the link below to copy it."
                  : 'Tap to copy, then paste into your browser.'}
            </p>
            {copyStatus === 'failed' && (
              <p className="text-zinc-400 text-xs text-center mt-2 break-all bg-zinc-900 rounded-lg p-3 select-all">
                {playlistUrl}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 overflow-y-auto flex-1">
          {playlistPosts.map((post, i) => (
            <div key={post.id} className="flex items-center gap-3 border-b border-zinc-800 pb-2">
              <span className="text-zinc-600 text-xs w-5 shrink-0">{i + 1}</span>
              <p className="text-sm text-zinc-300 truncate">{post.title}</p>
            </div>
          ))}
        </div>

        <button onClick={buildPlaylist} className="text-zinc-500 text-sm underline mt-6 self-center">
          Shuffle a new playlist
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white p-6">
      <h1 className="text-4xl font-black mb-2 tracking-tighter">INAUDITE</h1>
      <p className="text-zinc-400 mb-6">Uncover the sounds of r/listentothis</p>

      {allGenres.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Filter Genres
            </span>
            {selectedGenres.size > 0 && (
              <button onClick={clearGenreFilter} className="text-xs text-zinc-500 underline hover:text-white">
                Clear ({selectedGenres.size})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allGenres.map((genre) => {
              const isSelected = selectedGenres.has(genre.toLowerCase());
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={buildPlaylist}
        disabled={youtubeEligibleCount === 0}
        className="bg-white text-black px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed self-start mb-2"
      >
        Generate YouTube Playlist
      </button>
      {youtubeEligibleCount > 0 ? (
        <p className="text-xs text-zinc-600 mb-6">
          {Math.min(youtubeEligibleCount, MAX_PLAYLIST_SIZE)} songs ready to queue
          {selectedGenres.size > 0 ? ' (filtered)' : ''}
        </p>
      ) : (
        <p className="text-xs text-zinc-600 mb-6">No YouTube songs match the selected genres</p>
      )}

      <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-lg w-fit">
        <button
          onClick={() => setDisplayMode('list')}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            displayMode === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          List
        </button>
        <button
          onClick={() => setDisplayMode('genre')}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            displayMode === 'genre' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          By Genre
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mb-4"></div>
            <p className="text-zinc-500">Loading songs...</p>
          </div>
        )}

        {displayMode === 'list' &&
          posts.filter(matchesGenreFilter).map((post) => <SongRow key={post.id} post={post} />)}

        {displayMode === 'genre' &&
          genreGroups
            .filter((group) => selectedGenres.size === 0 || selectedGenres.has(group.label.toLowerCase()))
            .map((group) => (
              <div key={group.label} className="mb-6">
                <h2 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  {group.label} <span className="text-zinc-700">· {group.posts.length}</span>
                </h2>
                <div>
                  {group.posts.map((post) => (
                    <SongRow key={`${group.label}-${post.id}`} post={post} />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
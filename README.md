<p align="center">
  <img src="assets/logo.png" alt="Inaudite logo" height="80">
</p>

# Inaudite

Inaudite turns r/listentothis into a browsable music library. Explore tracks by genre, filter to what you're in the mood for, and instantly generate a shuffled YouTube playlist — all without leaving Reddit.

Built as a Reddit Devvit web app, Inaudite scrapes music submissions from r/listentothis and presents them in a fast, filterable interface with one-tap playlist generation.

## Features

- **Browse by list or genre** — View all scraped songs in a single feed, or switch to a genre-grouped view with collapsible sections (collapsed by default to keep things tidy).
- **Genre filtering** — Select one or multiple genres to narrow down the song list across both view modes.
- **Instant YouTube playlists** — Generate a shuffled playlist (up to 25 songs) from your current filter, or from the whole library, with a single tap.
- **Per-genre playlists** — Each genre section includes a "Make Playlist" button to generate a playlist scoped to just that genre.
- **Clipboard-based sharing** — Since Devvit webviews run in a sandboxed frame without popup support, generated playlist links are copied straight to the clipboard for pasting into a browser.
- **Source labeling** — Each track shows its source platform (YouTube, SoundCloud, Bandcamp, Spotify, Vimeo, etc.).

## Tech Stack

- **React** + **TypeScript**
- **Tailwind CSS** for styling
- **Reddit Devvit** for the webview platform integration
- YouTube's `watch_videos` endpoint for playlist generation

## How It Works

1. The app fetches scraped posts from r/listentothis via `/api/scraped-posts`.
2. Posts are grouped by genre and can be filtered or browsed individually.
3. When a user generates a playlist, eligible songs (those with a YouTube video ID) are shuffled and capped at 25 tracks.
4. A YouTube playlist URL is built from the selected video IDs and copied to the clipboard for the user to open externally.

## Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── assets/
│   │   └── NADA_logo.png
│   └── ...
├── shared/
│   └── types/
│       └── api.ts       # Shared types (e.g. ScrapedPost)
```

## Getting Started

```bash
# Install dependencies
npm install

# Run the app locally (via Devvit)
npm run dev
```

> Note: This app is built for the Reddit Devvit platform and expects to run within a Reddit webview context, including access to the `/api/scraped-posts` endpoint.

## Roadmap Ideas

- Support for additional playlist destinations beyond YouTube
- Persisted user preferences for genre filters
- Search functionality across song titles

## License

MIT
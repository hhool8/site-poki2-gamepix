# gamepix-poki2-site

Free HTML5 games portal powered by the [GamePix](https://www.gamepix.com/) publisher API.  
Live site: **gamepix.poki2.online**

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your GamePix API key (or create a .env file — see below)
export GAMEPIX_API_KEY=your_key_here

# 3. Fetch the game catalog from GamePix API
npm run fetch

# 4. Build the static site
npm run build

# 5. Deploy to Cloudflare Pages
npm run deploy
```

---

## .env Setup

Create a `.env` file in the project root (already in `.gitignore`):

```
GAMEPIX_API_KEY=your_key_here
```

Get your API key at: https://my.gamepix.com → Settings → API Key

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run fetch` | Fetch game catalog from GamePix API → `src/data/games.json` |
| `npm run build` | Build all static pages → `dist/` |
| `npm run deploy` | Deploy `dist/` to Cloudflare Pages (`gamepix-poki2-site`) |
| `npm run clean` | Remove `dist/` |

---

## Build Pipeline

```
npm run fetch   → src/data/games.json
npm run build   → dist/
  ├── build-pages.js     static pages (index, about, privacy…)
  ├── build-categories.js  category listing pages
  ├── build-games.js     individual game pages
  ├── build-search.js    search-index.json
  └── build-sitemap.js   sitemap.xml
```

---

## GamePix Embed Info

- **Publisher SID:** `EO17I`
- **Embed URL:** `https://play.gamepix.com/{slug}/embed?sid=EO17I`
- **Thumbnail URL:** `https://img.gamepix.com/games/{slug}/icon/{slug}.png`

---

## Cloudflare Pages

| Setting | Value |
|---|---|
| Project name | `gamepix-poki2-site` |
| Build output directory | `dist` |
| Deploy command | `npm run build` |

Manual deploy:
```bash
npx wrangler pages deploy dist --project-name gamepix-poki2-site
```

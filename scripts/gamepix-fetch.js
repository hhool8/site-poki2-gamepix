'use strict';

/**
 * gamepix-fetch.js
 *
 * Fetches the full GamePix game catalog via the publisher API and writes
 * the processed data to src/data/games.json, ready for the build.
 *
 * Usage:
 *   GAMEPIX_API_KEY=your_key_here node scripts/gamepix-fetch.js
 *
 * Or create a .env file in the project root:
 *   GAMEPIX_API_KEY=your_key_here
 * Then run:
 *   node scripts/gamepix-fetch.js
 *
 * The API key is available in your GamePix publisher dashboard:
 *   https://my.gamepix.com  → Settings → API Key
 *
 * Your publisher SID (used in embed URLs): EO17I
 * Embed URL format: https://play.gamepix.com/{slug}/embed?sid=EO17I
 * Thumbnail URL:    https://img.gamepix.com/games/{slug}/icon/{slug}.png
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

// ── Load .env if present ─────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}

const SITE_SID = 'EO17I';
const PAGINATION = 96;  // items per page (max allowed by API)

// ── Category mapping: GamePix category → site category slug ─────────────────
const CATEGORY_MAP = {
  'puzzle':       'puzzle-games',
  'action':       'action-games',
  'racing':       'racing-games',
  'sports':       'sports-games',
  'adventure':    'adventure-games',
  'casual':       'casual-games',
  'match-3':      'puzzle-games',
  'strategy':     'strategy-games',
  'rpg':          'adventure-games',
  'management':   'strategy-games',
  'simulation':   'casual-games',
  'idle':         'idle-games',
  'shooting':     'action-games',
  'platformer':   'action-games',
  'addictive':    'casual-games',
  'kids':         'casual-games',
  'multiplayer':  'sports-games',
  'io':           'sports-games',
  'card':         'puzzle-games',
  'board':        'puzzle-games',
  'word':         'puzzle-games',
  'music':        'casual-games',
};

function mapCategory(gpxCategory) {
  return CATEGORY_MAP[gpxCategory] || 'casual-games';
}

// ── Fetch all games from GamePix JSON Feed API ───────────────────────────────
// Endpoint: https://feeds.gamepix.com/v2/json
// Docs: JSON Feed 1.1 format, paginated via next_url
async function fetchAllGames() {
  const allGames = [];
  let nextUrl = `https://feeds.gamepix.com/v2/json?sid=${SITE_SID}&order=quality&pagination=${PAGINATION}&page=1`;
  let pageNum = 1;

  while (nextUrl) {
    console.log(`Fetching page ${pageNum}: ${nextUrl}`);

    const data = await httpGet(nextUrl);
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      console.error('Failed to parse API response:', data.slice(0, 200));
      break;
    }

    const items = parsed.items || [];
    if (!items.length) break;
    allGames.push(...items);
    console.log(`  Got ${items.length} games (total so far: ${allGames.length})`);

    nextUrl = parsed.next_url || null;
    pageNum++;
  }

  return allGames;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── Map JSON Feed item → site game entry ────────────────────────────────────
// Feed item fields: id, namespace (slug), title, description, category,
//   image (icon), banner_image, url (embed), width, height, orientation,
//   quality_score, date_published, date_modified
function mapGame(g) {
  const slug  = g.namespace;
  const title = g.title;
  const desc  = g.description || `Play ${title} free in your browser. No download needed.`;
  const gpxCategory = g.category || 'casual';
  const orientation = g.orientation === 'portrait' ? 'portrait'
    : g.orientation === 'landscape' ? 'landscape'
    : (g.width && g.height && g.width > g.height) ? 'landscape'
    : undefined;

  return {
    slug,
    title,
    description: desc.slice(0, 300),
    thumbnail:   g.image || `https://img.gamepix.com/games/${slug}/icon/${slug}.png`,
    category:    mapCategory(gpxCategory),
    gpxCategory,
    quality:     g.quality_score || 0,
    ...(orientation ? { orientation } : {}),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n=== GamePix Catalog Fetch ===`);
  console.log(`Publisher SID: ${SITE_SID}`);
  console.log(`Feed: feeds.gamepix.com/v2/json`);
  console.log('');

  const rawGames = await fetchAllGames();
  console.log(`\nFetched ${rawGames.length} games total.`);

  // Save raw catalog as scratch file (gitignored)
  const catalogPath = path.join(__dirname, 'gamepix-catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(rawGames, null, 2), 'utf8');
  console.log(`Raw catalog saved to scripts/gamepix-catalog.json`);

  // Map and filter games (skip very low quality)
  const mapped = rawGames
    .map(mapGame)
    .filter(g => g.slug && g.title)
    .sort((a, b) => (b.quality || 0) - (a.quality || 0));

  console.log(`Mapped ${mapped.length} games.`);

  // Read existing games.json to preserve category definitions
  const gamesJsonPath = path.join(ROOT, 'src/data/games.json');
  const existing = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));

  // Update games array, keep site + categories config
  existing.games = mapped;
  fs.writeFileSync(gamesJsonPath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`\n✓ src/data/games.json updated with ${mapped.length} games.`);
  console.log(`\nNext: npm run build && npm run deploy`);
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

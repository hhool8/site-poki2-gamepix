'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const { gamesData, normalizeThumbnailUrl } = require('./config');
const baseTemplate = fs.readFileSync(path.join(ROOT, 'src/templates/base.html'),   'utf8');
const searchTpl    = fs.readFileSync(path.join(ROOT, 'src/templates/search.html'), 'utf8');

const distDir       = path.join(ROOT, 'dist');
const distSearchDir = path.join(distDir, 'search');
fs.mkdirSync(distSearchDir, { recursive: true });

const { site, games: allGames, categories } = gamesData;
const games  = allGames.filter(g => !g.hidden);
const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));

function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function withBrand(t) { return `${t} | GamePix by Poki2`; }

// ── Build search index ────────────────────────────────────────────────────────
const index = games.map(g => ({
  slug:        g.slug,
  title:       g.title,
  description: g.description,
  category:    g.category,
  catName:     (catMap[g.category] || {}).name || '',
  thumbnail:   normalizeThumbnailUrl(g.thumbnail, 320),
}));

fs.writeFileSync(
  path.join(distDir, 'search-index.json'),
  JSON.stringify(index),
  'utf8'
);
console.log(`Built: dist/search-index.json (${index.length} games)`);

// ── Build search page ─────────────────────────────────────────────────────────
const canonical   = `${site.domain}/search/`;
const title       = withBrand('Search Free Games');
const description = 'Search all free HTML5 games on GamePix by Poki2. Find your game instantly — no login, no download.';

const content = searchTpl;

const html = baseTemplate
  .replace(/\{\{TITLE\}\}/g,               escAttr(title))
  .replace(/\{\{DESCRIPTION\}\}/g,          escAttr(description))
  .replace(/\{\{KEYWORDS\}\}/g,             escAttr('search games, find free games, gamepix search'))
  .replace(/\{\{CANONICAL\}\}/g,            escAttr(canonical))
  .replace(/\{\{ROBOTS_META\}\}/g,          '<meta name="robots" content="noindex, follow">')
  .replace(/\{\{OG_TITLE\}\}/g,             escAttr(title))
  .replace(/\{\{OG_DESCRIPTION\}\}/g,       escAttr(description))
  .replace(/\{\{OG_URL\}\}/g,               escAttr(canonical))
  .replace(/\{\{OG_TYPE\}\}/g,              escAttr('website'))
  .replace(/\{\{OG_IMAGE\}\}/g,             escAttr(`${site.domain}/favicon-512.png`))
  .replace(/\{\{TWITTER_CARD\}\}/g,         escAttr('summary_large_image'))
  .replace(/\{\{TWITTER_SITE\}\}/g,         escAttr('@poki2online'))
  .replace(/\{\{TWITTER_TITLE\}\}/g,        escAttr(title))
  .replace(/\{\{TWITTER_DESCRIPTION\}\}/g,  escAttr(description))
  .replace(/\{\{TWITTER_IMAGE\}\}/g,        escAttr(`${site.domain}/favicon-512.png`))
  .replace(/\{\{BODY_CLASS\}\}/g,           escAttr('search-page'))
  .replace(/\{\{SCHEMA\}\}/g,               '')
  .replace(/\{\{CONTENT\}\}/g,              content);

fs.writeFileSync(path.join(distSearchDir, 'index.html'), html, 'utf8');
console.log('Built: dist/search/index.html');

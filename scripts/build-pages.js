'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT                        = path.join(__dirname, '..');
const { seoData, gamesData, normalizeThumbnailUrl } = require('./config');
const baseTemplate                = fs.readFileSync(path.join(ROOT, 'src/templates/base.html'),  'utf8');

const distDir = path.join(ROOT, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const { site } = gamesData;
const homepageGameRows = buildHomepageGameRows(gamesData.games, gamesData.categories);

for (const page of seoData.pages) {
  const contentPath = path.join(ROOT, 'src/content', `${page.slug}.html`);
  if (!fs.existsSync(contentPath)) {
    console.warn(`  SKIP (missing content): ${page.slug}`);
    continue;
  }
  let content = fs.readFileSync(contentPath, 'utf8');
  if (page.slug === 'index') {
    content = content.replace('{{HOMEPAGE_GAME_ROWS}}', homepageGameRows);
  }

  const schema = buildSchema(page.schema || [{
    '@context': 'https://schema.org',
    '@type':    'WebPage',
    url:        page.canonical,
    name:       page.title,
    description:page.description,
  }]);

  const html = renderBase(baseTemplate, {
    title:              withBrand(page.title),
    description:        page.description,
    keywords:           page.keywords || '',
    canonical:          page.canonical,
    robotsMeta:         robotsMeta(page.indexable !== false),
    ogTitle:            withBrand((page.og && page.og.title) || page.title),
    ogDescription:      (page.og && page.og.description) || page.description,
    ogUrl:              (page.og && page.og.url) || page.canonical,
    ogType:             (page.og && page.og.type) || 'website',
    ogImage:            (page.og && page.og.image) || siteImage(),
    twitterCard:        'summary_large_image',
    twitterTitle:       withBrand(page.title),
    twitterDescription: page.description,
    twitterImage:       (page.og && page.og.image) || siteImage(),
    schema,
    bodyClass:          page.bodyClass || '',
    content,
  });

  const outPath = path.join(distDir, page.outputFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Built: dist/${page.outputFile}`);
}

// Copy public/ → dist/
const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, distDir);
  console.log('Copied: public/ → dist/');
}

// Copy css/ → dist/css/
const cssDir     = path.join(ROOT, 'css');
const distCssDir = path.join(distDir, 'css');
if (fs.existsSync(cssDir)) {
  fs.mkdirSync(distCssDir, { recursive: true });
  copyDir(cssDir, distCssDir);
  console.log('Copied: css/ → dist/css/');
}

console.log('\nStatic pages complete.');

// ── Helpers ────────────────────────────────────────────────────────────────
function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function withBrand(t) { return t.includes('GamePix') ? t : `${t} | GamePix by Poki2`; }
function siteImage()  { return `${site.domain}/og-image.png`; }
function robotsMeta(idx) { return idx ? '<meta name="robots" content="index, follow">' : '<meta name="robots" content="noindex, nofollow">'; }
function buildSchema(schemas) {
  return schemas.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
}
function renderBase(template, p) {
  return template
    .replace(/\{\{TITLE\}\}/g,               escAttr(p.title))
    .replace(/\{\{DESCRIPTION\}\}/g,          escAttr(p.description))
    .replace(/\{\{KEYWORDS\}\}/g,             escAttr(p.keywords || ''))
    .replace(/\{\{CANONICAL\}\}/g,            escAttr(p.canonical))
    .replace(/\{\{ROBOTS_META\}\}/g,          p.robotsMeta)
    .replace(/\{\{OG_TITLE\}\}/g,             escAttr(p.ogTitle))
    .replace(/\{\{OG_DESCRIPTION\}\}/g,       escAttr(p.ogDescription))
    .replace(/\{\{OG_URL\}\}/g,               escAttr(p.ogUrl))
    .replace(/\{\{OG_TYPE\}\}/g,              escAttr(p.ogType))
    .replace(/\{\{OG_IMAGE\}\}/g,             escAttr(p.ogImage))
    .replace(/\{\{TWITTER_CARD\}\}/g,         escAttr(p.twitterCard))
    .replace(/\{\{TWITTER_TITLE\}\}/g,        escAttr(p.twitterTitle))
    .replace(/\{\{TWITTER_DESCRIPTION\}\}/g,  escAttr(p.twitterDescription))
    .replace(/\{\{TWITTER_IMAGE\}\}/g,        escAttr(p.twitterImage))
    .replace(/\{\{BODY_CLASS\}\}/g,           escAttr(p.bodyClass || ''))
    .replace(/\{\{SCHEMA\}\}/g,               p.schema || '')
    .replace(/\{\{CONTENT\}\}/g,              p.content);
}

// ── Homepage game rows (azgames-style layout) ──────────────────────────────
function buildHomepageGameRows(games, categories) {
  const visibleGames = games.filter(g => !g.hidden);
  return categories.map(cat => {
    const catGames = visibleGames.filter(g => g.category === cat.slug).slice(0, 12);
    if (catGames.length === 0) return '';
    const cardsHtml = catGames.map(game =>
      `      <a class="game-card" href="/play/${game.slug}" aria-label="Play ${escAttr(game.title)} free online">
        <img src="${escAttr(normalizeThumbnailUrl(game.thumbnail, 320))}" alt="${escAttr(game.title)}" loading="lazy" width="180" height="135">
        <span class="game-card-label">${escHtml(game.title)}</span>
      </a>`
    ).join('\n');
    return `<div class="game-row">
  <div class="game-row-header">
    <h2><a href="/category/${cat.slug}">${cat.emoji} ${escHtml(cat.name)}</a></h2>
    <a class="game-row-viewall" href="/category/${cat.slug}">View all &rsaquo;</a>
  </div>
  <div class="game-row-grid">
${cardsHtml}
  </div>
</div>`;
  }).filter(Boolean).join('\n\n');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

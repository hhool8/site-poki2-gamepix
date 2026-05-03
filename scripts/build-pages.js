'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT                        = path.join(__dirname, '..');
const { seoData, gamesData }      = require('./config');
const baseTemplate                = fs.readFileSync(path.join(ROOT, 'src/templates/base.html'),  'utf8');

const distDir = path.join(ROOT, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const { site, games: allGames, categories } = gamesData;
const games  = allGames.filter(g => !g.hidden);
const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));

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

// ── Build homepage & static pages ─────────────────────────────────────────────
// Featured games: 12 per category row, top games overall
const featuredGames = games.slice(0, 24);
const featuredHtml = featuredGames.map(g => `        <a href="/play/${g.slug}" class="game-card">
          <img src="${escAttr(g.thumbnail)}" alt="${escAttr(g.title)}" loading="lazy" width="200" height="150">
          <span class="game-card-label">${escAttr(g.title)}</span>
        </a>`).join('\n');

// Category sections on homepage
const catSections = categories.map(cat => {
  const catGames = games.filter(g => g.category === cat.slug).slice(0, 8);
  if (!catGames.length) return '';
  const cardsHtml = catGames.map(g => `          <a href="/play/${g.slug}" class="game-card">
            <img src="${escAttr(g.thumbnail)}" alt="${escAttr(g.title)}" loading="lazy" width="200" height="150">
            <span class="game-card-label">${escAttr(g.title)}</span>
          </a>`).join('\n');
  return `      <section class="cat-section">
        <div class="cat-section-header">
          <h2 class="cat-section-title">${escHtml(cat.emoji)} ${escHtml(cat.name)}</h2>
          <a href="/category/${escAttr(cat.slug)}" class="cat-view-all">View All →</a>
        </div>
        <div class="games-grid">
${cardsHtml}
        </div>
      </section>`;
}).filter(Boolean).join('\n\n');

for (const page of seoData.pages) {
  const contentPath = path.join(ROOT, 'src/content', `${page.slug}.html`);
  if (!fs.existsSync(contentPath)) {
    console.warn(`  SKIP (missing content): ${page.slug}`);
    continue;
  }
  let content = fs.readFileSync(contentPath, 'utf8');
  if (page.slug === 'index') {
    content = content
      .replace('{{FEATURED_GAMES}}', featuredHtml)
      .replace('{{CAT_SECTIONS}}', catSections)
      .replace('{{TOTAL_GAMES}}', games.length);
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

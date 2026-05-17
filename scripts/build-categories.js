'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT                        = path.join(__dirname, '..');
const { seoData, gamesData, normalizeThumbnailUrl } = require('./config');
const baseTemplate                = fs.readFileSync(path.join(ROOT, 'src/templates/base.html'),     'utf8');
const categoryTemplate            = fs.readFileSync(path.join(ROOT, 'src/templates/category.html'), 'utf8');

const distDir         = path.join(ROOT, 'dist');
const distCategoryDir = path.join(distDir, 'category');
fs.mkdirSync(distCategoryDir, { recursive: true });

const { site, games: allGames, categories } = gamesData;
const games  = allGames.filter(g => !g.hidden);
const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));

// ── Helper: escape HTML attribute values ─────────────────────────────────────
function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function withBrand(title) {
  return title.includes('GamePix') ? title : `${title} | GamePix by Poki2`;
}

function siteImage() {
  return `${site.domain}/favicon-512.png`;
}

function robotsMeta(indexable) {
  return indexable
    ? '<meta name="robots" content="index, follow">'
    : '<meta name="robots" content="noindex, nofollow">';
}

function buildSchema(schemas) {
  if (!schemas || !schemas.length) return '';
  return schemas.map(s =>
    `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`
  ).join('\n');
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
    .replace(/\{\{TWITTER_SITE\}\}/g,         escAttr(p.twitterSite))
    .replace(/\{\{TWITTER_TITLE\}\}/g,        escAttr(p.twitterTitle))
    .replace(/\{\{TWITTER_DESCRIPTION\}\}/g,  escAttr(p.twitterDescription))
    .replace(/\{\{TWITTER_IMAGE\}\}/g,        escAttr(p.twitterImage))
    .replace(/\{\{BODY_CLASS\}\}/g,           escAttr(p.bodyClass || ''))
    .replace(/\{\{SCHEMA\}\}/g,               p.schema || '')
    .replace(/\{\{CONTENT\}\}/g,              p.content);
}

// ── Category pages ────────────────────────────────────────────────────────────
for (const cat of categories) {
  const catGames   = games.filter(g => g.category === cat.slug);
  const gameCount  = catGames.length;
  const canonical  = `${site.domain}/category/${cat.slug}`;

    const gamesHtml = catGames.map(g => `      <a href="/play/${g.slug}" class="game-card">
      <img src="${escAttr(normalizeThumbnailUrl(g.thumbnail, 320))}" alt="${escAttr(g.title)}" loading="lazy" width="200" height="150">
        <span class="game-card-label">${escAttr(g.title)}</span>
      </a>`).join('\n');

  const content = categoryTemplate
    .replace(/\{\{CATEGORY_EMOJI\}\}/g,       escAttr(cat.emoji))
    .replace(/\{\{CATEGORY_TITLE\}\}/g,       escAttr(cat.name))
    .replace(/\{\{CATEGORY_DESCRIPTION\}\}/g, escAttr(cat.description))
    .replace(/\{\{GAME_COUNT\}\}/g,           gameCount)
    .replace(/\{\{GAMES_HTML\}\}/g,           gamesHtml);

  const schema = buildSchema([
    {
      '@context': 'https://schema.org',
      '@type':    'CollectionPage',
      name:       `${cat.name} — Free Browser Games`,
      url:        canonical,
      description:cat.description,
    }
  ]);

  const html = renderBase(baseTemplate, {
    title:              withBrand(`${cat.name} — Free Online Games`),
    description:        `Play free ${cat.name.toLowerCase()} in your browser. ${gameCount} games, no download, instant play.`,
    keywords:           `free ${cat.name.toLowerCase()}, browser ${cat.name.toLowerCase()}, online games`,
    canonical,
    robotsMeta:         robotsMeta(true),
    ogTitle:            withBrand(`${cat.name} — Free Online Games`),
    ogDescription:      cat.description,
    ogUrl:              canonical,
    ogType:             'website',
    ogImage:            siteImage(),
    twitterCard:        'summary_large_image',
    twitterSite:        '@poki2online',
    twitterTitle:       withBrand(`${cat.name} — Free Online Games`),
    twitterDescription: cat.description,
    twitterImage:       siteImage(),
    schema,
    bodyClass:          'category-page',
    content,
  });

  fs.writeFileSync(path.join(distCategoryDir, `${cat.slug}.html`), html, 'utf8');
  console.log(`Built: dist/category/${cat.slug}.html (${gameCount} games)`);
}

console.log('\nCategory pages complete.');

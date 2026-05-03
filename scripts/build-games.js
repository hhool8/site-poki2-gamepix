'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT                              = path.join(__dirname, '..');
const { seoData, gamesData, GAMEPIX_SID } = require('./config');
const baseTemplate                      = fs.readFileSync(path.join(ROOT, 'src/templates/base.html'), 'utf8');
const playTemplate                      = fs.readFileSync(path.join(ROOT, 'src/templates/play.html'), 'utf8');

const distPlayDir = path.join(ROOT, 'dist', 'play');
fs.mkdirSync(distPlayDir, { recursive: true });

const { site, games: allGames, categories } = gamesData;
const games  = allGames.filter(g => !g.hidden);
const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function withBrand(title) {
  return `${title} | GamePix by Poki2`;
}

function siteImage() {
  return `${site.domain}/og-image.png`;
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
    .replace(/\{\{TWITTER_TITLE\}\}/g,        escAttr(p.twitterTitle))
    .replace(/\{\{TWITTER_DESCRIPTION\}\}/g,  escAttr(p.twitterDescription))
    .replace(/\{\{TWITTER_IMAGE\}\}/g,        escAttr(p.twitterImage))
    .replace(/\{\{BODY_CLASS\}\}/g,           escAttr(p.bodyClass || ''))
    .replace(/\{\{SCHEMA\}\}/g,               p.schema || '')
    .replace(/\{\{CONTENT\}\}/g,              p.content);
}

// ── Build individual play pages ───────────────────────────────────────────────
for (const game of games) {
  const cat         = catMap[game.category] || categories[0];
  const canonical   = `${site.domain}/play/${game.slug}`;
  const embedUrl    = `https://play.gamepix.com/${game.slug}/embed?sid=${GAMEPIX_SID}`;
  const thumbUrl    = game.thumbnail;
  const isLandscape = game.orientation === 'landscape';

  // Pick 4 related games from same category (or fallback to other games)
  const samecat = games.filter(g => g.category === game.category && g.slug !== game.slug);
  const related = [...samecat, ...games.filter(g => g.category !== game.category && g.slug !== game.slug)]
    .slice(0, 4);

  const relatedHtml = related.map(g => `        <a href="/play/${g.slug}" class="related-card">
          <img src="${escAttr(g.thumbnail)}" alt="${escAttr(g.title)}" loading="lazy" width="140" height="105">
          <span>${escAttr(g.title)}</span>
        </a>`).join('\n');

  const schema = buildSchema([
    {
      '@context': 'https://schema.org',
      '@type':    'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.domain}/` },
        { '@type': 'ListItem', position: 2, name: cat.name, item: `${site.domain}/category/${cat.slug}` },
        { '@type': 'ListItem', position: 3, name: game.title, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type':    'VideoGame',
      name:       game.title,
      description:game.description,
      url:        canonical,
      image:      thumbUrl,
      genre:      cat.name,
      gamePlatform: 'Browser',
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      offers: {
        '@type':        'Offer',
        price:          '0',
        priceCurrency:  'USD',
        availability:   'https://schema.org/InStock',
      },
    },
  ]);

  const content = playTemplate
    .replace(/\{\{GAME_TITLE\}\}/g,       escAttr(game.title))
    .replace(/\{\{GAME_EMBED_URL\}\}/g,   escAttr(embedUrl))
    .replace(/\{\{GAME_THUMB_URL\}\}/g,   escAttr(thumbUrl))
    .replace(/\{\{GAME_SLUG\}\}/g,        escAttr(game.slug))
    .replace(/\{\{GAME_DESCRIPTION\}\}/g, escHtml(game.description))
    .replace(/\{\{GAME_CATEGORY\}\}/g,    escAttr(cat.name))
    .replace(/\{\{CAT_SLUG\}\}/g,         escAttr(cat.slug))
    .replace(/\{\{GAME_ORIENTATION\}\}/g, isLandscape ? 'landscape' : 'all')
    .replace(/\{\{RELATED_HTML\}\}/g,     relatedHtml);

  const html = renderBase(baseTemplate, {
    title:              withBrand(`Play ${game.title} Free Online`),
    description:        game.description,
    keywords:           `${game.title}, play ${game.title} free, browser game, no download`,
    canonical,
    robotsMeta:         '<meta name="robots" content="index, follow">',
    ogTitle:            withBrand(`Play ${game.title} Free Online`),
    ogDescription:      game.description,
    ogUrl:              canonical,
    ogType:             'website',
    ogImage:            thumbUrl,
    twitterCard:        'summary_large_image',
    twitterTitle:       withBrand(`Play ${game.title} Free`),
    twitterDescription: game.description,
    twitterImage:       thumbUrl,
    schema,
    bodyClass:          'game-play-page',
    content,
  });

  fs.writeFileSync(path.join(distPlayDir, `${game.slug}.html`), html, 'utf8');
}

console.log(`Built: ${games.length} game play pages → dist/play/`);

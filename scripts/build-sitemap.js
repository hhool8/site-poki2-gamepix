'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const seoData   = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/seo.json'),   'utf8'));
const gamesData = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/games.json'), 'utf8'));

if (process.env.SITE_DOMAIN) {
  const newDomain = process.env.SITE_DOMAIN.replace(/\/$/, '');
  const oldDomain = seoData.site.domain;
  seoData.site.domain   = newDomain;
  gamesData.site.domain = newDomain;
  for (const p of seoData.pages) {
    if (p.canonical) p.canonical = p.canonical.replace(oldDomain, newDomain);
  }
}

const distDir = path.join(ROOT, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const today   = new Date().toISOString();
const entries = [];

function urlTag(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function fileLastMod(p) {
  try { return fs.statSync(p).mtime.toISOString(); } catch { return today; }
}

// Static pages
for (const p of seoData.pages) {
  if (p.indexable === false) continue;
  const outPath = path.join(distDir, p.outputFile);
  entries.push(urlTag(p.canonical, fileLastMod(outPath), p.changefreq || 'monthly', p.priority || '0.5'));
}

// Game pages intentionally excluded — sitemap was too large for Google Search Console
// Individual game pages are crawled via category page links instead

// Category pages
for (const c of gamesData.categories) {
  const p = path.join(distDir, 'category', `${c.slug}.html`);
  entries.push(urlTag(`${gamesData.site.domain}/category/${c.slug}`, fileLastMod(p), 'weekly', '0.7'));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Built: dist/sitemap.xml (${entries.length} URLs)`);

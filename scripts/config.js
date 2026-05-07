'use strict';

/**
 * config.js — Shared build configuration for gamepix.poki2.online
 *
 * Publisher SID: EO17I
 * Embed URL:  https://play.gamepix.com/{slug}/embed?sid=EO17I
 * Thumbnail:  https://img.gamepix.com/games/{slug}/icon/{slug}.png
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const seoData   = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/seo.json'),   'utf8'));
const gamesData = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/games.json'), 'utf8'));

// Publisher SID used in all embed URLs
const GAMEPIX_SID = process.env.GAMEPIX_SID || 'EO17I';

function normalizeThumbnailUrl(url, width = 320) {
  if (!url) return '';

  const raw = String(url).replace(/([?&])w==/g, '$1w=');
  const target = Math.max(1, Number(width) || 320);

  if (/([?&])w=\d+/i.test(raw)) {
    return raw.replace(/([?&])w=\d+/i, `$1w=${target}`);
  }

  return raw.includes('?') ? `${raw}&w=${target}` : `${raw}?w=${target}`;
}

// Apply env-var domain override (e.g. for staging)
if (process.env.SITE_DOMAIN) {
  const newDomain = process.env.SITE_DOMAIN.replace(/\/$/, '');
  const oldDomain = seoData.site.domain;

  seoData.site.domain     = newDomain;
  seoData.site.faviconUrl = newDomain + '/favicon.svg';
  gamesData.site.domain   = newDomain;

  for (const page of seoData.pages) {
    if (page.canonical) page.canonical = page.canonical.replace(oldDomain, newDomain);
    if (page.og && page.og.url)   page.og.url   = page.og.url.replace(oldDomain, newDomain);
    if (page.og && page.og.image) page.og.image = page.og.image.replace(oldDomain, newDomain);
  }
  console.log(`[config] SITE_DOMAIN override: ${newDomain}`);
}

module.exports = { seoData, gamesData, GAMEPIX_SID };

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
module.exports.escHtml = escHtml;
module.exports.normalizeThumbnailUrl = normalizeThumbnailUrl;

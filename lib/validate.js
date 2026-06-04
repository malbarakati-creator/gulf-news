// lib/validate.js
const TIERS = new Set(['must', 'notable', 'culture', 'radar']);
const BEATS = new Set(['energy', 'sovereign', 'markets', 'tech', 'realestate', 'aviation', 'culture']);
const TAGS = new Set(['new', 'has', 'advances']);

// Never allowed as a source. Semafor is the cross-check target, not a source.
const BLOCKED = ['semafor.com', 'gulfnews.com', 'gulftimes.com', 'arabianbusiness.com', 'traveltourworld.com'];

const RECENCY_DAYS = parseInt(process.env.RECENCY_DAYS || '5', 10);

export function extractJson(text) {
  if (!text) throw new Error('empty model response');
  let t = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('no JSON object found in model response');
  return JSON.parse(t.slice(start, end + 1));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function freshEnough(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false; // no valid date -> can't confirm fresh -> drop
  const d = new Date(dateStr + 'T00:00:00Z').getTime();
  const cutoff = Date.now() - RECENCY_DAYS * 86400000;
  return d >= cutoff && d <= Date.now() + 2 * 86400000; // not stale, not absurdly future
}

export function cleanSweep(parsed, fallbackTimestamp) {
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items = rawItems
    .filter((i) => i && typeof i.headline === 'string' && i.headline.trim() && typeof i.url === 'string' && i.url.trim())
    .map((i) => ({
      tier: TIERS.has(i.tier) ? i.tier : 'notable',
      beat: BEATS.has(i.beat) ? i.beat : 'markets',
      headline: String(i.headline).replace(/\s*[—–]\s*/g, ': ').trim(),
      source: String(i.source || '').trim(),
      url: String(i.url).trim(),
      lang: i.lang === 'AR' ? 'AR' : 'EN',
      date: /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : '',
      tag: TAGS.has(i.tag) ? i.tag : 'new',
      soWhat: '',
      directional: i.tier === 'radar' ? true : Boolean(i.directional),
    }))
    .filter((i) => {
      const host = hostOf(i.url);
      if (!host || BLOCKED.some((b) => host === b || host.endsWith('.' + b))) return false; // block Semafor + banned outlets
      if (!freshEnough(i.date)) return false; // enforce recency
      return true;
    });

  return { generatedAt: parsed?.generatedAt || fallbackTimestamp, items };
}

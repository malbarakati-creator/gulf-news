// lib/validate.js
// Pulls the JSON object out of Claude's reply and hardens it so a malformed or
// partial response can never render a broken board.

const TIERS = new Set(['must', 'notable', 'culture', 'radar']);
const BEATS = new Set(['energy', 'sovereign', 'markets', 'tech', 'realestate', 'aviation', 'culture']);
const TAGS = new Set(['new', 'has', 'advances']);

// Find the JSON object inside a possibly-chatty / fenced reply.
export function extractJson(text) {
  if (!text) throw new Error('empty model response');
  let t = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('no JSON object found in model response');
  }
  return JSON.parse(t.slice(start, end + 1));
}

// Keep only well-formed items; coerce the small stuff to safe defaults.
export function cleanSweep(parsed, fallbackTimestamp) {
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items = rawItems
    .filter((i) => i && typeof i.headline === 'string' && i.headline.trim() && typeof i.url === 'string' && i.url.trim())
    .map((i) => ({
      tier: TIERS.has(i.tier) ? i.tier : 'notable',
      beat: BEATS.has(i.beat) ? i.beat : 'markets',
      headline: String(i.headline).replace(/\s*[—–]\s*/g, ': ').trim(), // strip em/en dashes per house style
      source: String(i.source || '').trim(),
      url: String(i.url).trim(),
      lang: i.lang === 'AR' ? 'AR' : 'EN',
      date: /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : '',
      tag: TAGS.has(i.tag) ? i.tag : 'new',
      soWhat: '',
      directional: i.tier === 'radar' ? true : Boolean(i.directional),
    }));

  return {
    generatedAt: parsed?.generatedAt || fallbackTimestamp,
    items,
  };
}

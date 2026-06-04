// api/latest.js
// Serves the most recently stored sweep to the dashboard. Cheap, public, read-only.
// If no sweep has run yet, returns an empty board with a hint (never an error page).

import { readLatest } from '../lib/store.js';

export default async function handler(req, res) {
  try {
    const data = await readLatest();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    if (!data) {
      return res.status(200).json({
        generatedAt: null,
        items: [],
        status: 'no-sweep-yet',
      });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('latest failed:', err);
    return res.status(200).json({ generatedAt: null, items: [], status: 'error', detail: String(err?.message || err) });
  }
}

// api/sweep.js
// Runs the sweep: calls Claude with web search, validates the JSON, stores it,
// and returns it. Triggered daily by Vercel Cron, or on demand from the
// dashboard's "Force a fresh sweep" button (which must send the secret).
//
// Protected by CRON_SECRET so the public can't run up your API bill.

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '../lib/prompt.js';
import { extractJson, cleanSweep } from '../lib/validate.js';
import { saveLatest } from '../lib/store.js';

export const config = { maxDuration: 60 }; // raise to 300 on Vercel Pro for deeper sweeps

export default async function handler(req, res) {
  // --- auth ---------------------------------------------------------------
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set' });
  }

  const model = process.env.SWEEP_MODEL || 'claude-sonnet-4-6';
  const maxUses = parseInt(process.env.WEB_SEARCH_MAX_USES || '15', 10);
  const now = new Date();

  try {
    const anthropic = new Anthropic({ apiKey });

    const resp = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(now) }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
    });

    // Concatenate the assistant's text blocks (web search runs server-side and
    // the final answer comes back as text in the same response).
    const text = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const parsed = extractJson(text);
    const sweep = cleanSweep(parsed, now.toISOString());
    sweep.model = model;

    if (!sweep.items.length) {
      // Don't overwrite a good board with an empty one; report instead.
      return res.status(502).json({ error: 'sweep produced no usable items', generatedAt: sweep.generatedAt });
    }

    await saveLatest(sweep);
    return res.status(200).json(sweep);
  } catch (err) {
    console.error('sweep failed:', err);
    return res.status(500).json({ error: 'sweep failed', detail: String(err?.message || err) });
  }
}

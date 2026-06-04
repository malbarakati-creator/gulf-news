// scripts/run-sweep.mjs
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from '../lib/prompt.js';
import { extractJson, cleanSweep } from '../lib/validate.js';
import { saveLatest } from '../lib/store.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

const model = process.env.SWEEP_MODEL || 'claude-sonnet-4-6';
const maxUses = parseInt(process.env.WEB_SEARCH_MAX_USES || '30', 10);
const now = new Date();

console.log(`Running Gulf sweep — model=${model}, maxSearches=${maxUses}, date=${now.toISOString()}`);

try {
  const anthropic = new Anthropic({ apiKey });

  const resp = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(now) }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
  });

  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const parsed = extractJson(text);
  const sweep = cleanSweep(parsed, now.toISOString());
  sweep.model = model;

  if (!sweep.items.length) {
    console.error('Sweep produced no usable items — leaving the previous board in place.');
    process.exit(1);
  }

  const url = await saveLatest(sweep);
  console.log(`Saved ${sweep.items.length} items to ${url}`);
} catch (err) {
  console.error('Sweep failed:', err?.message || err);
  process.exit(1);
}

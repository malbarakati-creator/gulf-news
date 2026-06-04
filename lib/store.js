// lib/store.js
// Tiny persistence layer over Vercel Blob. We keep exactly one file —
// sweeps/latest.json — overwriting it each run. The dashboard reads it back.
//
// Vercel auto-injects BLOB_READ_WRITE_TOKEN once you create a Blob store in the
// project's Storage tab, so there is nothing to configure in code.

import { put, list } from '@vercel/blob';

const PATHNAME = 'sweeps/latest.json';

// Save the latest sweep. Short CDN cache so a fresh run shows up quickly.
export async function saveLatest(data) {
  const body = JSON.stringify(data);
  const blob = await put(PATHNAME, body, {
    access: 'public',
    addRandomSuffix: false, // stable pathname so we always overwrite the same file
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 300, // 5 minutes
  });
  return blob.url;
}

// Read the latest sweep, or null if none has been stored yet.
export async function readLatest() {
  const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

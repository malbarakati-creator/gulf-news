# Gulf Morning Sweep — live, self-updating dashboard

This turns your manual paste-the-JSON dashboard into a **live board your team bookmarks**. Every morning it runs the sweep itself (Claude + web search, driven by your editorial brief), stores the result, and shows the same board to everyone who opens the URL. No pasting.

You don't need to be a developer to set this up. It's all clicking through three free accounts and pasting two secret values. Budget **about 30–45 minutes** the first time. After that it runs on its own.

---

## What this is, in plain language

Three pieces work together:

1. **The sweep job** (`api/sweep.js`) — calls Claude with web search, using your brief (in `lib/prompt.js`) as the instructions, and gets back the briefing as structured data. Your API key stays on the server, never in the web page.
2. **A daily timer** (in `vercel.json`) — fires the sweep once every morning and saves the result.
3. **The dashboard** (`public/index.html`) — your exact existing design, changed so it loads the latest saved sweep automatically when anyone opens it. It has a **Refresh** button (re-loads the saved board) and a **Force a fresh sweep** button (runs a brand-new sweep on demand, key-protected).

The editorial quality is preserved on purpose: the sweep goes through Claude with live web search and your full brief — lens, all six GCC states, Arabic sources, the mandatory culture pass, recency rule, excluded sources, and the Semafor cross-check. It is **not** a keyword or RSS filter.

---

## What you'll need (all have free tiers)

- An **Anthropic account** with a small amount of billing added — this is the only thing that costs money (roughly **$15–30/month**, see costs below).
- A **GitHub account** — free. Stores the code.
- A **Vercel account** — free. Hosts the site and runs the daily timer.

You'll create all three below. You do **not** need to install anything on your computer.

---

## Setup, step by step

### Part 1 — Get your Anthropic API key

1. Go to **https://console.anthropic.com** and sign up / log in.
2. Open **Billing** (left sidebar) and add a payment method with a little credit (e.g. $20). The sweep can't run without billing enabled.
3. Open **API Keys** → **Create Key**. Name it `gulf-sweep`. Copy the key (starts with `sk-ant-`) somewhere safe — **you can't see it again later.**

### Part 2 — Put the code on GitHub

1. Go to **https://github.com** and sign up / log in.
2. Click **+** (top right) → **New repository**. Name it `gulf-sweep-live`, set it **Private**, click **Create repository**.
3. On the new repo's page, click **uploading an existing file** (the link in the "Quick setup" box).
4. Drag in **all the contents of this `gulf-sweep-live` folder** (the `api`, `lib`, and `public` folders, plus `vercel.json`, `package.json`, `.gitignore`, `.env.example`, and this `README.md`). Wait for them to finish uploading.
   - Tip: drag the folders themselves, or open them and drag the files — GitHub keeps the structure. Do **not** upload an `.env` file with real secrets.
5. Click **Commit changes**.

### Part 3 — Connect Vercel and deploy

1. Go to **https://vercel.com** → **Sign Up** → **Continue with GitHub** (easiest — links the two accounts).
2. Click **Add New… → Project**. Find `gulf-sweep-live` in your repo list → **Import**.
3. Leave all the build settings at their defaults (Vercel detects it automatically — there's no build step). **Don't deploy yet if it lets you add env vars first; otherwise deploy and add them next.** Click **Deploy**.
4. The first deploy will succeed but the board will say "No sweep stored yet" — that's expected. Finish the next two parts.

### Part 4 — Create the storage (Vercel Blob)

This is where each day's sweep is saved.

1. In your Vercel project, open the **Storage** tab → **Create Database** → choose **Blob** → **Continue** → **Create**.
2. When it asks to connect it to this project, say yes. Vercel automatically adds a `BLOB_READ_WRITE_TOKEN` to your project — **you don't have to copy anything.**

### Part 5 — Add your secrets

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Add these two (apply to **Production**, **Preview**, and **Development**):

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | the `sk-ant-…` key from Part 1 |
   | `CRON_SECRET` | a long random password you invent (e.g. 30+ random characters). This protects the sweep and is what you'll type into "Force a fresh sweep". |

3. (Optional) `SWEEP_MODEL` and `WEB_SEARCH_MAX_USES` — leave unset to use the defaults (`claude-sonnet-4-6`, 15 searches).
4. Go to the **Deployments** tab → on the latest deployment click the **⋯** menu → **Redeploy** so the new variables take effect.

### Part 6 — Run it once and bookmark it

1. Your site URL is shown on the project's **Overview** page (something like `https://gulf-sweep-live.vercel.app`). Open it.
2. Click **Force a fresh sweep**, paste your `CRON_SECRET` when asked. Wait up to a minute — the board fills in. (The daily timer will do this for you every morning from now on.)
3. Bookmark the URL and share it with your team. Everyone sees the same board.

That's it. You're live.

---

## The daily schedule

The timer is set to **03:00 UTC = 6:00 a.m. in Riyadh (7:00 a.m. in the UAE)**.

To change it, edit `vercel.json` on GitHub. The five numbers are `minute hour day month weekday` in **UTC**:

- `"0 3 * * *"` → 06:00 Riyadh / 07:00 UAE (current)
- `"0 2 * * *"` → 05:00 Riyadh / 06:00 UAE
- `"0 4 * * *"` → 07:00 Riyadh / 08:00 UAE

After editing on GitHub and committing, Vercel redeploys automatically and picks up the new time. (Vercel's free Hobby plan allows one daily cron, which is exactly what this uses.)

---

## What it costs

- **Hosting (Vercel):** free on the Hobby plan.
- **Storage (Vercel Blob):** effectively free at this size (one small file).
- **Claude API:** the only real cost. A daily sweep is mostly **web-search calls** (about $10 per 1,000 searches) plus a modest amount of text. At ~15 searches/day that's roughly **$0.30–$0.70 per day**, so **about $15–30/month**. Each time someone clicks "Force a fresh sweep" runs another sweep (~$0.30–$0.70), so use it sparingly.
- Set a **spend limit** in the Anthropic console (Billing → Limits) so there are no surprises.

### Going deeper (optional, costs more)

The free Vercel plan caps a single run at **60 seconds**, which is why the default is 15 searches. If sweeps feel thin or occasionally time out and you want wider coverage:

1. Upgrade to **Vercel Pro** ($20/month), then in `api/sweep.js` change `maxDuration: 60` to `maxDuration: 300`.
2. Add the env var `WEB_SEARCH_MAX_USES = 30` in Vercel and redeploy.

This roughly doubles the API cost per sweep but lets it search the long tail (all six states, Arabic market filings, the culture pass) more thoroughly.

---

## Editing the sweep (it's yours)

Everything editorial lives in **`lib/prompt.js`** — the lens, the source list, the beats, the recency rule, the exclusions, the Semafor cross-check. Edit it on GitHub anytime (e.g. "more culture today," add or cut a source, tighten recency). Commit, and Vercel redeploys automatically. You don't touch any other file to change what the sweep does.

The dashboard's look, tiers, beat tabs, and tag legend are in `public/index.html` and are unchanged from your original.

---

## What could break, and how to fix it

| Symptom | Likely cause | Fix |
|---|---|---|
| Board says "No sweep stored yet" and stays that way | Timer hasn't fired yet, or storage/secret missing | Click "Force a fresh sweep". If it errors, recheck Parts 4–5. |
| "Force a fresh sweep" says the key didn't match | Wrong `CRON_SECRET` | Re-enter it; confirm it matches the value in Vercel Settings. |
| Sweep errors with an auth/billing message | API key expired, or Anthropic billing/credit ran out | Add credit or make a new key in the Anthropic console, update `ANTHROPIC_API_KEY` in Vercel, redeploy. |
| Sweeps time out or come back thin | 60s limit on the free plan | Lower expectations, or do the "Going deeper" upgrade above. |
| A source stops showing up / links look off | A site changed its layout, or `SWEEP_MODEL` / the web-search tool version aged out | Sources self-heal (Claude searches live). If the model name or `web_search_20250305` tool version is ever rejected, update them in `api/sweep.js` to the current ones from Anthropic's docs. |
| Daily board didn't update one morning | A single failed run (network/API blip) | The board keeps the last good sweep rather than going blank. Click "Force a fresh sweep," or wait for the next morning. |

**Your job to maintain over time:** keep a little credit in the Anthropic account, and once in a long while bump the model name or web-search tool version in `api/sweep.js` if Anthropic retires the current ones. Everything else runs itself.

---

## File map (for reference)

```
gulf-sweep-live/
├─ index.html           ← the dashboard (your original design, now fetches live)
├─ api/
│  ├─ sweep.js          ← runs the sweep, stores it (daily + on-demand)
│  └─ latest.js         ← serves the stored sweep to the page
├─ lib/
│  ├─ prompt.js         ← YOUR editorial brief (edit here to tune the sweep)
│  ├─ validate.js       ← cleans Claude's output so the board never breaks
│  └─ store.js          ← saves/reads the latest sweep in Vercel Blob
├─ vercel.json          ← the daily timer (cron schedule)
├─ package.json         ← lists the two code libraries used
├─ .env.example         ← the secrets to set in Vercel (reference only)
└─ .gitignore
```

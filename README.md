# Quote Board

Community quotes page. Members post a name, a quote and optional video wishes (song, background, text colour, notes). Everyone rates quotes, and a Top section ranks the best. Copy any quote, or several at once, to the clipboard to make Shorts.

Telegram private channel = permanent archive. Cloudflare Worker = safe backend (keeps your bot token secret). GitHub Pages = free hosting. Works as a website, an installable PWA and an Android APK.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (UI + logic) |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | PWA install and offline shell |
| `worker.js` | Cloudflare Worker backend |
| `package.json`, `capacitor.config.json` | APK build config |
| `build-apk.yml` | GitHub Action that builds the APK (goes in `.github/workflows/`) |

## 1. Telegram

1. Open @BotFather, send `/newbot`, and copy the **bot token**.
2. Create a private channel and add the bot as an **admin** with permission to post and edit messages.
3. Get the channel ID (starts with `-100`). Forward a channel message to @userinfobot or @RawDataBot to read it.

## 2. Cloudflare Worker

1. Cloudflare dashboard > Workers & Pages > KV > **Create namespace** (e.g. `quotes`).
2. Workers & Pages > **Create Worker**, paste in `worker.js`, deploy.
3. Worker > Settings > **Bindings** > add KV namespace with variable name `DB`.
4. Worker > Settings > **Variables and Secrets** > add secrets:
   - `BOT_TOKEN`: your bot token
   - `CHAT_ID`: your channel ID
   - `ADMIN`: (optional) a password for deleting quotes
5. Copy the Worker URL (`https://something.workers.dev`).

## 3. Website (GitHub Pages)

1. In `index.html`, set `const API='...'` to your Worker URL.
2. Create a GitHub repo and upload all the files from the table above (except `build-apk.yml` for now).
3. Settings > Pages > Source: **main** branch, root. Save.
4. Your link will be `https://USERNAME.github.io/REPO/`. Pin it in your community.

## 4. Install as an app (PWA)

Open the link in Android Chrome > menu (⋮) > **Install app**.

## 5. Build the APK

1. Create the folder path `.github/workflows/` in the repo and add `build-apk.yml` there.
2. Repo > **Actions** > Build APK > **Run workflow**.
3. When it finishes, open the run and download the `quote-board-apk` artifact.
4. Unzip and install `app-debug.apk` on your phone (allow installs from unknown sources).

This is a debug APK, good for sharing and testing. A signed release build is needed for the Play Store.

## How ranking works

Score = `(votes x average + 3 x 3.5) / (votes + 3)`. This keeps a single 5-star vote from beating a quote with many good votes.

## Using it

- **Post tab:** name, quote and optional video wishes.
- **Top tab:** filter by Today, This week or All time.
- **Copy:** copies the quote and name. **Copy + wishes** also adds the song, background, colour and notes.
- **Select several:** tick the checkboxes, then tap **Copy selected**.

## Limits and notes

- One post per minute per IP, 280 characters per quote, one vote per device (a vote can be changed).
- The Worker keeps the latest 2000 quotes in KV. Telegram keeps everything.
- Two votes at the exact same instant can occasionally overwrite each other. That is fine for community-sized groups.
- To delete a quote, send a POST to `/del` on the Worker with `{"id":"QUOTE_ID","key":"YOUR_ADMIN"}`.
- Never put your bot token in `index.html`. It belongs only in the Worker secrets.

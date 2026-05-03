# tap-and-swipe-bot

Standalone Discord Gateway bot. Listens for `guildMemberAdd` and pings the Next.js
app's `/api/webhooks/discord/member-joined` endpoint with an HMAC-signed payload.

The endpoint then looks up the matching Whop membership by Discord ID and grants the
role + course access. This catches users who paid on Whop without their Discord
linked (Whop fires `membership.activated` with no Discord ID, so we can't grant
anything until they show up in the server).

## Required env vars

- `DISCORD_BOT_TOKEN`    — the same bot token the Next app uses
- `DISCORD_GUILD_ID`     — guild to listen on (other guilds are ignored)
- `APP_URL`              — base URL of the Next app, e.g. `https://tap-and-swipe.com`
- `DISCORD_BOT_SHARED_SECRET` — HMAC secret, must match the Next app

## Discord setup

The bot must have the **GUILD_MEMBERS** privileged intent enabled in the Discord
Developer Portal (Bot tab → "Privileged Gateway Intents" → enable "Server Members Intent").

## Local run

```bash
cd bot
npm install
DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... APP_URL=http://localhost:3000 \
  DISCORD_BOT_SHARED_SECRET=test node index.js
```

## Deploy on Coolify

Add a new Coolify resource pointing at this repo with `bot/Dockerfile` as the build
context. Set the env vars above. No exposed port required.

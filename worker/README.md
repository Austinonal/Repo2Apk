# Token worker (Cloudflare, free plan is enough)

Visitors use the site without any GitHub token; this worker holds one token and starts builds for them.

1. Create a **fine-grained token** on the account that owns the repo: only the repo `Austinonal/Repo2Apk`,
   permissions **Actions: Read and write**, **Contents: Read-only**.
2. From this folder:
   ```
   npx wrangler login
   npx wrangler secret put GH_TOKEN      # paste the token
   npx wrangler deploy                   # prints https://repo2app.<you>.workers.dev
   ```
3. Edit `ALLOW_ORIGIN` in `wrangler.toml` if the site is not at `https://austinonal.github.io`, then deploy again.
4. Put the printed URL into `config.js` (`WORKER_URL`) and commit. The token box disappears from the site.

Safety: only the site's origin may call it, inputs are validated like the workflow does, and it refuses new builds
while `MAX_RUNNING` (default 3) are already queued or running. It is a browser-side guard, not authentication:
anyone who scripts the request with a forged Origin can still start builds up to that limit.

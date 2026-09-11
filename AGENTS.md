<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## PageCow whitelist — `public/whitelist.json`

This Next.js site hosts the **master PageCow whitelist**, served live at `https://pagecow.com/whitelist.json`. That one file drives **two independent enforcement layers**:

1. **PageCow Browser** (sibling folder `pagecow-browser`, Electron): fetches the file at launch (`readWhitelistSeed` in `electron/src/main/settingsStore.js`). Its guard (`electron/src/main/whitelistEngine.js`) allows a URL when `hostname === allowed || hostname.endsWith('.' + allowed)` — **a parent domain approves all subdomains**. It checks **top-level navigations only** (`will-navigate` / `will-redirect` / `window.open`).
2. **PageCow OS firewall** (`pagecow-update-firewall`, installed by the OS bootstrap scripts; dnsmasq + nftables): builds a DNS allowlist from the same file (`sites[].domain` + `popularDomains` + `hiddenDomains` + `/etc/pagecow-firewall/extra-domains.txt`). Everything else fails DNS and is dropped at the network layer — **including subresources (JS, CSS, images, XHR)**. It refreshes 2 minutes after boot and every 24 h (systemd timer).

⚠️ Because of layer 2, a login page can load its HTML (main domain whitelisted) yet render **blank** when its CDN assets are blocked. When whitelisting a login/SSO flow, always add the **CDN domains of the auth pages**, not just the navigation hops — enumerate every request the flow makes (see debugging recipe below).

### File shape

- `categories`: display order for the browse/search UI.
- `sites[]`: user-visible `{ domain, category, title, description, tags[] }` — appears in search/browse.
- `popularDomains[]`: approved + shown in the popular row.
- `hiddenDomains[]`: **approved for browsing and the firewall but hidden from the catalog** — use this for login/auth infrastructure (SSO hops, auth CDNs).
- Entries are **bare hostnames** (no `https://`, no paths, no `www.`). Parent domains cover subdomains in both layers.

## Whitelist change workflow

1. Edit `public/whitelist.json`.
2. Validate JSON + simulate the browser's subdomain matching for every host the change is meant to cover:
   ```bash
   node -e "
   const w = require('./public/whitelist.json');
   const all = new Set([...w.sites.map(s=>s.domain), ...w.popularDomains, ...w.hiddenDomains]);
   const m = (h,d)=>h===d||h.endsWith('.'+d);
   for (const h of ['login.microsoftonline.com','aadcdn.msauth.net']) console.log(h, [...all].some(d=>m(h,d)));
   "
   ```
3. `npx tsc --noEmit`
4. `git add public/whitelist.json && git commit && git push origin main` (Vercel deploys automatically).
5. Verify the **live** file — this is what laptops actually fetch: `curl -s https://pagecow.com/whitelist.json` and confirm the new domains are present. If a customer is waiting: after the deploy, have them **reboot and wait ~5 minutes** (OS firewall refresh), then retry.

## Support lessons — login flows & blank pages (Sept 2026)

Clever "Sign in with Microsoft" showed a **blank page** at `login.microsoftonline.com/{tenant}/saml2?SAMLRequest=...` (correct tab title, empty body) on a customer laptop, but worked in every test build. Root cause: the **OS firewall blocked the sign-in page's CDNs** (`aadcdn.msauth.net`, `aadcdn.msftauth.net`, `aadcdn.msauthimages.net`) — the page's HTML loaded but its JS/CSS never did.

- **Fix (live)** — `hiddenDomains` now includes `msauth.net`, `msftauth.net`, `msauthimages.net` (parents), alongside the hop domains `login.microsoftonline.com`, `login.live.com`, `login.microsoft.com`, `account.live.com`, `account.microsoft.com`, `login.windows.net`, and `office.com` (bare `login.microsoftonline.com` 302s to `www.office.com/login`; without `office.com` that path is a silent blank page).
- **Debugging recipe for "blank page / blocked" reports**: run the packaged browser — `gh release download v1.0.17 --repo pagecow/pagecow-browser`, mount the dmg, launch with `--remote-debugging-port=9222` — attach CDP to the `webview` target, use `Network.setBlockedURLs` to simulate the OS firewall blocking candidate domains, navigate to the real URL, inspect `document.body` + network events. This reproduced the customer's exact blank page. Driver scripts live in `tmp/scratch/` (gitignored).
- **Canvas**: `canvas.instructure.com`'s public school-search page is retired/503 (Canvas-side change — "Canvas Lite is coming soon"). District Canvas instances (e.g. `paulding.instructure.com`) work — tell customers to use the direct URL. Canvas's search directory lists **districts only**: "Paulding" works, "East Paulding High School" returns nothing.

## Related repos & assets

- **Browser**: sibling folder `pagecow-browser` (Electron + React). Releases: `gh release list --repo pagecow/pagecow-browser` (macOS dmg / Linux deb + AppImage / Windows exe). Latest shipped: v1.0.17.
- The **OS bootstrap scripts** (`create-pagecow-os.sh`, `prepare-pagecow-oem-image.sh`) are maintained separately and are **not in these repos**.
- Keep scratch/debug artifacts in `tmp/scratch/` (gitignored; `tmp/` is in `.gitignore`).

# Agent Notify — web push (browser notifications)

_Added by Agent Notify (add-on: Web push, v1, base stack: Other — any framework (REST))._

This pull request lets your site turn on browser notifications and register
each browser with Native Notify as a **web** device. It is additive — nothing
existing is modified.

> **Do not commit real credentials.** `NN_APP_ID` and `NN_APP_TOKEN` are read from the app's own configuration at build/run time.

## What is in this PR

- `public/native-notify-sw.js` — the service worker. It must be served from the site ROOT as
  `/native-notify-sw.js` (it shows each push and opens its `data.url` on click).
- `native-notify/web/native-notify-web-push.js` — plain-JS module: `enableNativeNotifyWebPush`,
  `disableNativeNotifyWebPush`, `getWebPushState`, `isWebPushSupported`.
- `native-notify/web/NativeNotifyWebPush.jsx` — React / Next.js: `<NativeNotifyWebPushButton />`
  and the `useNativeNotifyWebPush` hook (`"use client"`).
- This guide.

## How it works

1. Registers `/native-notify-sw.js` (scope: the whole site).
2. Asks for notification permission — **from a click**: several browsers only
   show the prompt after a user gesture, so never call it on page load.
3. Fetches the app's VAPID public key from
   `GET /api/universal/web-push/keys/:appId/:appToken` and subscribes.
4. Registers the subscription:
   `POST /api/universal/device/register { appId, appToken, platform: "web", deviceId, subscriberId?, webPush }`.

The device id is this browser's `nn_web_device_id` (localStorage) — the same
key the notification bell reads its inbox under, so the bell shows exactly the
pushes this browser receives.

## Wire it up

### React / Next.js

`NativeNotifyWebPush.jsx` is a client component, so a Next.js App Router
layout or page can render it directly. Only `appId` and a credential are
required — prefer `webKey` (the PUBLISHABLE WEB KEY, safe in page source);
`appToken` keeps working for existing sites (JSDoc-typed — a strict
TypeScript project type-checks this as is):

```tsx
import NativeNotifyWebPushButton from "@/native-notify/web/NativeNotifyWebPush";

export function SiteHeader() {
  return (
    <header>
      {/* the rest of your header */}
      <NativeNotifyWebPushButton
        appId={process.env.NEXT_PUBLIC_NN_APP_ID}
        webKey={process.env.NEXT_PUBLIC_NN_WEB_KEY}
      />
    </header>
  );
}
```

For your own UI use the hook: `const push = useNativeNotifyWebPush({ appId, webKey });`
→ `push.supported`, `push.permission`, `push.subscribed`, `push.busy`,
`push.error`, `push.enable()` (call it from a click), `push.disable()`.

### Plain JS

```js
import { enableNativeNotifyWebPush } from "/native-notify/web/native-notify-web-push.js";

document.querySelector("#enable-push").addEventListener("click", async () => {
  const result = await enableNativeNotifyWebPush({ appId: NN_APP_ID, webKey: NN_WEB_KEY });
  if (!result.ok) console.warn(result.message);
});
```

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `appId` / `webKey` | — | Required. `webKey` is the app's PUBLISHABLE WEB KEY (dashboard → App keys) — safe in page source. `appToken` keeps working for sites that already use one. |
| `subscriberId` | — | Your own user id, so you can later push to this person by id. |
| `serviceWorkerPath` | `/native-notify-sw.js` | Where the worker is served. |
| `apiBase` | `https://app.nativenotify.com` | The Native Notify API. |

### Already have a service worker?

A site can have only **one service worker per scope**. If yours already has
one (a PWA / offline worker), do NOT register `/native-notify-sw.js` — copy
its two listeners (`push` and `notificationclick`) into your existing
worker and pass `serviceWorkerPath` with your worker's path.
`enableNativeNotifyWebPush` refuses (with that explanation) rather than
replace another worker.

## Checklist

- [ ] Point `appId` / `webKey` at your config (env vars, never committed) — `webKey` is the app's PUBLISHABLE WEB KEY from the dashboard's App keys (page-source safe)
- [ ] Serve `public/native-notify-sw.js` from the site root as /native-notify-sw.js (or add its listeners to your existing service worker)
- [ ] Render `<NativeNotifyWebPushButton />` (or call `enableNativeNotifyWebPush` from a click) — ask Agent Notify to mount it for you
- [ ] Click it in a browser, allow notifications, then send a test push from Agent Notify

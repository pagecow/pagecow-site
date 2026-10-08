# Agent Notify — notification bell + inbox (web)

_Added by Agent Notify (add-on: Notification bell + inbox (web), v1, base stack: Other — any framework (REST) — best guess: Next.js)._

This pull request adds the web bell + inbox widget: a bell button with an
unread badge and an inbox panel (list, read/unread, delete, deep links) that
talks to the universal inbox API. It is additive — nothing existing is
modified.

> **Do not commit real credentials.** `NN_APP_ID` and `NN_APP_TOKEN` are read from the app's own configuration at build/run time.

## What is in this PR

- `native-notify/web/native-notify-bell.js` — plain-JS ES module (no dependencies, no build step).
- `native-notify/web/NativeNotifyBell.jsx` — React / Next.js component + the `useNativeNotifyInbox` headless hook.
- `native-notify/web/nativeNotifyBell.css` — styles and theming (one stylesheet for both entry points).
- This guide.

## How it reads the inbox

The widget is a thin client of the **universal inbox API** — a per-device
inbox. A device only ever sees its own entries:

| Call | Endpoint |
| --- | --- |
| List | `GET /api/universal/inbox/:appId/:appToken?deviceId=&take=&skip=` (200; `take` 1..200, default 50) |
| Unread count | `GET /api/universal/inbox/:appId/:appToken/unread-count?deviceId=` |
| Mark one read | `POST /api/universal/inbox/read` `{ appId, appToken, deviceId, entryId }` |
| Mark all read | `POST /api/universal/inbox/read-all` `{ appId, appToken, deviceId }` |
| Delete one | `POST /api/universal/inbox/delete` `{ appId, appToken, deviceId, entryId }` (soft, idempotent) |
| Clear | `POST /api/universal/inbox/clear` `{ appId, appToken, deviceId }` (soft, idempotent) |

`deviceId` is the stable key universal registration stored the device under.
A browser cannot register itself (universal devices carry APNs/FCM tokens), so
the site either:

- **shows the same inbox as the app** — pass the device id your backend knows
  for the logged-in user (`deviceId` or `getDeviceId`); or
- **keeps a per-browser key** (the default, persisted in `localStorage`).

Read state is per entry on the server (`read_at`): opening the panel does NOT
mark everything read — a row is marked read when it is opened, and "Mark all
read" is an explicit action. The unread badge polls (default every 30s, paused
while the tab is hidden); the API has no SSE channel.

## Wire it up

### React / Next.js

```jsx
import NativeNotifyBell from "./native-notify/web/NativeNotifyBell";
import "./native-notify/web/nativeNotifyBell.css";

// Values come from your configuration — never hardcode them:
//   NEXT_PUBLIC_NN_APP_ID / NEXT_PUBLIC_NN_APP_TOKEN
export function SiteHeader() {
  return (
    <header>
      {/* the rest of your header */}
      <NativeNotifyBell
        appId={process.env.NEXT_PUBLIC_NN_APP_ID}
        appToken={process.env.NEXT_PUBLIC_NN_APP_TOKEN}
        title="Notifications"
        theme={{ accent: "#2563eb" }}
      />
    </header>
  );
}
```

For a custom UI, use the headless hook instead:

```jsx
import { useNativeNotifyInbox } from "./native-notify/web/NativeNotifyBell";

const inbox = useNativeNotifyInbox({ appId, appToken, take: 20 });
// inbox.entries, inbox.unreadCount, inbox.loading, inbox.error,
// inbox.refresh, inbox.markRead, inbox.markAllRead, inbox.remove,
// inbox.clearInbox, inbox.loadMore
```

### Plain JS (any site, no build step)

```html
<link rel="stylesheet" href="/native-notify/web/nativeNotifyBell.css" />
<script type="module">
  import { mountNativeNotifyBell } from "/native-notify/web/native-notify-bell.js";

  mountNativeNotifyBell({
    appId: window.NN_CONFIG.appId,     // your config — never commit real values
    appToken: window.NN_CONFIG.appToken,
    title: "Notifications",
    position: "bottom-right",
  });
</script>
```

```js
// If your backend knows the user's registered device id, pass it in:
mountNativeNotifyBell({
  appId: NN_APP_ID,
  appToken: NN_APP_TOKEN,
  getDeviceId: async () => (await fetch("/api/me/device-id").then((r) => r.json())).deviceId,
});
```

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `appId` / `appToken` | — | Required. Read from your config; never committed. |
| `deviceId` / `getDeviceId` | per-browser key | Whose inbox to show. Pass the app's device id to share one inbox. |
| `take` | 20 | Rows per page (max 200). |
| `title` | "Notifications" | Panel header. |
| `emptyText` | "You are all caught up." | Empty state. |
| `showCount` | true | Numeric badge; `false` shows a plain dot. |
| `maxCount` | 99 | Badge cap ("99+"). |
| `allowDelete` | true | Show the per-row delete button. |
| `pollMs` | 30000 | Unread poll interval; `0` disables polling. |
| `theme` | light/dark defaults | Color override — see Themes. |
| `position` | "bottom-right" | Floating corner, or `mount` into your own header. |
| `onNotificationPress` | — | Called on every row click (before navigation). |
| `onNavigate` | — | Handle the deep link yourself; otherwise `pushData.url` opens. |
| `onUnreadChange` | — | Called with the unread count on every change. |

### Themes

Pass a subset of these keys — the widget sets the matching CSS custom
properties (`--nn-accent`, `--nn-surface`, `--nn-card`, `--nn-border`,
`--nn-title`, `--nn-text`, `--nn-muted`, `--nn-dot`, `--nn-badge-text`,
`--nn-delete`, `--nn-radius`) — or set them in your own CSS:

```js
theme: { accent: "#2563eb", dot: "#ef4444", radius: "14px", background: "#ffffff" }
```

### Deep links

Put a `url` inside the notification's `pushData` and the row opens it on
click (same-origin paths and http(s) URLs only):

```json
{ "title": "New service times", "message": "…", "pushData": { "url": "/news/service-times" } }
```

### Accessibility

- The bell is a real `<button>` with an `aria-label` that includes the unread
  count, `aria-haspopup="dialog"` and `aria-expanded`.
- The panel is `role="dialog"` (non-modal) labelled by its title; Escape and
  click-outside close it and focus returns to the bell.
- The unread count is announced through a polite live region; rows are buttons
  with readable labels; the only icon is decorative (`aria-hidden`).
- Respects `prefers-color-scheme` and `prefers-reduced-motion`.

## Checklist

- [ ] Point `appId` / `appToken` at your config (env vars, never committed)
- [ ] Decide the `deviceId`: the app's registered device id, or the per-browser default
- [ ] Import `nativeNotifyBell.css` (or copy its variables into your stylesheet)
- [ ] Mount the bell (React component or `mountNativeNotifyBell`)
- [ ] Send a test notification with `pushData.url` and click the row
- [ ] Run the accessibility pass (keyboard, screen reader, reduced motion)

/**
 * Native Notify — notification bell + inbox for a web site.
 *
 * Added by Agent Notify. A self-contained ES module: no dependencies, no build
 * step. It renders a bell button with an unread badge and an inbox panel
 * (list, per-row read state, delete, deep links) and talks to the universal
 * inbox API:
 *
 *   GET  /api/universal/inbox/:appId/:appToken?deviceId=&take=&skip=
 *   GET  /api/universal/inbox/:appId/:appToken/unread-count?deviceId=
 *   POST /api/universal/inbox/read      { appId, appToken, deviceId, entryId }
 *   POST /api/universal/inbox/read-all  { appId, appToken, deviceId }
 *   POST /api/universal/inbox/delete    { appId, appToken, deviceId, entryId }
 *   POST /api/universal/inbox/clear     { appId, appToken, deviceId }
 *
 * Values come from your site's own configuration — never hardcode them here:
 *   NN_APP_ID     the Native Notify app id    (dashboard -> your app)
 *   NN_APP_TOKEN  the Native Notify app token (dashboard -> your app)
 *
 * Notes:
 *   - Entry text is written with textContent only, so notification content can
 *     never become markup.
 *   - Read state lives on the server (per entry, read_at). Opening the panel
 *     does NOT mark everything read; "Mark all read" is an explicit action.
 *   - The unread badge polls (default every 30s, paused while the tab is
 *     hidden) — the API has no SSE channel. The list refreshes when the panel
 *     opens, and when the unread count changes while it is open.
 *   - React / Next.js sites use NativeNotifyBell.jsx instead (same behavior,
 *     same class names, same stylesheet). This file is named
 *     native-notify-bell.js so that no two files here differ only by letter
 *     case: on a case-insensitive disk (macOS, Windows) an import of
 *     "./NativeNotifyBell" must never resolve to this module.
 */

const DEFAULT_API_BASE = 'https://app.nativenotify.com';
const DEFAULT_STORAGE_KEY = 'nn_web_device_id';

/**
 * One inbox row, as the universal inbox API returns it.
 * @typedef {Object} NativeNotifyInboxEntry
 * @property {number} entryId
 * @property {string | null} [title]
 * @property {string | null} [body]
 * @property {Record<string, unknown> | null} [data] The push's pushData — `data.url` is the deep link.
 * @property {string | null} [sentAt] ISO timestamp.
 * @property {string | null} [readAt] ISO timestamp, null while unread.
 * @property {boolean} [read]
 */

/**
 * One page of the inbox.
 * @typedef {Object} NativeNotifyInboxPage
 * @property {NativeNotifyInboxEntry[]} [entries]
 * @property {number} [total]
 * @property {number} [unread]
 */

/**
 * The credential the web helpers accept: webKey (preferred — safe in page
 * source) or appToken (kept working for existing sites). One of the two is
 * required; the type says the same as the runtime (`webKey || appToken`).
 * @typedef {{ webKey: string | null | undefined, appToken?: string | null | undefined } | { appToken: string | null | undefined, webKey?: string | null | undefined }} NativeNotifyWebCredential
 */

/**
 * Options for createInboxClient. Only appId and a credential are required —
 * prefer webKey (the publishable web key); appToken still works for sites
 * that already embed one.
 * @typedef {Object} NativeNotifyInboxClientOptionsBase
 * @property {string | number | null | undefined} appId Your Native Notify app id (from config).
 * @property {string | null | undefined} [webKey] Your PUBLISHABLE WEB KEY (`nnweb_…`, from the dashboard's App keys) — preferred: safe in page source.
 * @property {string | null | undefined} [appToken] Your Native Notify app token — kept working for existing sites, but it can send to everyone, so do not put it in page source.
 * @property {string | null | undefined} [deviceId] Whose inbox to show (default: this browser's id).
 * @property {(() => string | null | undefined | Promise<string | null | undefined>) | undefined} [getDeviceId] Resolve the device id yourself (e.g. per logged-in user).
 * @property {string | undefined} [storageKey] localStorage key for the per-browser id.
 * @property {string | undefined} [apiBase] Defaults to https://app.nativenotify.com.
 * @property {typeof fetch | undefined} [fetch] Custom fetch (tests, proxies).
 */

/** @typedef {NativeNotifyInboxClientOptionsBase & NativeNotifyWebCredential} NativeNotifyInboxClientOptions */

/**
 * The inbox API client.
 * @typedef {Object} NativeNotifyInboxClient
 * @property {() => Promise<string>} resolveDeviceId
 * @property {(page?: { take?: number, skip?: number }) => Promise<NativeNotifyInboxPage>} list
 * @property {() => Promise<{ unread?: number }>} unreadCount
 * @property {(entryId: number) => Promise<unknown>} markRead
 * @property {() => Promise<unknown>} markAllRead
 * @property {(entryId: number) => Promise<unknown>} remove
 * @property {() => Promise<unknown>} clear
 */

/**
 * Color overrides — each key sets the matching --nn-* CSS custom property.
 * @typedef {Object} NativeNotifyTheme
 * @property {string} [accent]
 * @property {string} [background]
 * @property {string} [card]
 * @property {string} [border]
 * @property {string} [title]
 * @property {string} [text]
 * @property {string} [mutedText]
 * @property {string} [dot]
 * @property {string} [badgeText]
 * @property {string} [delete]
 * @property {string} [radius]
 */

/**
 * Options for createNativeNotifyBell / mountNativeNotifyBell. Only appId and
 * a credential are required — prefer webKey.
 * @typedef {Object} NativeNotifyBellOptionsBase
 * @property {string | number | null | undefined} appId Your Native Notify app id (from config).
 * @property {string | null | undefined} [webKey] Your PUBLISHABLE WEB KEY (`nnweb_…`) — preferred: safe in page source.
 * @property {string | null | undefined} [appToken] Your Native Notify app token — kept working for existing sites.
 * @property {string | null | undefined} [deviceId] Whose inbox to show (default: this browser's id).
 * @property {(() => string | null | undefined | Promise<string | null | undefined>) | undefined} [getDeviceId] Resolve the device id yourself.
 * @property {string | undefined} [storageKey] localStorage key for the per-browser id.
 * @property {string | undefined} [apiBase] Defaults to https://app.nativenotify.com.
 * @property {number | undefined} [take] Rows per page (default 20, max 200).
 * @property {string | undefined} [title] Panel header (default "Notifications").
 * @property {string | undefined} [emptyText] Empty-state text.
 * @property {boolean | undefined} [showCount] Numeric badge (default true; false = plain dot).
 * @property {number | undefined} [maxCount] Badge cap (default 99 → "99+").
 * @property {boolean | undefined} [allowDelete] Per-row delete button (default true).
 * @property {boolean | undefined} [showLoadMore] "Load more" button when more pages exist (default true).
 * @property {number | undefined} [pollMs] Unread poll interval (default 30000; 0 disables).
 * @property {NativeNotifyTheme | undefined} [theme] Color overrides.
 * @property {"bottom-right" | "bottom-left" | "top-right" | "top-left" | undefined} [position] Floating corner (default "bottom-right").
 * @property {Element | string | null | undefined} [mount] Element or selector to mount into (default <body>).
 * @property {((entry: NativeNotifyInboxEntry) => void) | undefined} [onNotificationPress] Called on every row click.
 * @property {((url: string, entry: NativeNotifyInboxEntry) => void) | undefined} [onNavigate] Handle the deep link yourself; else data.url is opened.
 * @property {((count: number) => void) | undefined} [onUnreadChange] Called with the unread count on every change.
 * @property {((error: unknown) => void) | undefined} [onError] Called when a request fails.
 * @property {typeof fetch | undefined} [fetch] Custom fetch (tests, proxies).
 * @property {NativeNotifyInboxClient | undefined} [client] A pre-built client (tests).
 * @property {Document | undefined} [document] For tests / iframes.
 * @property {Window | undefined} [window] For tests / iframes.
 */

/** @typedef {NativeNotifyBellOptionsBase & NativeNotifyWebCredential} NativeNotifyBellOptions */

/**
 * The controller a bell returns.
 * @typedef {Object} NativeNotifyBellController
 * @property {HTMLDivElement} root
 * @property {() => void} open
 * @property {() => void} close
 * @property {() => void} toggle
 * @property {() => Promise<NativeNotifyInboxEntry[]>} refresh
 * @property {() => Promise<number>} refreshUnread
 * @property {() => Promise<NativeNotifyInboxEntry[]>} loadMore
 * @property {() => NativeNotifyInboxEntry[]} getEntries
 * @property {(theme: NativeNotifyTheme | undefined) => void} setTheme
 * @property {() => void} destroy
 */

/** An API failure: the service's { error: { code, message } } envelope, never a stack trace. */
export class NativeNotifyRequestError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string | null} code
   */
  constructor(message, status, code) {
    super(message);
    this.name = 'NativeNotifyRequestError';
    /** @type {number} */
    this.status = status;
    /** @type {string | null} */
    this.code = code;
  }
}

/** @type {{ __nnFallbackDeviceKey?: string }} */
const nnGlobal = /** @type {any} */ (globalThis);

function randomKey() {
  return 'nn-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

/**
 * A stable per-browser device id, persisted in localStorage.
 *
 * A browser registers itself as a web device when the site runs the Connect
 * Web Push snippet (sw.js + subscribe) — that snippet stores its id under the
 * same 'nn_web_device_id' key this widget defaults to, so the bell shows
 * exactly the pushes this browser receives. Pass options.deviceId /
 * options.getDeviceId (the id your app registered) to show that app's inbox on
 * the site instead; with neither, each browser keeps its own key.
 * @param {string} [storageKey]
 * @returns {string}
 */
export function getStableDeviceKey(storageKey) {
  const key = storageKey || DEFAULT_STORAGE_KEY;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const fresh = randomKey();
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch (err) {
    // Private mode / storage disabled: keep one id for this page view.
    if (!nnGlobal.__nnFallbackDeviceKey) nnGlobal.__nnFallbackDeviceKey = randomKey();
    return nnGlobal.__nnFallbackDeviceKey;
  }
}

/**
 * Time formatting for inbox rows (falls back to the raw value).
 * @param {string | number | Date | null | undefined} value
 * @param {number} [now]
 * @returns {string}
 */
export function timeAgo(value, now) {
  if (value === null || value === undefined) return '';
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return typeof value === 'string' ? value : '';
  const minutes = Math.round(((now || Date.now()) - at) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + ' min ago';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hours / 24);
  if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
  return new Date(value).toLocaleDateString();
}

/**
 * The deep-link convention: pushData.url (also accepts pushData.deepLink).
 * @param {NativeNotifyInboxEntry | null | undefined} entry
 * @returns {string | null}
 */
export function entryUrl(entry) {
  const data = entry && entry.data;
  if (!data || typeof data !== 'object') return null;
  const url = data['url'];
  const deepLink = data['deepLink'];
  const raw = typeof url === 'string' ? url : typeof deepLink === 'string' ? deepLink : null;
  return raw && raw.trim() ? raw.trim() : null;
}

/**
 * Same-origin paths and http(s) URLs only — never javascript:/data: payloads.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (url.charAt(0) === '/' && url.charAt(1) !== '/') return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

/**
 * The API client behind both entry points (this file and the React component).
 * Every method resolves the device id, calls the endpoint, and throws a
 * NativeNotifyRequestError carrying { status, code, message } on failure — the
 * service's stable { error: { code, message } } envelope, never a raw stack
 * trace.
 * @param {NativeNotifyInboxClientOptions} options
 * @returns {NativeNotifyInboxClient}
 */
export function createInboxClient(options) {
  const opts = options || {};
  // 2026-09-29: the page-source-safe credential is the app's PUBLISHABLE WEB
  // KEY (`nnweb_…`) — it can read/mark only THIS device's inbox. Either name
  // is accepted and sent in the same appToken request field; webKey wins
  // when both are set, appToken keeps every existing site working.
  const credential = opts.webKey || opts.appToken;
  if (opts.appId === undefined || opts.appId === null || opts.appId === '' || !credential) {
    throw new Error('Native Notify: appId and webKey are required (read them from your config).');
  }
  const apiBase = String(opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const appId = String(opts.appId);
  const appToken = String(credential);
  /** @type {typeof fetch | null} */
  const doFetch =
    typeof opts.fetch === 'function'
      ? opts.fetch
      : typeof fetch === 'function'
        ? window.fetch.bind(window)
        : null;
  if (!doFetch) throw new Error('Native Notify: no fetch available — pass options.fetch.');
  const fetchImpl = doFetch;

  /** @type {string | null} */
  let cachedDeviceId = opts.deviceId ? String(opts.deviceId) : null;

  /** @returns {Promise<string>} */
  async function resolveDeviceId() {
    if (cachedDeviceId) return cachedDeviceId;
    const resolved =
      typeof opts.getDeviceId === 'function' ? await opts.getDeviceId() : getStableDeviceKey(opts.storageKey);
    cachedDeviceId = String(resolved || getStableDeviceKey(opts.storageKey));
    return cachedDeviceId;
  }

  /**
   * @param {string} path
   * @param {RequestInit | undefined} init
   * @returns {Promise<any>}
   */
  async function request(path, init) {
    const res = await fetchImpl(apiBase + path, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = json && json.error ? json.error : {};
      throw new NativeNotifyRequestError(
        detail.message || 'Native Notify request failed (HTTP ' + res.status + ').',
        res.status,
        detail.code || null
      );
    }
    return json;
  }

  /**
   * @param {string} action
   * @param {Record<string, unknown> | null} body
   */
  async function post(action, body) {
    const deviceId = await resolveDeviceId();
    return request('/api/universal/inbox/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ appId: opts.appId, appToken: opts.appToken, deviceId }, body || {})),
    });
  }

  return {
    resolveDeviceId,
    /** One page of this device's inbox, newest first. */
    async list(page) {
      const deviceId = await resolveDeviceId();
      const take = page && Number.isInteger(page.take) ? Number(page.take) : 20;
      const skip = page && Number.isInteger(page.skip) ? Number(page.skip) : 0;
      return request(
        '/api/universal/inbox/' +
          encodeURIComponent(appId) +
          '/' +
          encodeURIComponent(appToken) +
          '?deviceId=' +
          encodeURIComponent(deviceId) +
          '&take=' +
          take +
          '&skip=' +
          skip,
        undefined
      );
    },
    async unreadCount() {
      const deviceId = await resolveDeviceId();
      return request(
        '/api/universal/inbox/' +
          encodeURIComponent(appId) +
          '/' +
          encodeURIComponent(appToken) +
          '/unread-count?deviceId=' +
          encodeURIComponent(deviceId),
        undefined
      );
    },
    markRead: function (entryId) {
      return post('read', { entryId: entryId });
    },
    markAllRead: function () {
      return post('read-all', null);
    },
    remove: function (entryId) {
      return post('delete', { entryId: entryId });
    },
    clear: function () {
      return post('clear', null);
    },
  };
}

/**
 * A tiny element helper — textContent only, never innerHTML.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {Document} doc
 * @param {K} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The built-in bell icon (decorative — the button carries the aria-label).
 * @param {Document} doc
 * @returns {SVGSVGElement}
 */
function bellIcon(doc) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'nn-bell__icon');
  const path = doc.createElementNS(ns, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute(
    'd',
    'M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7.2-5.6v-1l-1.6-1.6V9.1A5.9 5.9 0 0 0 13.2 3.3V2.4a1.2 1.2 0 1 0-2.4 0v.9A5.9 5.9 0 0 0 6.4 9.1v4.7l-1.6 1.6v1Z'
  );
  svg.appendChild(path);
  return svg;
}

/**
 * CSS custom properties a theme override can set (names match the SDK).
 * @type {Record<string, string>}
 */
const THEME_VARS = {
  accent: '--nn-accent',
  background: '--nn-surface',
  card: '--nn-card',
  border: '--nn-border',
  title: '--nn-title',
  text: '--nn-text',
  mutedText: '--nn-muted',
  dot: '--nn-dot',
  badgeText: '--nn-badge-text',
  delete: '--nn-delete',
  radius: '--nn-radius',
};

let instanceCount = 0;

/**
 * Create a bell + inbox widget (see NativeNotifyBellOptions above; only appId
 * and a credential are required — prefer webKey).
 *
 * Returns { root, open, close, toggle, refresh, refreshUnread, loadMore,
 * getEntries, setTheme, destroy }.
 * @param {NativeNotifyBellOptions} options
 * @returns {NativeNotifyBellController}
 */
export function createNativeNotifyBell(options) {
  const opts = options || {};
  const doc = opts.document || document;
  const win = opts.window || window;
  const take = Number.isInteger(opts.take) ? Math.min(Math.max(Number(opts.take), 1), 200) : 20;
  const pollMs = opts.pollMs === 0 ? 0 : Math.max(10000, Number(opts.pollMs) || 30000);
  const maxCount = Number.isFinite(opts.maxCount) ? Number(opts.maxCount) : 99;
  const title = typeof opts.title === 'string' && opts.title ? opts.title : 'Notifications';
  const emptyText = typeof opts.emptyText === 'string' && opts.emptyText ? opts.emptyText : 'You are all caught up.';
  const showCount = opts.showCount !== false;
  const allowDelete = opts.allowDelete !== false;
  const showLoadMore = opts.showLoadMore !== false;
  const client =
    opts.client ||
    createInboxClient({
      appId: opts.appId,
      webKey: opts.webKey,
      appToken: opts.appToken,
      deviceId: opts.deviceId,
      getDeviceId: opts.getDeviceId,
      storageKey: opts.storageKey,
      apiBase: opts.apiBase,
      fetch: opts.fetch,
    });

  instanceCount += 1;
  const panelId = 'nn-bell-panel-' + instanceCount;

  /** @type {NativeNotifyInboxEntry[]} */
  let entries = [];
  let total = 0;
  let unread = 0;
  let open = false;
  let loading = false;
  let loadingMore = false;
  /** @type {string | null} */
  let errorText = null;
  /** @type {number | null} */
  let pollTimer = null;
  let destroyed = false;

  // ---- DOM ---------------------------------------------------------------
  const root = el(doc, 'div', 'nn-bell' + (opts.position ? ' nn-bell--' + opts.position : ' nn-bell--bottom-right'));
  const button = el(doc, 'button', 'nn-bell__button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panelId);
  button.appendChild(bellIcon(doc));
  const badge = el(doc, 'span', 'nn-bell__badge');
  badge.hidden = true;
  button.appendChild(badge);

  const panel = el(doc, 'div', 'nn-bell__panel');
  panel.id = panelId;
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', title);

  const header = el(doc, 'div', 'nn-bell__header');
  const heading = el(doc, 'span', 'nn-bell__title', title);
  const markAll = el(doc, 'button', 'nn-bell__mark-all', 'Mark all read');
  markAll.type = 'button';
  const closeBtn = el(doc, 'button', 'nn-bell__close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close notifications');
  header.appendChild(heading);
  header.appendChild(markAll);
  header.appendChild(closeBtn);

  const status = el(doc, 'p', 'nn-bell__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const list = el(doc, 'ul', 'nn-bell__list');
  const loadMore = el(doc, 'button', 'nn-bell__more', 'Load more');
  loadMore.type = 'button';
  loadMore.hidden = true;

  panel.appendChild(header);
  panel.appendChild(status);
  panel.appendChild(list);
  panel.appendChild(loadMore);
  root.appendChild(button);
  root.appendChild(panel);

  /** @param {NativeNotifyTheme | undefined} theme */
  function applyTheme(theme) {
    if (!theme) return;
    /** @type {Record<string, unknown>} */
    const values = /** @type {any} */ (theme);
    Object.entries(THEME_VARS).forEach(function ([key, cssVar]) {
      const value = values[key];
      if (value === undefined || value === null || value === '') return;
      root.style.setProperty(cssVar, String(value));
    });
  }
  applyTheme(opts.theme);

  // ---- rendering ---------------------------------------------------------
  function unreadLabel() {
    if (unread <= 0) return 'No unread notifications';
    return unread === 1 ? '1 unread notification' : unread + ' unread notifications';
  }

  function renderBadge() {
    button.setAttribute('aria-label', title + (unread > 0 ? ', ' + unreadLabel() : ''));
    if (unread <= 0) {
      badge.hidden = true;
      badge.textContent = '';
      return;
    }
    badge.hidden = false;
    badge.classList.toggle('nn-bell__badge--dot', !showCount);
    badge.textContent = showCount ? (unread > maxCount ? maxCount + '+' : String(unread)) : '';
    status.textContent = unreadLabel();
  }

  /** Status line + the "Mark all read" visibility — no row rebuild. */
  function renderStatus() {
    markAll.hidden = unread === 0;
    if (loading) {
      status.textContent = 'Loading notifications…';
      return;
    }
    if (errorText) {
      status.textContent = errorText;
      return;
    }
    status.textContent = open ? unreadLabel() : '';
  }

  function renderList() {
    while (list.firstChild) list.removeChild(list.firstChild);
    renderStatus();
    if (loading || errorText) {
      loadMore.hidden = true;
      return;
    }
    if (entries.length === 0) {
      const empty = el(doc, 'li', 'nn-bell__empty', emptyText);
      list.appendChild(empty);
      loadMore.hidden = true;
      return;
    }

    entries.forEach(function (entry) {
      const item = el(doc, 'li', 'nn-bell__item' + (entry.read ? '' : ' nn-bell__item--unread'));
      const main = el(doc, 'button', 'nn-bell__item-main');
      main.type = 'button';
      main.setAttribute('aria-label', (entry.read ? '' : 'Unread: ') + (entry.title || 'Notification'));
      const rowTitle = el(doc, 'span', 'nn-bell__item-title', entry.title || 'Notification');
      const rowBody = entry.body ? el(doc, 'span', 'nn-bell__item-body', entry.body) : null;
      const meta = el(doc, 'span', 'nn-bell__item-meta');
      const when = el(doc, 'span', 'nn-bell__item-time', timeAgo(entry.sentAt));
      meta.appendChild(when);
      if (!entry.read) meta.appendChild(el(doc, 'span', 'nn-bell__item-dot'));
      main.appendChild(rowTitle);
      if (rowBody) main.appendChild(rowBody);
      main.appendChild(meta);
      main.addEventListener('click', function () {
        openEntry(entry);
      });
      item.appendChild(main);

      if (allowDelete) {
        const remove = el(doc, 'button', 'nn-bell__item-delete', '×');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Delete notification');
        remove.addEventListener('click', function (event) {
          event.stopPropagation();
          deleteEntry(entry);
        });
        item.appendChild(remove);
      }
      list.appendChild(item);
    });

    loadMore.hidden = !showLoadMore || entries.length >= total;
  }

  // ---- state changes -----------------------------------------------------
  function notifyUnread() {
    renderBadge();
    if (typeof opts.onUnreadChange === 'function') {
      try {
        opts.onUnreadChange(unread);
      } catch (err) {
        /* consumer callback errors never break the widget */
      }
    }
  }

  /** @param {unknown} err */
  function reportError(err) {
    errorText = err instanceof Error && err.message ? err.message : 'Could not load notifications.';
    if (typeof opts.onError === 'function') {
      try {
        opts.onError(err);
      } catch (inner) {
        /* ignore */
      }
    }
  }

  /** @returns {Promise<number>} */
  async function refreshUnread() {
    if (destroyed) return unread;
    const before = unread;
    try {
      const res = await client.unreadCount();
      unread = Number(res && res.unread) || 0;
      errorText = null;
      notifyUnread();
    } catch (err) {
      reportError(err);
    }
    // The badge/status update live; rows are only rebuilt when the count
    // actually changed while the panel is open — a rebuild would drop the
    // reader's keyboard focus.
    if (open && unread !== before) renderList();
    else renderStatus();
    return unread;
  }

  /** @returns {Promise<NativeNotifyInboxEntry[]>} */
  async function refresh() {
    if (destroyed) return entries;
    loading = true;
    renderList();
    try {
      const page = await client.list({ take: take, skip: 0 });
      entries = (page && page.entries) || [];
      total = Number(page && page.total) || entries.length;
      unread = Number(page && page.unread) || 0;
      errorText = null;
      notifyUnread();
    } catch (err) {
      reportError(err);
    } finally {
      loading = false;
    }
    renderList();
    return entries;
  }

  /** @returns {Promise<NativeNotifyInboxEntry[]>} */
  async function loadMoreEntries() {
    if (destroyed || loadingMore) return entries;
    loadingMore = true;
    try {
      const page = await client.list({ take: take, skip: entries.length });
      entries = entries.concat((page && page.entries) || []);
      total = Number(page && page.total) || entries.length;
      errorText = null;
    } catch (err) {
      reportError(err);
    } finally {
      loadingMore = false;
    }
    renderList();
    return entries;
  }

  /**
   * @param {NativeNotifyInboxEntry} entry
   * @param {boolean} read
   */
  function setEntryRead(entry, read) {
    entry.read = read;
    entry.readAt = entry.readAt || new Date().toISOString();
  }

  /** @param {NativeNotifyInboxEntry} entry */
  async function markRead(entry) {
    if (!entry || entry.read) return;
    setEntryRead(entry, true);
    if (unread > 0) unread -= 1;
    notifyUnread();
    renderList();
    try {
      await client.markRead(entry.entryId);
    } catch (err) {
      reportError(err);
      await refresh();
    }
  }

  async function markEveryRead() {
    const before = unread;
    entries = entries.map(function (entry) {
      return Object.assign({}, entry, { read: true, readAt: entry.readAt || new Date().toISOString() });
    });
    unread = 0;
    notifyUnread();
    renderList();
    try {
      await client.markAllRead();
    } catch (err) {
      reportError(err);
      unread = before;
      notifyUnread();
      await refresh();
    }
  }

  /** @param {NativeNotifyInboxEntry} entry */
  async function deleteEntry(entry) {
    const index = entries.indexOf(entry);
    if (index < 0) return;
    entries.splice(index, 1);
    total = Math.max(0, total - 1);
    if (!entry.read && unread > 0) unread -= 1;
    notifyUnread();
    renderList();
    try {
      await client.remove(entry.entryId);
    } catch (err) {
      reportError(err);
      await refresh();
    }
  }

  /**
   * Click a row: mark read, then open its deep link (pushData.url).
   * @param {NativeNotifyInboxEntry} entry
   */
  function openEntry(entry) {
    const url = entryUrl(entry);
    Promise.resolve(markRead(entry)).then(function () {
      if (typeof opts.onNotificationPress === 'function') {
        opts.onNotificationPress(entry);
      }
      if (!url) return;
      if (typeof opts.onNavigate === 'function') {
        opts.onNavigate(url, entry);
        return;
      }
      if (isSafeUrl(url)) win.location.assign(url);
    });
  }

  // ---- open / close ------------------------------------------------------
  function openPanel() {
    if (open || destroyed) return;
    open = true;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    root.classList.add('nn-bell--open');
    panel.focus();
    refresh();
  }

  function closePanel() {
    if (!open || destroyed) return;
    open = false;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    root.classList.remove('nn-bell--open');
    button.focus();
  }

  function toggle() {
    if (open) closePanel();
    else openPanel();
  }

  // ---- events ------------------------------------------------------------
  /** @param {MouseEvent} event */
  function onDocumentClick(event) {
    if (!open) return;
    if (root.contains(/** @type {Node | null} */ (event.target))) return;
    closePanel();
  }
  /** @param {KeyboardEvent} event */
  function onDocumentKeydown(event) {
    if (event.key !== 'Escape' || !open) return;
    closePanel();
  }
  function onVisibility() {
    if (doc.hidden || destroyed) return;
    refreshUnread();
    if (open) refresh();
  }

  button.addEventListener('click', toggle);
  closeBtn.addEventListener('click', closePanel);
  markAll.addEventListener('click', markEveryRead);
  loadMore.addEventListener('click', loadMoreEntries);
  doc.addEventListener('click', onDocumentClick);
  doc.addEventListener('keydown', onDocumentKeydown);
  doc.addEventListener('visibilitychange', onVisibility);

  if (pollMs > 0) {
    // Unread-count polling only: the rows refresh when the panel opens (or
    // when the count changes while it is open — see refreshUnread).
    pollTimer = win.setInterval(function () {
      if (doc.hidden || destroyed) return;
      refreshUnread();
    }, pollMs);
  }

  // First paint: badge from the unread endpoint only (the list loads on open).
  refreshUnread();

  return {
    root: root,
    open: openPanel,
    close: closePanel,
    toggle: toggle,
    refresh: refresh,
    refreshUnread: refreshUnread,
    loadMore: loadMoreEntries,
    getEntries: function () {
      return entries.slice();
    },
    setTheme: function (theme) {
      applyTheme(theme);
    },
    destroy: function () {
      destroyed = true;
      if (pollTimer !== null) win.clearInterval(pollTimer);
      doc.removeEventListener('click', onDocumentClick);
      doc.removeEventListener('keydown', onDocumentKeydown);
      doc.removeEventListener('visibilitychange', onVisibility);
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

/**
 * Mount a bell + inbox widget into the page (options.mount — element or
 * selector; defaults to <body>). Returns the same controller as
 * createNativeNotifyBell.
 * @param {NativeNotifyBellOptions} options
 * @returns {NativeNotifyBellController}
 */
export function mountNativeNotifyBell(options) {
  const opts = options || {};
  const doc = opts.document || document;
  const mount = opts.mount;
  const target =
    typeof mount === 'string'
      ? doc.querySelector(mount)
      : mount && mount.nodeType === 1
        ? mount
        : doc.body;
  const bell = createNativeNotifyBell(opts);
  if (target) target.appendChild(bell.root);
  return bell;
}

/**
 * Native Notify — notification bell + inbox for React and Next.js.
 *
 * Added by Agent Notify. Self-contained: the only import is React. Two exports:
 *
 *   useNativeNotifyInbox(options)  — the headless hook (data + actions) for a
 *                                    custom UI.
 *   <NativeNotifyBell … />         — the drop-in bell + panel, same behavior
 *                                    and class names as the vanilla module
 *                                    (native-notify-bell.js), so it shares
 *                                    nativeNotifyBell.css.
 *
 * Next.js App Router: this file's "use client" directive makes it a client
 * component — import it from a server page and render it normally.
 *
 * Values come from your site's own configuration — never hardcode them here:
 *   NN_APP_ID / NN_APP_TOKEN   (NEXT_PUBLIC_NN_APP_ID / NEXT_PUBLIC_NN_APP_TOKEN
 *   in a Next.js app). See native-notify/web/README.md.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types (JSDoc — TypeScript reads these from this .jsx file, so a TypeScript
// app gets real prop types: only appId/appToken are required, every other
// prop is optional, and the headless hook's entries are typed).
// ---------------------------------------------------------------------------

/**
 * One inbox entry, as GET /api/universal/inbox/:appId/:appToken returns it.
 * @typedef {Object} NativeNotifyInboxEntry
 * @property {number} entryId
 * @property {number} appId
 * @property {string} deviceId
 * @property {string | null} subscriberId
 * @property {string} environment
 * @property {string} title
 * @property {string} body
 * @property {Record<string, any>} data  The send's pushData (deep link: data.url or data.deepLink).
 * @property {string} audienceType
 * @property {string} source
 * @property {string} sentAt  ISO timestamp.
 * @property {string | null} readAt
 * @property {boolean} read
 */

/**
 * Color / radius overrides — each key sets a CSS custom property.
 * @typedef {Object} NativeNotifyBellTheme
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
 * @typedef {Object} NativeNotifyInboxOptions
 * @property {string | number | undefined} appId
 * @property {string | undefined} appToken
 * @property {string} [deviceId]  Defaults to a stable per-browser id (localStorage).
 * @property {string} [storageKey]  localStorage key for that id (default "nn_web_device_id").
 * @property {string} [apiBase]  Default "https://app.nativenotify.com".
 * @property {number} [take]  Page size (default 20).
 * @property {number} [pollMs]  Unread polling interval; 0 turns polling off (default 30000).
 * @property {typeof fetch} [fetch]  Custom fetch (tests, proxies).
 */

/**
 * @typedef {Object} NativeNotifyInbox
 * @property {string | null} deviceId
 * @property {NativeNotifyInboxEntry[]} entries
 * @property {number} total
 * @property {number} unreadCount
 * @property {boolean} loading
 * @property {string | null} error
 * @property {() => Promise<void>} refresh
 * @property {() => Promise<void>} refreshUnread
 * @property {(entry: NativeNotifyInboxEntry) => Promise<void>} markRead
 * @property {() => Promise<void>} markAllRead
 * @property {(entry: NativeNotifyInboxEntry) => Promise<void>} remove
 * @property {() => Promise<void>} clearInbox
 * @property {() => Promise<void>} loadMore
 */

/**
 * @typedef {NativeNotifyInboxOptions & {
 *   title?: string,
 *   emptyText?: string,
 *   showCount?: boolean,
 *   maxCount?: number,
 *   allowDelete?: boolean,
 *   theme?: NativeNotifyBellTheme,
 *   position?: "bottom-right" | "bottom-left" | "top-right" | "top-left",
 *   onNotificationPress?: (entry: NativeNotifyInboxEntry) => void,
 *   onNavigate?: (url: string, entry: NativeNotifyInboxEntry) => void,
 *   onUnreadChange?: (count: number) => void,
 *   className?: string,
 * }} NativeNotifyBellProps
 */

const DEFAULT_API_BASE = 'https://app.nativenotify.com';
const DEFAULT_STORAGE_KEY = 'nn_web_device_id';

function randomKey() {
  return "nn-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

/**
 * A stable per-browser device id, persisted in localStorage.
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
    if (!globalThis.__nnFallbackDeviceKey) globalThis.__nnFallbackDeviceKey = randomKey();
    return globalThis.__nnFallbackDeviceKey;
  }
}

/** Time formatting for inbox rows (falls back to the raw value). */
export function timeAgo(value) {
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return typeof value === "string" ? value : "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hours / 24);
  if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(value).toLocaleDateString();
}

/** The deep-link convention: pushData.url (also accepts pushData.deepLink). */
export function entryUrl(entry) {
  const data = entry && entry.data;
  if (!data || typeof data !== "object") return null;
  const raw = typeof data.url === "string" ? data.url : typeof data.deepLink === "string" ? data.deepLink : null;
  return raw && raw.trim() ? raw.trim() : null;
}

/** Same-origin paths and http(s) URLs only — never javascript:/data: payloads. */
export function isSafeUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.charAt(0) === "/" && url.charAt(1) !== "/") return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (err) {
    return false;
  }
}

/**
 * The headless hook: inbox data + actions for a custom UI. Mirrors the data
 * the API returns — read is per entry (server-side read_at), so opening the
 * panel does not mark anything read.
 *
 * @param {NativeNotifyInboxOptions} options
 * @returns {NativeNotifyInbox}
 */
export function useNativeNotifyInbox(options) {
  const {
    appId,
    appToken,
    deviceId: deviceIdOption,
    storageKey,
    apiBase,
    take = 20,
    pollMs = 30000,
    fetch: fetchOption,
  } = options || {};

  const [deviceId, setDeviceId] = useState(/** @type {string | null} */ (deviceIdOption ? String(deviceIdOption) : null));
  const [entries, setEntries] = useState(/** @type {NativeNotifyInboxEntry[]} */ ([]));
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  // Stable identity: a fresh wrapper on every render would re-create request,
  // every action callback and the polling effect (resetting its interval).
  const doFetch = useMemo(
    () => fetchOption || ((...args) => window.fetch(...args)),
    [fetchOption]
  );

  // Resolve the default per-browser device id once (client-side only).
  useEffect(() => {
    if (deviceId) return;
    setDeviceId(getStableDeviceKey(storageKey));
  }, [deviceId, storageKey]);

  const base = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");

  const request = useCallback(
    async (path, init) => {
      const res = await doFetch(base + path, init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json && json.error ? json.error : {};
        const err = new Error(detail.message || "Native Notify request failed (HTTP " + res.status + ").");
        err.status = res.status;
        err.code = detail.code || null;
        throw err;
      }
      return json;
    },
    [base, doFetch]
  );

  const post = useCallback(
    async (action, body) => {
      if (!deviceId) return null;
      return request("/api/universal/inbox/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, appToken, deviceId, ...(body || {}) }),
      });
    },
    [appId, appToken, deviceId, request]
  );

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const page = await request(
        "/api/universal/inbox/" +
          encodeURIComponent(appId) +
          "/" +
          encodeURIComponent(appToken) +
          "?deviceId=" +
          encodeURIComponent(deviceId) +
          "&take=" +
          take +
          "&skip=0"
      );
      setEntries((page && page.entries) || []);
      setTotal(Number(page && page.total) || 0);
      setUnreadCount(Number(page && page.unread) || 0);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [appId, appToken, deviceId, request, take]);

  const refreshUnread = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await request(
        "/api/universal/inbox/" +
          encodeURIComponent(appId) +
          "/" +
          encodeURIComponent(appToken) +
          "/unread-count?deviceId=" +
          encodeURIComponent(deviceId)
      );
      setUnreadCount(Number(res && res.unread) || 0);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    }
  }, [appId, appToken, deviceId, request]);

  const markRead = useCallback(
    async (entry) => {
      if (!entry || entry.read) return;
      setEntries((rows) => rows.map((row) => (row.entryId === entry.entryId ? { ...row, read: true } : row)));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await post("read", { entryId: entry.entryId });
      } catch (err) {
        setError(err.message || "Could not mark the notification read.");
        refresh();
      }
    },
    [post, refresh]
  );

  const markAllRead = useCallback(async () => {
    setEntries((rows) => rows.map((row) => ({ ...row, read: true })));
    setUnreadCount(0);
    try {
      await post("read-all", null);
    } catch (err) {
      setError(err.message || "Could not mark the notifications read.");
      refresh();
    }
  }, [post, refresh]);

  const remove = useCallback(
    async (entry) => {
      setEntries((rows) => rows.filter((row) => row.entryId !== entry.entryId));
      setTotal((count) => Math.max(0, count - 1));
      if (!entry.read) setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await post("delete", { entryId: entry.entryId });
      } catch (err) {
        setError(err.message || "Could not delete the notification.");
        refresh();
      }
    },
    [post, refresh]
  );

  const clearInbox = useCallback(async () => {
    setEntries([]);
    setTotal(0);
    setUnreadCount(0);
    try {
      await post("clear", null);
    } catch (err) {
      setError(err.message || "Could not clear the inbox.");
      refresh();
    }
  }, [post, refresh]);

  const loadMore = useCallback(async () => {
    if (!deviceId) return;
    try {
      const page = await request(
        "/api/universal/inbox/" +
          encodeURIComponent(appId) +
          "/" +
          encodeURIComponent(appToken) +
          "?deviceId=" +
          encodeURIComponent(deviceId) +
          "&take=" +
          take +
          "&skip=" +
          entries.length
      );
      setEntries((rows) => rows.concat((page && page.entries) || []));
      setTotal(Number(page && page.total) || 0);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load more notifications.");
    }
  }, [appId, appToken, deviceId, entries.length, request, take]);

  // Keep the badge live: poll the unread count while the tab is visible.
  useEffect(() => {
    if (!deviceId || !pollMs || pollMs < 10000) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      refreshUnread();
    }, pollMs);
    const onVisible = () => {
      if (!document.hidden) refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deviceId, pollMs, refreshUnread]);

  return {
    deviceId,
    entries,
    total,
    unreadCount,
    loading,
    error,
    refresh,
    refreshUnread,
    markRead,
    markAllRead,
    remove,
    clearInbox,
    loadMore,
  };
}

/** Theme keys -> CSS custom properties (names match the vanilla module). */
const THEME_VARS = {
  accent: "--nn-accent",
  background: "--nn-surface",
  card: "--nn-card",
  border: "--nn-border",
  title: "--nn-title",
  text: "--nn-text",
  mutedText: "--nn-muted",
  dot: "--nn-dot",
  badgeText: "--nn-badge-text",
  delete: "--nn-delete",
  radius: "--nn-radius",
};

function BellIcon() {
  return (
    <svg className="nn-bell__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7.2-5.6v-1l-1.6-1.6V9.1A5.9 5.9 0 0 0 13.2 3.3V2.4a1.2 1.2 0 1 0-2.4 0v.9A5.9 5.9 0 0 0 6.4 9.1v4.7l-1.6 1.6v1Z"
      />
    </svg>
  );
}

/**
 * The drop-in bell + inbox panel. Props mirror the vanilla options:
 * appId, appToken, deviceId, apiBase, take, title, emptyText, showCount,
 * maxCount, allowDelete, pollMs, theme, position, onNotificationPress,
 * onNavigate, onUnreadChange, className.
 *
 * Import the styles once in your app: import "./nativeNotifyBell.css";
 */
/** @param {NativeNotifyBellProps} props */
export default function NativeNotifyBell({
  appId,
  appToken,
  deviceId,
  storageKey,
  apiBase,
  take = 20,
  title = "Notifications",
  emptyText = "You are all caught up.",
  showCount = true,
  maxCount = 99,
  allowDelete = true,
  pollMs = 30000,
  theme,
  position = "bottom-right",
  onNotificationPress,
  onNavigate,
  onUnreadChange,
  className,
}) {
  const inbox = useNativeNotifyInbox({ appId, appToken, deviceId, storageKey, apiBase, take, pollMs });
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (onUnreadChange) onUnreadChange(inbox.unreadCount);
  }, [inbox.unreadCount, onUnreadChange]);

  // Row click: mark read, then open the deep link (pushData.url).
  const openEntry = useCallback(
    (entry) => {
      const url = entryUrl(entry);
      inbox.markRead(entry);
      if (onNotificationPress) onNotificationPress(entry);
      if (!url) return;
      if (onNavigate) {
        onNavigate(url, entry);
        return;
      }
      if (isSafeUrl(url)) window.location.assign(url);
    },
    [inbox, onNavigate, onNotificationPress]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      if (buttonRef.current) buttonRef.current.focus();
    } else {
      setOpen(true);
      inbox.refresh();
      if (panelRef.current) panelRef.current.focus();
    }
  }

  const themeStyle = {};
  if (theme) {
    Object.keys(THEME_VARS).forEach((key) => {
      if (theme[key]) themeStyle[THEME_VARS[key]] = String(theme[key]);
    });
  }

  const badgeText = showCount ? (inbox.unreadCount > maxCount ? maxCount + "+" : String(inbox.unreadCount)) : "";

  return (
    <div
      ref={rootRef}
      className={["nn-bell", "nn-bell--" + position, open ? "nn-bell--open" : "", className || ""]
        .filter(Boolean)
        .join(" ")}
      style={themeStyle}
    >
      <button
        ref={buttonRef}
        type="button"
        className="nn-bell__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title + (inbox.unreadCount > 0 ? ", " + inbox.unreadCount + " unread" : "")}
        onClick={toggle}
      >
        <BellIcon />
        {inbox.unreadCount > 0 && (
          <span className={"nn-bell__badge" + (showCount ? "" : " nn-bell__badge--dot")}>{badgeText}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="nn-bell__panel"
          role="dialog"
          aria-modal="false"
          aria-label={title}
          tabIndex={-1}
        >
          <div className="nn-bell__header">
            <span className="nn-bell__title">{title}</span>
            {inbox.unreadCount > 0 && (
              <button type="button" className="nn-bell__mark-all" onClick={inbox.markAllRead}>
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="nn-bell__close"
              aria-label="Close notifications"
              onClick={() => {
                setOpen(false);
                if (buttonRef.current) buttonRef.current.focus();
              }}
            >
              &#215;
            </button>
          </div>

          <p className="nn-bell__status" role="status" aria-live="polite">
            {inbox.loading
              ? "Loading notifications…"
              : inbox.error
                ? inbox.error
                : inbox.unreadCount > 0
                  ? inbox.unreadCount + " unread"
                  : ""}
          </p>

          <ul className="nn-bell__list">
            {!inbox.loading && !inbox.error && inbox.entries.length === 0 && (
              <li className="nn-bell__empty">{emptyText}</li>
            )}
            {inbox.entries.map((entry) => (
              <li key={entry.entryId} className={"nn-bell__item" + (entry.read ? "" : " nn-bell__item--unread")}>
                <button type="button" className="nn-bell__item-main" onClick={() => openEntry(entry)}>
                  <span className="nn-bell__item-title">{entry.title || "Notification"}</span>
                  {entry.body ? <span className="nn-bell__item-body">{entry.body}</span> : null}
                  <span className="nn-bell__item-meta">
                    <span className="nn-bell__item-time">{timeAgo(entry.sentAt)}</span>
                    {!entry.read && <span className="nn-bell__item-dot" />}
                  </span>
                </button>
                {allowDelete && (
                  <button
                    type="button"
                    className="nn-bell__item-delete"
                    aria-label="Delete notification"
                    onClick={() => inbox.remove(entry)}
                  >
                    &#215;
                  </button>
                )}
              </li>
            ))}
          </ul>

          {inbox.entries.length < inbox.total && (
            <button type="button" className="nn-bell__more" onClick={inbox.loadMore}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { getWhitelist } from "@/lib/whitelist";

export const runtime = "nodejs";
// Always run the handler. We control caching via the response headers below;
// letting Next.js cache the handler response (or the upstream fetches) bakes
// in transient failures and broken redirects for an entire revalidate window.
export const dynamic = "force-dynamic";

// Successful icon responses are cached aggressively. Placeholders use a much
// shorter TTL so a transient upstream blip (rate limit, DNS hiccup, etc.)
// doesn't pin the placeholder in the browser cache for a full day.
const SUCCESS_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
};
const PLACEHOLDER_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

// Many sites block requests that look like bots, redirect bots to a captcha
// page, or serve a generic HTML page instead of an image. Pretending to be a
// recent Chrome avoids most of that.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 6000;

// Memoize successful icon URL lookups for the lifetime of the server process so
// we don't fetch the homepage HTML on every favicon request. The HTTP cache
// headers above also help, but this protects the dev server / cold starts.
const iconUrlCache = new Map<string, string>();

function normalizeDomain(value: string | null) {
  if (!value) return null;

  let domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (!domain) return null;

  if (domain.includes("://")) {
    try {
      domain = new URL(domain).hostname.toLowerCase().replace(/\.$/, "");
    } catch {
      return null;
    }
  } else {
    domain = domain.split("/")[0].split(":")[0].replace(/\.$/, "");
  }

  if (
    !domain ||
    domain === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(domain) ||
    domain.includes("..")
  ) {
    return null;
  }

  return domain;
}

function getApprovedDomains() {
  const whitelist = getWhitelist();
  return new Set([
    ...whitelist.sites.map((site) => site.domain.toLowerCase()),
    ...whitelist.popularDomains.map((domain) => domain.toLowerCase()),
    ...whitelist.hiddenDomains.map((domain) => domain.toLowerCase()),
  ]);
}

function makePlaceholderSvg(domain: string) {
  const letter = domain.replace(/^www\./, "").charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#eff6ff"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0a72ff">${letter}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      ...PLACEHOLDER_CACHE_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}

// Trust magic bytes over Content-Type. A surprising number of servers either
// mis-set the type (e.g. application/octet-stream for an .ico) or return HTML
// with a 200 status when the favicon doesn't exist.
function sniffImage(
  bytes: Uint8Array,
  contentType: string,
): { ok: true; type: string } | { ok: false } {
  if (bytes.length >= 4) {
    const [b0, b1, b2, b3] = bytes;
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
      return { ok: true, type: "image/png" };
    }
    if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
      return { ok: true, type: "image/jpeg" };
    }
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) {
      return { ok: true, type: "image/gif" };
    }
    if (b0 === 0x00 && b1 === 0x00 && (b2 === 0x01 || b2 === 0x02) && b3 === 0x00) {
      return { ok: true, type: "image/x-icon" };
    }
    if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
      return { ok: true, type: "image/webp" };
    }
    const head = new TextDecoder("utf-8", { fatal: false })
      .decode(bytes.slice(0, Math.min(512, bytes.length)))
      .trimStart()
      .toLowerCase();
    if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
      return { ok: true, type: "image/svg+xml" };
    }
    if (head.startsWith("<!doctype") || head.startsWith("<html")) {
      return { ok: false };
    }
  }

  const ct = contentType.toLowerCase();
  if (ct.startsWith("image/")) {
    return { ok: true, type: contentType };
  }
  return { ok: false };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    // Bypass Next.js's data cache. We don't want a transient upstream 404 or
    // timeout to be remembered for an entire revalidate window.
    cache: "no-store",
  });
}

async function tryFetchImage(url: string): Promise<Response | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.arrayBuffer();
    if (body.byteLength === 0) return null;

    const sniff = sniffImage(new Uint8Array(body), contentType);
    if (!sniff.ok) return null;

    return new Response(body, {
      headers: {
        ...SUCCESS_CACHE_HEADERS,
        "Content-Type": sniff.type,
      },
    });
  } catch {
    return null;
  }
}

interface IconCandidate {
  href: string;
  size: number;
  rel: string;
  type: string;
}

function scoreCandidate(c: IconCandidate): number {
  // mask-icon is monochrome (Safari pinned tab) and not what we want.
  if (c.rel.includes("mask-icon")) return -1000;

  // SVG scales to any size, so it's almost always the best choice.
  if (c.type.includes("svg") || /\.svg(?:\?|#|$)/i.test(c.href)) {
    return 200;
  }

  let score = 0;
  // apple-touch-icons are designed for iOS home screens (often full-bleed,
  // no transparency). Prefer regular `rel="icon"` when both exist, but only
  // by a small amount so we still pick apple-touch when it's the only choice.
  if (c.rel.includes("apple-touch-icon")) score -= 5;

  // Aim for ~64px (we render at 32-40px). Penalize distance from target;
  // unknown-size icons get a moderate penalty so sized candidates win.
  const target = 64;
  const dist = c.size === 0 ? 50 : Math.abs(c.size - target);
  score -= dist;
  return score;
}

async function discoverIconsFromHtml(domain: string): Promise<string[]> {
  const homeUrls = [
    `https://${domain}/`,
    domain.startsWith("www.") ? null : `https://www.${domain}/`,
  ].filter(Boolean) as string[];

  for (const homeUrl of homeUrls) {
    try {
      const res = await fetchWithTimeout(homeUrl, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!res.ok) continue;
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!ct.includes("html") && !ct.includes("xml")) continue;

      // Only read the head — favicon links live in <head> and HTML pages can
      // be huge.
      const html = await res.text();
      const head = html.slice(0, 256_000);

      const candidates: IconCandidate[] = [];
      const linkRegex = /<link\b[^>]*>/gi;
      for (const match of head.matchAll(linkRegex)) {
        const tag = match[0];
        const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
        if (!relMatch) continue;
        const rel = relMatch[1].toLowerCase();
        if (!rel.includes("icon")) continue;

        const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        if (!hrefMatch) continue;

        const typeMatch = tag.match(/\btype\s*=\s*["']([^"']+)["']/i);
        const type = (typeMatch?.[1] ?? "").toLowerCase();

        const sizesMatch = tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
        let size = 0;
        if (sizesMatch) {
          const part = sizesMatch[1].split(/\s+/)[0]; // first size token
          const n = parseInt(part.split(/[xX]/)[0], 10);
          if (!Number.isNaN(n)) size = n;
        }

        candidates.push({ href: hrefMatch[1], size, rel, type });
      }

      if (candidates.length === 0) continue;

      candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
      // Resolve relative URLs against the page we actually landed on (after
      // any redirects), which is what new URL needs.
      const baseUrl = res.url || homeUrl;
      return candidates
        .slice(0, 5) // cap fetch attempts so flaky sites don't stall the route
        .map((c) => {
          try {
            return new URL(c.href, baseUrl).toString();
          } catch {
            return null;
          }
        })
        .filter((u): u is string => u !== null);
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchFavicon(domain: string): Promise<Response | null> {
  // Try a previously-discovered URL first. Don't drop it on a single failure;
  // upstream sites are often flaky and the URL is probably still correct.
  const cached = iconUrlCache.get(domain);
  if (cached) {
    const cachedRes = await tryFetchImage(cached);
    if (cachedRes) return cachedRes;
  }

  const tried = new Set<string>(cached ? [cached] : []);
  const tryOnce = async (url: string) => {
    if (tried.has(url)) return null;
    tried.add(url);
    const res = await tryFetchImage(url);
    if (res) iconUrlCache.set(domain, url);
    return res;
  };

  // 1) Discover from the homepage's <link rel="icon"> tags. We do this first
  //    because /favicon.ico is often a tiny legacy 16x16 ICO even when the
  //    site publishes a much higher-quality icon (PNG/SVG) in its HTML head.
  for (const url of await discoverIconsFromHtml(domain)) {
    const res = await tryOnce(url);
    if (res) return res;
  }

  // 2) Fall back to the conventional /favicon.ico for sites that don't
  //    declare anything in HTML (or whose homepage we couldn't fetch).
  const directCandidates = [
    `https://${domain}/favicon.ico`,
    domain.startsWith("www.") ? null : `https://www.${domain}/favicon.ico`,
  ].filter(Boolean) as string[];

  for (const url of directCandidates) {
    const res = await tryOnce(url);
    if (res) return res;
  }

  // 3) Common fallback paths some sites use without declaring them in HTML.
  const fallbacks = [
    `https://${domain}/favicon.png`,
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-precomposed.png`,
    domain.startsWith("www.") ? null : `https://www.${domain}/favicon.png`,
    domain.startsWith("www.")
      ? null
      : `https://www.${domain}/apple-touch-icon.png`,
  ].filter(Boolean) as string[];

  for (const url of fallbacks) {
    const res = await tryOnce(url);
    if (res) return res;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = normalizeDomain(searchParams.get("domain"));

  if (!domain) {
    return makePlaceholderSvg("?");
  }

  if (!getApprovedDomains().has(domain)) {
    return new Response("Not found", { status: 404 });
  }

  return (await fetchFavicon(domain)) ?? makePlaceholderSvg(domain);
}

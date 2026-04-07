"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { getWhitelist, type WhitelistSite } from "@/lib/whitelist";

const FAVICON_URL = "https://www.google.com/s2/favicons?sz=64&domain=";

function getStringHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const CATEGORY_ICONS: Record<string, string> = {
  Popular: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
  All: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z",
  "Research & Reference": "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  "Writing & Documents": "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
  "Grammar & Editing": "M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z",
  "Cloud Storage": "M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z",
  Productivity: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  "AI Assistants":
    "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354.021-2.694-.205-4-.057-1.065.124-2.065-.423-2.58-1.314-.264-.521-.264-1.093 0-1.614.516-.891 1.515-1.438 2.58-1.314 1.306.148 2.646.078 4-.057l3-3V8.511ZM3.75 8.511c-.884.284-1.5 1.128-1.5 2.097v4.286c0 1.136.847 2.1 1.98 2.193.34.027.68.052 1.02.072v3.091l3-3c1.354.021 2.694-.205 4-.057 1.065.124 2.065-.423 2.581-1.314.264-.521.264-1.093 0-1.614-.516-.891-1.515-1.438-2.58-1.314-1.306.148-2.646.078-4-.057l-3-3V8.511Z",
  Study: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5",
  Homeschooling: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  "Bible & Theology": "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  "Learn Skills": "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z",
  Publishing: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6V7.5Z",
  "Developer Tools": "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
  "Finance & Business": "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
  "SaaS & Business": "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0",
  Other: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

function CategoryIcon({ category }: { category: string }) {
  const d = CATEGORY_ICONS[category];
  if (!d) return null;
  return (
    <svg
      className="h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function BrowsePage() {
  const whitelist = useMemo(() => getWhitelist(), []);
  const hiddenSet = useMemo(
    () => new Set(whitelist.hiddenDomains),
    [whitelist]
  );

  const visibleSites = useMemo(
    () => whitelist.sites.filter((s) => !hiddenSet.has(s.domain)),
    [whitelist, hiddenSet]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Popular");
  const [focusedCardIndex, setFocusedCardIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleCategoryChange = useCallback((nextCategory: string) => {
    setCategory(nextCategory);
    setFocusedCardIndex(-1);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const popularSet = new Set(whitelist.popularDomains);
    counts["Popular"] = visibleSites.filter((s) =>
      popularSet.has(s.domain)
    ).length;
    counts["All"] = visibleSites.length;
    for (const cat of whitelist.categories) {
      counts[cat] = visibleSites.filter((s) => s.category === cat).length;
    }
    return counts;
  }, [visibleSites, whitelist]);

  const filtered = useMemo(() => {
    let sites: WhitelistSite[] = visibleSites;

    if (category === "Popular") {
      const popularSet = new Set(whitelist.popularDomains);
      sites = sites.filter((s) => popularSet.has(s.domain));
    } else if (category !== "All") {
      sites = sites.filter((s) => s.category === category);
    }

    if (search.trim()) {
      const terms = search.toLowerCase().trim().split(/\s+/);
      sites = sites.filter((site) => {
        const hay = [site.title, site.domain, site.description, ...site.tags]
          .join(" ")
          .toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }

    if (category === "Popular") {
      const order = new Map(
        whitelist.popularDomains.map((domain, index) => [domain, index])
      );
      sites = [...sites].sort(
        (a, b) =>
          (order.get(a.domain) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.domain) ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return sites;
  }, [visibleSites, search, category, whitelist]);

  const discoverSites = useMemo(() => {
    if (category !== "Popular" || search.trim()) {
      return [];
    }

    const popularSet = new Set(whitelist.popularDomains);
    const nonPopular = visibleSites.filter((s) => !popularSet.has(s.domain));
    const ranked = [...nonPopular].sort(
      (a, b) => getStringHash(a.domain) - getStringHash(b.domain)
    );
    return ranked.slice(0, 7);
  }, [category, search, visibleSites, whitelist]);

  const allCategories = useMemo(
    () => ["Popular", "All", ...whitelist.categories],
    [whitelist]
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll<HTMLAnchorElement>(
        "[data-site-card]"
      );
      const total = cards.length;
      if (total === 0) return;

      const style = window.getComputedStyle(gridRef.current);
      const cols = style.gridTemplateColumns.split(" ").length;

      let next = focusedCardIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          next = Math.min(focusedCardIndex + 1, total - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          next = Math.max(focusedCardIndex - 1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          next = Math.min(focusedCardIndex + cols, total - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          next = Math.max(focusedCardIndex - cols, 0);
          break;
        case "Enter":
        case " ":
          if (focusedCardIndex >= 0 && focusedCardIndex < total) {
            e.preventDefault();
            cards[focusedCardIndex].click();
          }
          return;
        default:
          return;
      }

      setFocusedCardIndex(next);
      cards[next]?.focus();
    },
    [focusedCardIndex]
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-2xl font-bold tracking-tight shrink-0"
          >
            <Image
              src="/assets/images/logo.png"
              alt="PageCow Logo"
              width={30}
              height={30}
              priority
              className="mr-1"
            />
            Page<span className="text-brand">Cow</span>
          </Link>

          <div className="relative w-full max-w-md ml-6">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setFocusedCardIndex(-1);
                setSearch(e.target.value);
                if (e.target.value.trim()) setCategory("All");
              }}
              placeholder="Search sites..."
              className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {search && (
              <button
                onClick={() => {
                  setFocusedCardIndex(-1);
                  setSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="Clear search"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile category pills - outside flex wrapper so they stack above content */}
      <div className="lg:hidden sticky top-[57px] z-10 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-brand text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {cat}
              <span className="ml-1 opacity-60">
                {categoryCounts[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 items-stretch">
        {/* Sidebar - desktop only */}
        <aside className="relative hidden w-56 shrink-0 flex-col border-r border-zinc-200/80 bg-white before:absolute before:inset-y-0 before:right-full before:w-screen before:bg-white before:content-[''] dark:border-zinc-800 dark:bg-zinc-900/40 dark:before:bg-zinc-900/40 lg:flex">
          <nav className="sticky top-[57px] flex flex-col gap-0.5 overflow-y-auto p-3 max-h-[calc(100vh-57px)]">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                  category === cat
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <CategoryIcon category={cat} />
                <span className="truncate flex-1">{cat}</span>
                <span
                  className={`ml-auto text-[11px] tabular-nums ${
                    category === cat
                      ? "text-brand/70"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Result count */}
          {search.trim() && (
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {filtered.length === 0
                ? "No results"
                : `${filtered.length} site${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg
                  className="h-8 w-8 text-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                No sites found
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Try a different search term or browse another category.
              </p>
            </div>
          ) : (
            <>
              <div
                ref={gridRef}
                role="grid"
                tabIndex={0}
                onKeyDown={handleGridKeyDown}
                className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 outline-none"
              >
                {filtered.map((site, index) => (
                  <a
                    key={site.domain}
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-site-card
                    tabIndex={focusedCardIndex === index ? 0 : -1}
                    onFocus={() => setFocusedCardIndex(index)}
                    className={`group relative flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-zinc-200/50 hover:ring-1 hover:ring-zinc-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:hover:bg-zinc-800/80 dark:hover:shadow-none dark:hover:ring-zinc-700/80 dark:focus-visible:ring-offset-zinc-950 ${
                      category === "Popular"
                        ? "p-5"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all duration-200 group-hover:shadow-lg group-hover:ring-brand/30 group-hover:scale-105 dark:bg-zinc-800 dark:ring-zinc-700/60 dark:group-hover:ring-brand/30 ${
                        category === "Popular"
                          ? "h-16 w-16"
                          : "h-14 w-14"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${FAVICON_URL}${site.domain}`}
                        alt=""
                        width={category === "Popular" ? 40 : 32}
                        height={category === "Popular" ? 40 : 32}
                        className={`rounded ${
                          category === "Popular"
                            ? "h-10 w-10"
                            : "h-8 w-8"
                        }`}
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <span
                        className={`w-full text-center font-medium leading-tight line-clamp-2 text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white ${
                          category === "Popular"
                            ? "text-xs"
                            : "text-[11px]"
                        }`}
                      >
                        {site.title}
                      </span>
                      <span className="w-full text-center text-[10px] text-zinc-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 truncate dark:text-zinc-500">
                        {site.domain}
                      </span>
                    </div>

                    {/* Tooltip with description */}
                    {site.description && (
                      <div className="pointer-events-none absolute -top-2 left-1/2 z-30 w-52 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-700">
                        <p className="line-clamp-3 leading-relaxed">
                          {site.description}
                        </p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                          <div className="h-2 w-2 rotate-45 bg-zinc-900 dark:bg-zinc-700" />
                        </div>
                      </div>
                    )}
                  </a>
                ))}
              </div>

              {/* Discover more section for Popular view */}
              {discoverSites.length > 0 && (
                <div className="mt-12 border-t border-zinc-200/80 pt-8 dark:border-zinc-800">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                        Discover more sites
                      </h2>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Explore beyond the popular picks
                      </p>
                    </div>
                    <button
                      onClick={() => handleCategoryChange("All")}
                      className="rounded-full bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
                    >
                      View all sites
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {discoverSites.map((site) => (
                      <a
                        key={site.domain}
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-zinc-200/50 hover:ring-1 hover:ring-zinc-200/80 dark:hover:bg-zinc-800/80 dark:hover:shadow-none dark:hover:ring-zinc-700/80"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all duration-200 group-hover:shadow-lg group-hover:ring-brand/30 group-hover:scale-105 dark:bg-zinc-800 dark:ring-zinc-700/60 dark:group-hover:ring-brand/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${FAVICON_URL}${site.domain}`}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <span className="w-full text-center text-[11px] font-medium leading-tight line-clamp-2 text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                            {site.title}
                          </span>
                          <span className="w-full text-center text-[10px] text-zinc-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 truncate dark:text-zinc-500">
                            {site.domain}
                          </span>
                        </div>
                        {site.description && (
                          <div className="pointer-events-none absolute -top-2 left-1/2 z-30 w-52 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-700">
                            <p className="line-clamp-3 leading-relaxed">
                              {site.description}
                            </p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                              <div className="h-2 w-2 rotate-45 bg-zinc-900 dark:bg-zinc-700" />
                            </div>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

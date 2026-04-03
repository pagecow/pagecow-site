"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getWhitelist, type WhitelistSite } from "@/lib/whitelist";

const FAVICON_URL = "https://www.google.com/s2/favicons?sz=64&domain=";

export default function BrowsePage() {
  const whitelist = useMemo(() => getWhitelist(), []);
  const hiddenSet = useMemo(() => new Set(whitelist.hiddenDomains), [whitelist]);

  const visibleSites = useMemo(
    () => whitelist.sites.filter((s) => !hiddenSet.has(s.domain)),
    [whitelist, hiddenSet]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    let sites: WhitelistSite[] = visibleSites;

    if (category !== "All") {
      sites = sites.filter((s) => s.category === category);
    }

    if (search.trim()) {
      const terms = search.toLowerCase().trim().split(/\s+/);
      sites = sites.filter((site) => {
        const hay = [
          site.title,
          site.domain,
          site.description,
          ...site.tags,
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }

    return sites;
  }, [visibleSites, search, category]);

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-sm px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex justify-between text-2xl font-bold tracking-tight shrink-0"
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

            <div className="relative w-full max-w-sm ml-6">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
                  setSearch(e.target.value);
                  if (e.target.value.trim()) setCategory("All");
                }}
                placeholder="Search sites..."
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none transition-shadow focus:shadow-sm focus:border-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2  pb-1 scrollbar-hide">
            {["All", ...whitelist.categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-brand text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {filtered.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">
            No sites found. Try a different search or category.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {filtered.map((site) => (
              <a
                key={site.domain}
                href={`https://${site.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-zinc-100 shadow-sm ring-1 ring-zinc-200/60 transition-shadow group-hover:shadow-md dark:bg-zinc-800 dark:ring-zinc-700/60">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external favicon URLs */}
                  <img
                    src={`${FAVICON_URL}${site.domain}`}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded"
                    loading="lazy"
                  />
                </div>
                <span className="w-full text-center text-[11px] font-medium leading-tight line-clamp-2 text-zinc-700 dark:text-zinc-300">
                  {site.title}
                </span>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

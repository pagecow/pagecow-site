"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <div className="flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 transition-shadow focus-within:shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <svg
          className="mr-2 h-4 w-4 shrink-0 text-zinc-400"
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
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search approved sites..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="ml-2 rounded-full bg-brand px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Search
        </button>
      </div>
    </form>
  );
}

import Link from "next/link";
import { searchWhitelist } from "@/lib/whitelist";
import SearchForm from "./search-form";
import Image from "next/image";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = searchWhitelist(query);

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Image
                src="/assets/images/logo.png"
                alt="PageCow Logo"
                width={30}
                height={30}
                priority
              />
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight shrink-0"
              >
                Page<span className="text-brand">Cow</span>
              </Link>
            </div>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-zinc-100 sm:hidden dark:border-zinc-700 dark:hover:bg-zinc-800"
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
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
                />
              </svg>
              Browse Sites
            </Link>
          </div>
          <div className="flex-1">
            <SearchForm defaultValue={query} />
          </div>
          <Link
            href="/browse"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
              />
            </svg>
            Browse Sites
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
        {!query ? (
          <p className="text-zinc-500">Enter a search term to find approved sites.</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-500">
            No results found for &ldquo;{query}&rdquo;. Try a different search term.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-zinc-500">
              {results.length} result{results.length !== 1 ? "s" : ""} for
              &ldquo;{query}&rdquo;
            </p>
            <ol className="flex flex-col gap-7">
              {results.map((result) => (
                <li key={result.domain}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      https://{result.domain}
                    </span>
                    <a
                      href={`https://${result.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-brand hover:underline dark:text-[#66a3ff]"
                    >
                      {result.title}
                    </a>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {result.description}
                    </p>
                    <span className="mt-1 inline-flex self-start rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] px-2.5 py-0.5 text-xs font-medium text-brand dark:bg-[color-mix(in_srgb,var(--brand)_22%,transparent)] dark:text-[#66a3ff]">
                      {result.category}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}

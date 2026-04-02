import Link from "next/link";
import { searchWhitelist } from "@/lib/whitelist";
import SearchForm from "./search-form";

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
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight shrink-0"
          >
            Page<span className="text-brand">Cow</span>
          </Link>
          <SearchForm defaultValue={query} />
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

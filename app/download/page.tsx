import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  LATEST_RELEASE_PAGE,
  RELEASES_PAGE,
  getLatestRelease,
  resolveDownloads,
} from "@/lib/latest-release";

export const metadata: Metadata = {
  title: "Download PageCOW",
  description:
    "Download the latest PageCOW release for macOS, Windows, or Linux.",
};

// The page reads the newest GitHub release (cached for 10 minutes), so every
// button always points at the current version without a manual bump.
export const revalidate = 600;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const downloads = resolveDownloads(release);
  const releasedOn = formatDate(release?.publishedAt ?? null);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center px-4 pb-10 pt-5 sm:px-6">
      <nav className="mb-8 flex w-full max-w-2xl justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Home
        </Link>
      </nav>

      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/images/logo.png"
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 sm:h-14 sm:w-14"
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Download PageCOW
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {release ? (
              <>
                Version {release.version}
                {releasedOn ? ` — released ${releasedOn}` : ""}
              </>
            ) : (
              <>Installers from GitHub Releases</>
            )}
          </p>
        </div>

        {downloads.length > 0 ? (
          <ul className="flex w-full max-w-md flex-col gap-3 text-left">
            {downloads.map((download) => (
              <li key={download.key}>
                <a
                  href={download.url}
                  className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  rel="noopener noreferrer"
                >
                  <span>{download.label}</span>
                  <span className="text-zinc-400">{download.fileSuffix}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              We couldn&apos;t load the release list right now.
            </p>
            <a
              href={RELEASES_PAGE}
              className="inline-flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              rel="noopener noreferrer"
            >
              Browse all downloads on GitHub
            </a>
          </div>
        )}

        <p className="max-w-lg text-xs text-zinc-400">
          macOS builds are signed and notarized by Apple. Files are hosted on
          GitHub.{" "}
          <a
            href={LATEST_RELEASE_PAGE}
            className="text-brand underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            What&apos;s new?
          </a>
        </p>
      </main>
    </div>
  );
}

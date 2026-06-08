import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { APP_VERSION } from "@/lib/app-version";

const REPO_RELEASE_BASE = `https://github.com/pagecow/pagecow-browser/releases/download/v${APP_VERSION}`;

function releaseAsset(fileName: string) {
  return `${REPO_RELEASE_BASE}/${encodeURIComponent(fileName)}`;
}

export const metadata: Metadata = {
  title: "Download PageCOW",
  description: `Download PageCOW ${APP_VERSION} for macOS, Windows, or Linux.`,
};

export default function DownloadPage() {
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
            Version {APP_VERSION} — installers from{" "}
            <a
              href="https://github.com/pagecow/pagecow-browser/releases"
              className="text-brand underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Releases
            </a>
          </p>
        </div>

        <ul className="flex w-full max-w-md flex-col gap-3 text-left">
          <li>
            <a
              href={releaseAsset(`PageCow-${APP_VERSION}-arm64.dmg`)}
              className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              rel="noopener noreferrer"
            >
              <span>macOS (Apple Silicon)</span>
              <span className="text-zinc-400">.dmg</span>
            </a>
          </li>
          <li>
            <a
              href={releaseAsset(`PageCow Setup ${APP_VERSION}.exe`)}
              className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              rel="noopener noreferrer"
            >
              <span>Windows</span>
              <span className="text-zinc-400">.exe</span>
            </a>
          </li>
          <li>
            <a
              href={releaseAsset(`pagecow-browser_${APP_VERSION}_amd64.deb`)}
              className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              rel="noopener noreferrer"
            >
              <span>Linux (Debian / Ubuntu)</span>
              <span className="text-zinc-400">.deb</span>
            </a>
          </li>
          <li>
            <a
              href={releaseAsset(`PageCow-${APP_VERSION}.AppImage`)}
              className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              rel="noopener noreferrer"
            >
              <span>Linux (AppImage)</span>
              <span className="text-zinc-400">.AppImage</span>
            </a>
          </li>
        </ul>

        <p className="max-w-lg text-xs text-zinc-400">
          Files are hosted on GitHub. 
        </p>
      </main>
    </div>
  );
}

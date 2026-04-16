"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(/Electron/i.test(navigator.userAgent));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center px-4 pb-8 pt-5 sm:px-6 sm:pb-10">
      <nav className="flex w-full max-w-5xl justify-end">
        <a
          href="/browse"
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
        </a>
      </nav>

      <main className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 py-12 sm:gap-10 sm:py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1">
            <Image
                src="/assets/images/logo.png"
                alt="PageCow Logo"
                width={76}
                height={76}
                priority
                className="w-14 h-14 sm:w-20 sm:h-20"
            />
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Page<span className="text-brand">Cow</span>
            </h1>
          </div>
          <p className="max-w-md text-base leading-7 text-zinc-500 dark:text-zinc-400 sm:text-md">
            A distraction-free browser for study.
            <span className="hidden sm:inline">
              <br />
            </span>{" "}
            No social media, news, AI, entertainment. Just focus.
            <span className="hidden sm:inline">
              <br />
            </span>{" "}
            Oh, and ads are blocked too.
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full max-w-xl">
          <div className="rounded-[1.75rem] border border-zinc-300 bg-white p-2 shadow-sm transition-shadow focus-within:shadow-md dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-full">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center px-3 py-2 sm:px-3 sm:py-1">
                <svg
                  className="mr-3 h-5 w-5 shrink-0 text-zinc-400"
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
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover sm:ml-1 sm:w-auto sm:py-2"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {!isElectron && (
          <div className="flex flex-col items-center gap-4 pt-2 sm:pt-4">
            <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
              Download the Desktop App
            </p>
            <div className="flex w-full flex-wrap justify-center gap-3">
              {/* <a
                href="https://github.com/pagecow/pagecow-browser/releases/download/v1.0.10/PageCow-1.0.10-arm64.dmg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.442 1.516 1.076 2.085a3.617 3.617 0 0 0 1.272.745c.406.164.86.258 1.378.258.582 0 1.227-.126 1.955-.373.726-.247 1.127-.466 1.483-.657.376-.201.614-.327 1.039-.327.39 0 .621.119.99.315.37.196.84.451 1.595.716.685.24 1.28.358 1.828.358a4.33 4.33 0 0 0 2.296-.66c.94-.6 1.374-1.412 1.574-2.104.193-.665.227-1.264.227-1.537v-.062c-.003-.21-.038-.436-.073-.596-.073-.327-.163-.46-.209-.46l-.072-.037c-.146-.072-.332-.164-.547-.348a3.455 3.455 0 0 1-.852-1.014c-.34-.603-.544-1.363-.544-2.3 0-.944.225-1.694.566-2.276a3.463 3.463 0 0 1 .818-.932c.175-.144.328-.236.426-.287l.044-.022.018-.01c.027-.014.046-.036.046-.036-.002-.002-.246-.298-.746-.746a6.432 6.432 0 0 0-1.934-1.252A5.636 5.636 0 0 0 14.594 4c-.34 0-.684.036-1.032.107a5.1 5.1 0 0 0-1.058.371V0z" />
                  <path d="M14.67 1.576c.31-.584.462-1.204.462-1.576-.612.06-1.328.394-1.766.83-.397.396-.768 1.003-.768 1.612.668.05 1.352-.282 2.072-.866z" />
                </svg>
                macOS
              </a> */}
              <a
                href="https://github.com/pagecow/pagecow-browser/releases/download/v1.0.10/pagecow-browser_1.0.10_amd64.deb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.504 0c-.155 0-.315.008-.48.021C7.657.375 8.4 4.565 8.354 5.727c-.053.758-.2 1.36-.734 2.108C6.88 8.77 5.92 10.12 5.42 11.51c-.193.578-.285 1.172-.2 1.734.082.544.308 1.058.751 1.454.39.35.865.594 1.29.73.283.114.6.18.96.18.406 0 .857-.088 1.365-.26.507-.173.788-.326 1.037-.46.263-.14.43-.228.726-.228.273 0 .434.083.692.22.258.137.587.315 1.114.5.479.167.895.25 1.278.25.539 0 1.046-.133 1.604-.46.657-.42.96-.986 1.1-1.47.135-.464.159-.882.159-1.073v-.044c-.002-.146-.027-.304-.051-.416-.051-.228-.114-.321-.146-.321l-.05-.026a2.965 2.965 0 0 1-.383-.243 2.415 2.415 0 0 1-.595-.708c-.237-.421-.38-.952-.38-1.606 0-.66.157-1.183.395-1.59.238-.406.529-.675.735-.832a2.15 2.15 0 0 1 .297-.2l.031-.016.013-.007s.018-.01.032-.025c-.001-.001-.172-.208-.521-.521a4.502 4.502 0 0 0-1.352-.874A3.94 3.94 0 0 0 14.594 5.6c-.237 0-.478.025-.72.075a3.57 3.57 0 0 0-.74.259V0zM12 10.2c.2 0 .4.006.595.018a10.42 10.42 0 0 0-.595-.018z" />
                  <path d="M12 10.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm-1.2 3h2.4v2.4h-1.2v3.6h-1.2v-6z" />
                </svg>
                Linux
              </a>
              <a
                href="https://github.com/pagecow/pagecow-browser/releases/download/v1.0.10/PageCow.Setup.1.0.10.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
                Windows
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="pt-6 pb-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <p>
          Want to add a website to our approved list? Submit a request here:{" "}
          <a
            href="mailto:support@pagecow.com"
            className="hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            support@pagecow.com
          </a>
        </p>
        <p className="mt-6 text-zinc-400">Copyright © 2026 PageCow. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Latest-release lookup for the download links.
//
// The version used to be a hardcoded constant (APP_VERSION), which went stale
// whenever a release shipped: the site kept serving the previous version's
// links, and a renamed asset 404'd. Everything now comes from the GitHub
// release itself, cached for 10 minutes (ISR) so the page stays static and
// fast while still following every release.
export const REPO = "pagecow/pagecow-browser";
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
export const LATEST_RELEASE_PAGE = `${RELEASES_PAGE}/latest`;

const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const REVALIDATE_SECONDS = 600;

export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type LatestRelease = {
  version: string;
  publishedAt: string | null;
  assets: ReleaseAsset[];
};

type GitHubRelease = {
  tag_name?: string;
  published_at?: string;
  assets?: ReleaseAsset[];
};

/**
 * Fetch the newest published release. Returns null when the GitHub API is
 * unreachable (rate limit, network, first build) — callers fall back to the
 * releases page so the site never shows a dead link.
 */
export async function getLatestRelease(): Promise<LatestRelease | null> {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as GitHubRelease;
    const tag = data?.tag_name;
    if (!tag || !Array.isArray(data.assets)) return null;

    return {
      version: tag.replace(/^v/, ""),
      publishedAt: data.published_at ?? null,
      assets: data.assets.filter((asset) => asset?.name && asset?.browser_download_url),
    };
  } catch {
    return null;
  }
}

export type DownloadLink = {
  key: string;
  label: string;
  fileSuffix: string;
  url: string;
};

export type DownloadTarget = {
  key: string;
  label: string;
  fileSuffix: string;
  assetName: (version: string) => string;
};

// Asset names produced by electron-builder (see electron-builder.yml in the
// pagecow-browser repo). Keep these in sync with the release workflow's
// "Verify release assets" step.
export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    key: "mac-arm64",
    label: "macOS (Apple Silicon)",
    fileSuffix: ".dmg",
    assetName: (version) => `PageCow-${version}-arm64.dmg`,
  },
  {
    key: "mac-x64",
    label: "macOS (Intel)",
    fileSuffix: ".dmg",
    assetName: (version) => `PageCow-${version}.dmg`,
  },
  {
    key: "windows",
    label: "Windows",
    fileSuffix: ".exe",
    assetName: (version) => `PageCow-Setup-${version}.exe`,
  },
  {
    key: "linux-deb",
    label: "Linux (Debian / Ubuntu)",
    fileSuffix: ".deb",
    assetName: (version) => `pagecow-browser_${version}_amd64.deb`,
  },
  {
    key: "linux-appimage",
    label: "Linux (AppImage)",
    fileSuffix: ".AppImage",
    assetName: (version) => `PageCow-${version}.AppImage`,
  },
];

export type Download = DownloadLink;

/**
 * Resolve the download targets that actually exist in the release, so a
 * missing or renamed installer hides its button instead of 404ing.
 */
export function resolveDownloads(release: LatestRelease | null): DownloadLink[] {
  if (!release) return [];

  return DOWNLOAD_TARGETS.flatMap((target) => {
    const wanted = target.assetName(release.version);
    const asset = release.assets.find((candidate) => candidate.name === wanted);
    if (!asset) return [];
    return [
      {
        key: target.key,
        label: target.label,
        fileSuffix: target.fileSuffix,
        url: asset.browser_download_url,
      },
    ];
  });
}

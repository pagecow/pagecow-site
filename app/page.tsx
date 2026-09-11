import HomeClient from "./home-client";
import { getLatestRelease, resolveDownloads } from "@/lib/latest-release";

// The newest release (cached 10 minutes) drives the download buttons, so the
// home page never points at a stale version.
export const revalidate = 600;

export default async function Home() {
  const release = await getLatestRelease();
  const downloads = resolveDownloads(release);

  return <HomeClient downloads={downloads} />;
}

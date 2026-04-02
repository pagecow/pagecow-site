import whitelistData from "../public/whitelist.json";

export interface WhitelistSite {
  domain: string;
  category: string;
  title: string;
  description: string;
  tags: string[];
}

export interface WhitelistData {
  version: number;
  categories: string[];
  popularDomains: string[];
  hiddenDomains: string[];
  sites: WhitelistSite[];
}

export function getWhitelist(): WhitelistData {
  return whitelistData as WhitelistData;
}

export interface SearchResult extends WhitelistSite {
  score: number;
}

export function searchWhitelist(query: string): SearchResult[] {
  if (!query || !query.trim()) return [];

  const { sites, hiddenDomains } = getWhitelist();
  const terms = query.toLowerCase().trim().split(/\s+/);
  const hiddenSet = new Set(hiddenDomains);

  const scored: SearchResult[] = [];

  for (const site of sites) {
    if (hiddenSet.has(site.domain)) continue;

    let score = 0;
    const titleLower = site.title.toLowerCase();
    const descLower = site.description.toLowerCase();
    const domainLower = site.domain.toLowerCase();
    const tagsLower = site.tags.map((t) => t.toLowerCase());

    for (const term of terms) {
      if (titleLower === term) score += 20;
      else if (titleLower.includes(term)) score += 10;

      if (domainLower.includes(term)) score += 8;

      if (tagsLower.some((tag) => tag === term)) score += 6;
      else if (tagsLower.some((tag) => tag.includes(term))) score += 3;

      if (descLower.includes(term)) score += 2;
    }

    if (score > 0) {
      scored.push({ ...site, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

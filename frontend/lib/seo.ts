import type { Metadata } from "next";

/** Gives an indexable page its own canonical URL (and og:url). The path is
 * resolved against metadataBase from the root layout, which itself sets no
 * canonical — otherwise every page would inherit the home page's. */
export function withCanonical(path: string, metadata: Metadata = {}): Metadata {
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: path },
    openGraph: { ...metadata.openGraph, url: path },
  };
}

/** For "coming soon" placeholder pages: kept out of the index, links still followed. */
export const placeholderRobots: Metadata["robots"] = { index: false, follow: true };

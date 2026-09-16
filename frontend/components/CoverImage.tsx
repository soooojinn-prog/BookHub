"use client";

import { useEffect, useState } from "react";

import { coverSrc } from "@/lib/books";

/**
 * The real cover art, painted over a cover box that already carries the
 * gradient placeholder as its background.
 *
 * Deliberately a plain <img>, not next/image: cover_url is pasted by members,
 * so any host is possible, and allowing that through the optimizer would mean
 * `remotePatterns` with a wildcard hostname — i.e. our server fetching arbitrary
 * URLs on request (SSRF surface and an open bandwidth proxy). A plain <img>
 * needs no allowlist, and the boxes below are all fixed-size, so the optimizer's
 * main benefit (reserving layout) is not needed here.
 *
 * Rendering nothing — no URL, an unusable URL, or a load failure — leaves the
 * gradient visible, so the fallback is the previous design rather than a broken
 * image icon. The element is absolutely positioned inside a fixed-size box, so
 * it can never shift layout.
 */
export default function CoverImage({
  url,
  seed,
  scrim = false,
  eager = false,
}: {
  url: string | null | undefined;
  /** changes when the box switches to another book, so a stale error resets */
  seed: number;
  /** darken the lower half — only where text sits on top of the cover */
  scrim?: boolean;
  /** above-the-fold covers skip lazy loading */
  eager?: boolean;
}) {
  const src = coverSrc(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [seed, src]);

  if (!src || failed) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- see the note above: user-supplied hosts cannot go through next/image */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          // keeps the artwork's own aspect ratio; biased upward because a book
          // cover carries its title in the top half
          objectFit: "cover",
          objectPosition: "center 25%",
        }}
      />
      {scrim && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(9,13,15,0) 35%, rgba(9,13,15,0.85))",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}

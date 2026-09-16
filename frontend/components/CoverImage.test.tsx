import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { coverSrc } from "@/lib/books";
import CoverImage from "./CoverImage";

describe("coverSrc", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(coverSrc("https://example.com/cover.jpg")).toBe("https://example.com/cover.jpg");
    expect(coverSrc("http://example.com/cover.jpg")).toBe("http://example.com/cover.jpg");
    expect(coverSrc("  https://example.com/cover.jpg  ")).toBe("https://example.com/cover.jpg");
  });

  it("rejects anything that is not an absolute http(s) URL", () => {
    // each of these would otherwise reach an <img src> as pasted free text
    for (const bad of [
      null,
      undefined,
      "",
      "   ",
      "not a url",
      "/covers/local.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "ftp://example.com/cover.jpg",
    ]) {
      expect(coverSrc(bad), String(bad)).toBeNull();
    }
  });

  it("does not choke on an overlong URL", () => {
    const long = `https://example.com/${"a".repeat(480)}.jpg`;
    expect(coverSrc(long)).toBe(long);
  });
});

describe("CoverImage", () => {
  it("renders the cover art when the URL is usable", () => {
    render(<CoverImage url="https://example.com/cover.jpg" seed={1} />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(img).toHaveStyle({ objectFit: "cover" });
  });

  it("renders nothing without a URL, leaving the gradient visible", () => {
    const { container } = render(<CoverImage url={null} seed={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an unusable URL", () => {
    const { container } = render(<CoverImage url="javascript:alert(1)" seed={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("falls back to the gradient when the image fails to load", () => {
    const { container } = render(<CoverImage url="https://example.com/gone.jpg" seed={1} />);
    fireEvent.error(screen.getByRole("presentation", { hidden: true }));
    expect(container).toBeEmptyDOMElement();
  });

  it("adds the scrim only where text sits on the cover", () => {
    const { container: plain } = render(<CoverImage url="https://example.com/c.jpg" seed={1} />);
    expect(plain.querySelectorAll("span")).toHaveLength(0);
    const { container: scrimmed } = render(
      <CoverImage url="https://example.com/c.jpg" seed={2} scrim />,
    );
    expect(scrimmed.querySelectorAll("span")).toHaveLength(1);
  });

  it("lazy-loads by default and eager-loads above the fold", () => {
    const { unmount } = render(<CoverImage url="https://example.com/c.jpg" seed={1} />);
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute("loading", "lazy");
    unmount();
    render(<CoverImage url="https://example.com/c.jpg" seed={1} eager />);
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute("loading", "eager");
  });
});

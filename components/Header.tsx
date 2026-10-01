"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-(--border) bg-[#0b0e13]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Codebase<span className="text-(--accent)">AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-(--muted) transition-colors hover:text-(--accent)"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/Nnavodya/codebase-assistant"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-(--muted) transition-colors hover:text-(--accent)"
          >
            GitHub ↗
          </a>
          <Link
            href="/assistant"
            className="rounded-sm border border-(--border) px-3.5 py-1.5 font-mono text-xs text-(--text) transition-colors hover:border-(--accent) hover:text-(--accent)"
          >
            Open app →
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-sm text-(--muted) sm:hidden"
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-(--border) px-5 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-2 text-sm text-(--muted)">
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/Nnavodya/codebase-assistant"
            target="_blank"
            rel="noreferrer"
            className="py-2 text-sm text-(--muted)"
          >
            GitHub ↗
          </a>
          <Link
            href="/assistant"
            className="mt-2 rounded-sm border border-(--border) px-3 py-2 text-center font-mono text-xs text-(--accent)"
          >
            Open app →
          </Link>
        </nav>
      )}
    </header>
  );
}
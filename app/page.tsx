"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PIPELINE = [
  { icon: "◉", label: "GitHub Repo" },
  { icon: "⌁", label: "File Scanner" },
  { icon: "▦", label: "Code Chunks" },
  { icon: "✦", label: "Embeddings" },
  { icon: "⌕", label: "Hybrid Search" },
  { icon: "✺", label: "Groq LLM" },
];

const STATS = [
  { value: "300", label: "files indexed" },
  { value: "Local", label: "embeddings" },
  { value: "Hybrid", label: "retrieval" },
  { value: "100%", label: "source-grounded" },
];

const STEPS = [
  { n: "01", title: "Connect", body: "Point it at any public GitHub repository." },
  { n: "02", title: "Index", body: "Files are chunked and turned into embeddings, then saved." },
  { n: "03", title: "Retrieve", body: "A question is matched against code using hybrid search." },
  { n: "04", title: "Answer", body: "Groq answers using only retrieved code, with sources cited." },
];

const CARDS = [
  { icon: "⌁", color: "var(--ai)", label: "RAG", title: "Grounded, not guessed", body: "Answers are generated only from code actually retrieved from the repository." },
  { icon: "✓", color: "var(--ok)", label: "VERIFIED", title: "File + line citations", body: "Every answer links to the exact file and line range on GitHub." },
  { icon: "◉", color: "var(--accent)", label: "LOCAL", title: "Free local embeddings", body: "Runs on a local embedding model — no per-query API cost." },
];

const DEMO_SOURCES = [
  { file: "middleware/authMiddleware.ts", lines: "L12–38" },
  { file: "services/authService.ts", lines: "L45–91" },
  { file: "routes/auth.ts", lines: "L8–26" },
];

export default function Landing() {
  const router = useRouter();
  const [repo, setRepo] = useState("");

  function handleAnalyze() {
    const url = repo.trim().replace(/\.git$/, "");
    if (!url) return;
    router.push(`/assistant?repo=${encodeURIComponent(url)}`);
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5">
        {/* ---------- Hero ---------- */}
        <section id="hero" className="grid grid-cols-1 items-center gap-12 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-[var(--accent)]">
              <span className="pulse-dot">●</span> AI-POWERED CODE INTELLIGENCE
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Understand any GitHub codebase.
              <br />
              Ask it anything.
            </h1>

            <p className="mt-4 max-w-md text-sm text-[var(--muted)]">
              AI-powered code intelligence for exploring, explaining, and documenting real
              repositories — grounded in the actual code, not guesses.
            </p>

            <div className="mt-8 flex gap-2">
              <div className="flex w-full items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 focus-within:border-[var(--accent)]">
                <span className="text-[var(--muted)]">◉</span>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="Paste a public GitHub repository..."
                  className="w-full bg-transparent py-2.5 font-mono text-sm outline-none"
                />
              </div>
              <button
                onClick={handleAnalyze}
                className="shrink-0 rounded-sm bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[#08090d] transition-opacity hover:opacity-90"
              >
                Analyze →
              </button>
            </div>
            <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">⌘ Enter to analyze</p>

            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[var(--muted)]">
              <span>✓ GitHub API</span>
              <span>✓ Local embeddings</span>
              <span>✓ Hybrid search</span>
              <span>✓ Groq</span>
            </div>
          </div>

          {/* Right: RAG visualization */}
          <div className="hidden justify-self-center lg:block">
            <div className="w-72 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-mono text-[11px] text-[var(--muted)]">REPOSITORY</p>
              <p className="mt-1 truncate font-mono text-xs">Nnavodya/project</p>
              <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 font-mono text-[11px] text-[var(--ok)]">
                <p>✓ 142 files</p>
                <p>✓ 842 chunks</p>
                <p>✓ Indexed</p>
              </div>
            </div>

            <div className="ml-8 h-6 w-px bg-[var(--border)]" />

            <div className="ml-4 w-72 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-mono text-[11px] text-[var(--muted)]">HYBRID SEARCH</p>
              <div className="mt-2 flex gap-4 font-mono text-xs">
                <span className="text-[var(--ai)]">vector 0.82</span>
                <span className="text-[var(--accent)]">keyword 0.71</span>
              </div>
            </div>

            <div className="ml-12 h-6 w-px bg-[var(--border)]" />

            <div className="ml-8 w-56 rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 text-center">
              <p className="font-mono text-xs text-[var(--accent)]">✺ GROQ LLM</p>
            </div>
          </div>
        </section>

        {/* ---------- Pipeline ---------- */}
        <section className="mt-24">
          <p className="mb-4 font-mono text-xs text-[var(--muted)]">how a question is answered</p>
          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs transition-colors hover:border-[var(--accent)]">
                  <span className="text-[var(--accent)]">{step.icon}</span>
                  {step.label}
                </div>
                {i < PIPELINE.length - 1 && <span className="text-[var(--muted)]">→</span>}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-2 gap-6 border-y border-[var(--border)] py-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-semibold">{s.value}</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="mt-24">
          <p className="mb-6 font-mono text-xs text-[var(--muted)]">how it works</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/50"
              >
                <p className="font-mono text-xs text-[var(--accent)]">{s.n}</p>
                <p className="mt-2 font-display text-sm font-semibold">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- See it in action ---------- */}
        <section className="mt-24">
          <p className="mb-6 font-mono text-xs text-[var(--muted)]">see it in action</p>

          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
              <span className="font-mono text-sm text-[var(--text)]">
                Where is JWT authentication implemented?
              </span>
              <span className="shrink-0 font-mono text-xs text-[var(--muted)]">⌘↵</span>
            </div>

            <p className="mt-5 font-mono text-[11px] text-[var(--muted)]">AI ANSWER</p>
            <p className="mt-2 text-sm text-[var(--text)]">
              JWT authentication is handled through the authentication middleware and auth
              service.
            </p>

            <p className="mb-2 mt-5 font-mono text-[11px] text-[var(--muted)]">SOURCES</p>
            <div className="space-y-1.5">
              {DEMO_SOURCES.map((s) => (
                <div
                  key={s.file}
                  className="flex items-center justify-between gap-3 rounded-sm border border-[var(--border)] px-3 py-1.5 font-mono text-xs"
                >
                  <span className="flex items-center gap-1.5 truncate text-[var(--ok)]">
                    <span>✓</span> {s.file} {s.lines}
                  </span>
                  <span className="shrink-0 text-[var(--muted)]">Open ↗</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Why CodebaseAI ---------- */}
        <section id="features" className="mt-24 pb-24">
          <p className="mb-6 font-mono text-xs text-[var(--muted)]">why codebaseai</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CARDS.map((c) => (
              <div
                key={c.label}
                className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/50"
              >
                <p className="font-mono text-xs" style={{ color: c.color }}>
                  {c.icon} {c.label}
                </p>
                <p className="mt-2 font-display text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{c.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

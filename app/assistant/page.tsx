"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import FileTree from "@/components/FileTree";
import { buildTree } from "@/lib/tree";

type Source = { id: string; filePath: string; startLine: number; endLine: number; score: number; url: string };
type AskResponse = { answer: string; fromCache: boolean; seconds: number; chunks: number; files: number; sources: Source[]; error?: string };
type FilesResponse = { files: string[]; error?: string };
type ExplainResponse = { explanation: string; filePath: string; truncated: boolean; seconds: number; url: string; error?: string };
type DocsResponse = { markdown: string; repoName: string; seconds: number; error?: string };
type Tab = "ask" | "explain" | "docs";

const inputClass =
  "w-full rounded-sm border border-(--border) bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-(--accent)";
const primaryButtonClass =
  "rounded-sm bg-(--accent) px-4 py-2 text-sm font-medium text-[#08090d] transition-opacity hover:opacity-90 disabled:opacity-40";
const ghostButtonClass =
  "rounded-sm border border-(--border) px-3 py-1.5 text-xs text-(--muted) transition-colors hover:border-(--accent) hover:text-(--text)";
const errorClass = "mt-4 rounded-sm border border-(--danger) bg-(--danger)/10 px-3 py-2 text-sm text-(--danger)";
const resultBoxClass = "rounded-sm border border-(--border) bg-(--surface) p-4";

const TABS: { id: Tab; label: string }[] = [
  { id: "ask", label: "ask" },
  { id: "explain", label: "explain" },
  { id: "docs", label: "docs" },
];

function AssistantInner() {
  const params = useSearchParams();
  const [repoUrl, setRepoUrl] = useState(params.get("repo") ?? "");
  const [tab, setTab] = useState<Tab>("ask");

  // Sidebar / repo-level state
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [indexedRepo, setIndexedRepo] = useState("");
  const [indexSeconds, setIndexSeconds] = useState(0);
  const [selectedFile, setSelectedFile] = useState("");

  // Ask
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AskResponse | null>(null);
  const [answerCopied, setAnswerCopied] = useState(false);

  // Explain
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);

  // Docs
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [docsData, setDocsData] = useState<DocsResponse | null>(null);
  const [docsCopied, setDocsCopied] = useState(false);

  const cleanRepo = () => repoUrl.trim().replace(/\.git$/, "");

  async function handleIndex() {
    if (!repoUrl.trim()) {
      setFilesError("Add a repo URL first.");
      return;
    }
    setFilesLoading(true);
    setFilesError("");
    setFiles([]);
    setSelectedFile("");
    const start = Date.now();
    try {
      const res = await fetch(`/api/files?repo=${encodeURIComponent(cleanRepo())}`);
      const json: FilesResponse = await res.json();
      if (!res.ok || json.error) {
        setFilesError(json.error ?? "Could not load files.");
      } else {
        setFiles(json.files);
        setIndexedRepo(cleanRepo());
        setIndexSeconds((Date.now() - start) / 1000);
      }
    } catch {
      setFilesError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setFilesLoading(false);
    }
  }

  // Auto-index if a repo arrived from the landing page
  useEffect(() => {
    if (!params.get("repo")) return;
    const timeoutId = window.setTimeout(() => void handleIndex(), 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAsk() {
    if (!repoUrl.trim() || !question.trim()) {
      setError("Add a repo URL and a question.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: cleanRepo(), question: question.trim() }),
      });
      const json: AskResponse = await res.json();
      if (!res.ok || json.error) setError(json.error ?? "Something went wrong.");
      else setData(json);
    } catch {
      setError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain(filePath: string) {
    setSelectedFile(filePath);
    setTab("explain");
    setExplainLoading(true);
    setExplainData(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: cleanRepo(), filePath }),
      });
      const json: ExplainResponse = await res.json();
      if (res.ok && !json.error) setExplainData(json);
    } finally {
      setExplainLoading(false);
    }
  }

  async function handleGenerateDocs() {
    if (!repoUrl.trim()) {
      setDocsError("Add a repo URL first.");
      return;
    }
    setDocsLoading(true);
    setDocsError("");
    setDocsData(null);
    setDocsCopied(false);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: cleanRepo() }),
      });
      const json: DocsResponse = await res.json();
      if (!res.ok || json.error) setDocsError(json.error ?? "Something went wrong.");
      else setDocsData(json);
    } catch {
      setDocsError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setDocsLoading(false);
    }
  }

  async function handleCopyAnswer() {
    if (!data) return;
    await navigator.clipboard.writeText(data.answer);
    setAnswerCopied(true);
    setTimeout(() => setAnswerCopied(false), 2000);
  }

  async function handleCopyDocs() {
    if (!docsData) return;
    await navigator.clipboard.writeText(docsData.markdown);
    setDocsCopied(true);
    setTimeout(() => setDocsCopied(false), 2000);
  }

  function handleDownloadDocs() {
    if (!docsData) return;
    const blob = new Blob([docsData.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "README.generated.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tree = buildTree(files);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-(--border) px-5 py-3">
        <Link href="/" className="font-mono text-sm">
          <span className="text-(--accent)">◉</span> CodebaseAI
        </Link>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleIndex()}
          placeholder="https://github.com/username/repository"
          className="mx-4 w-full max-w-md rounded-sm border border-(--border) bg-(--surface) px-3 py-1.5 font-mono text-xs outline-none focus:border-(--accent)"
        />
        <button onClick={handleIndex} disabled={filesLoading} className={primaryButtonClass}>
          {filesLoading ? "..." : "Index"}
        </button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-(--border) p-4 sm:block">
          <p className="mb-2 font-mono text-xs text-(--muted)">REPOSITORY</p>

          {filesError && <p className="text-xs text-(--danger)">{filesError}</p>}

          {files.length > 0 ? (
            <>
              <FileTree tree={tree} selected={selectedFile} onSelect={handleExplain} />
              <div className="mt-4 border-t border-(--border) pt-3 font-mono text-xs text-(--muted)">
                {files.length} files
              </div>
            </>
          ) : (
            !filesLoading && <p className="text-xs text-(--muted)">Index a repo to browse its files.</p>
          )}

          {/* AI engine status */}
          {indexedRepo && (
            <div className="mt-6 border-t border-(--border) pt-4">
              <p className="mb-2 font-mono text-xs text-(--muted)">AI ENGINE</p>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-(--ok)">
                  <span>●</span> Repository indexed
                </div>
                <div className="flex justify-between text-(--muted)">
                  <span>Embeddings</span>
                  <span className="text-(--text)">Local</span>
                </div>
                <div className="flex justify-between text-(--muted)">
                  <span>Search</span>
                  <span className="text-(--text)">Hybrid</span>
                </div>
                <div className="flex justify-between text-(--muted)">
                  <span>LLM</span>
                  <span className="text-(--text)">Groq</span>
                </div>
                <div className="flex justify-between text-(--muted)">
                  <span>Indexed in</span>
                  <span className="text-(--text)">{indexSeconds}s</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main panel */}
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-(--border)">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2 font-mono text-sm transition-colors ${
                  tab === t.id
                    ? "border-(--accent) text-(--text)"
                    : "border-transparent text-(--muted) hover:text-(--text)"
                }`}
              >
                $ {t.label}
              </button>
            ))}
          </div>

          {/* Ask */}
          {tab === "ask" && (
            <section className="mt-6">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
                  placeholder="Where is JWT authentication?"
                  className={inputClass}
                />
                <button onClick={handleAsk} disabled={loading} className={primaryButtonClass}>
                  {loading ? "..." : "Ask"}
                </button>
              </div>
              {loading && (
                <p className="mt-2 font-mono text-xs text-(--muted)">
                  thinking — first run for a new repo can take a minute or two
                </p>
              )}

              {error && <div className={errorClass}>{error}</div>}

              {data && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-(--muted)">
                      {data.chunks} chunks · {data.files} files · {data.seconds}s
                      {data.fromCache ? " · cached" : ""}
                    </span>
                    <button onClick={handleCopyAnswer} className={ghostButtonClass}>
                      {answerCopied ? "copied" : "copy"}
                    </button>
                  </div>

                  <div className={resultBoxClass}>
                    <Markdown>{data.answer}</Markdown>
                  </div>

                  <p className="mb-2 mt-5 font-mono text-xs text-(--muted)">SOURCES</p>
                  <div className="space-y-1.5">
                    {data.sources.map((s) => (
                      <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-sm border border-(--border) px-3 py-1.5 font-mono text-xs transition-colors hover:border-(--accent)"
                      >
                        <span className="flex items-center gap-1.5 truncate text-(--ok)">
                          <span>✓</span>
                          {s.filePath}:{s.startLine}-{s.endLine}
                        </span>
                        <span className="shrink-0 text-(--muted)">{s.score} · Open ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Explain */}
          {tab === "explain" && (
            <section className="mt-6">
              {!selectedFile && (
                <p className="text-sm text-(--muted)">
                  Pick a file from the sidebar to explain it.
                </p>
              )}

              {explainLoading && (
                <p className="font-mono text-xs text-(--muted)">explaining...</p>
              )}

              {explainData && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <a
                      href={explainData.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs text-(--ok) underline"
                    >
                      {explainData.filePath}
                    </a>
                    <span className="shrink-0 font-mono text-xs text-(--muted)">
                      {explainData.seconds}s
                    </span>
                  </div>

                  <div className={resultBoxClass}>
                    <Markdown>{explainData.explanation}</Markdown>
                  </div>

                  {explainData.truncated && (
                    <p className="mt-2 font-mono text-xs text-(--accent)">
                      file truncated — only the first part was explained
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Docs */}
          {tab === "docs" && (
            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-(--muted)">
                  Writes a README from the file list and key files. Review before using it.
                </p>
                <button onClick={handleGenerateDocs} disabled={docsLoading} className={`${primaryButtonClass} shrink-0`}>
                  {docsLoading ? "writing..." : "Generate"}
                </button>
              </div>

              {docsError && <div className={errorClass}>{docsError}</div>}

              {docsData && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-(--muted)">
                      {docsData.repoName} · {docsData.seconds}s
                    </span>
                    <div className="flex gap-2">
                      <button onClick={handleCopyDocs} className={ghostButtonClass}>
                        {docsCopied ? "copied" : "copy"}
                      </button>
                      <button onClick={handleDownloadDocs} className={ghostButtonClass}>
                        download .md
                      </button>
                    </div>
                  </div>
                  <div className={resultBoxClass}>
                    <Markdown>{docsData.markdown}</Markdown>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantInner />
    </Suspense>
  );
}
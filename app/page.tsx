"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";

type Source = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  score: number;
  url: string;
};

type AskResponse = {
  answer: string;
  fromCache: boolean;
  seconds: number;
  chunks: number;
  files: number;
  sources: Source[];
  error?: string;
};

type FilesResponse = {
  files: string[];
  error?: string;
};

type ExplainResponse = {
  explanation: string;
  filePath: string;
  truncated: boolean;
  seconds: number;
  url: string;
  error?: string;
};

type DocsResponse = {
  markdown: string;
  repoName: string;
  seconds: number;
  error?: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-400 bg-transparent px-3 py-2 outline-none focus:border-blue-500";
const buttonClass =
  "rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const secondaryButtonClass =
  "rounded-lg border border-gray-400 px-4 py-2 text-sm hover:border-blue-500";
const errorClass =
  "mt-4 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-500";
const resultBoxClass = "rounded-lg border border-blue-500 bg-blue-500/5 p-4";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");

  // Ask a question
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AskResponse | null>(null);

  // Explain a file
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);

  // Generate documentation
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [docsData, setDocsData] = useState<DocsResponse | null>(null);
  const [answerCopied, setAnswerCopied] = useState(false);
  const [docsCopied, setDocsCopied] = useState(false);

  const cleanRepo = () => repoUrl.trim().replace(/\.git$/, "");

  async function handleAsk() {
    if (!repoUrl.trim() || !question.trim()) {
      setError("Please enter both a GitHub repo URL and a question.");
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

      if (!res.ok || json.error) {
        setError(json.error ?? "Something went wrong.");
      } else {
        setData(json);
      }
    } catch {
      setError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadFiles() {
    if (!repoUrl.trim()) {
      setFileError("Please enter a GitHub repo URL first.");
      return;
    }

    setFilesLoading(true);
    setFileError("");
    setFiles([]);
    setSelectedFile("");
    setExplainData(null);

    try {
      const res = await fetch(`/api/files?repo=${encodeURIComponent(cleanRepo())}`);
      const json: FilesResponse = await res.json();

      if (!res.ok || json.error) {
        setFileError(json.error ?? "Could not load files.");
      } else {
        setFiles(json.files);
        setSelectedFile(json.files[0] ?? "");
      }
    } catch {
      setFileError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setFilesLoading(false);
    }
  }

  async function handleExplain() {
    if (!selectedFile) {
      setFileError("Please choose a file first.");
      return;
    }

    setExplainLoading(true);
    setFileError("");
    setExplainData(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: cleanRepo(), filePath: selectedFile }),
      });
      const json: ExplainResponse = await res.json();

      if (!res.ok || json.error) {
        setFileError(json.error ?? "Something went wrong.");
      } else {
        setExplainData(json);
      }
    } catch {
      setFileError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setExplainLoading(false);
    }
  }

  async function handleGenerateDocs() {
    if (!repoUrl.trim()) {
      setDocsError("Please enter a GitHub repo URL first.");
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

      if (!res.ok || json.error) {
        setDocsError(json.error ?? "Something went wrong.");
      } else {
        setDocsData(json);
      }
    } catch {
      setDocsError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setDocsLoading(false);
    }
  }

    async function handleCopyAnswer() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.answer);
      setAnswerCopied(true);
      setTimeout(() => setAnswerCopied(false), 2000);
    } catch {
      setError("Could not copy. Please select the text and copy it manually.");
    }
  }

  async function handleCopyDocs() {
    if (!docsData) return;
    try {
      await navigator.clipboard.writeText(docsData.markdown);
      setDocsCopied(true);
      setTimeout(() => setDocsCopied(false), 2000);
    } catch {
      setDocsError("Could not copy. Please select the text and copy it manually.");
    }
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">AI GitHub Codebase Assistant</h1>
      <p className="mt-2 text-sm opacity-70">
        Paste a public GitHub repository. Ask questions about its code, get a file explained, or
        generate a README.
      </p>

      <div className="mt-8">
        <label className="mb-1 block text-sm font-medium">GitHub repository URL</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          className={inputClass}
        />
      </div>

      {/* ---------- Ask a question ---------- */}
      <section className="mt-8 rounded-xl border border-gray-500 p-5">
        <h2 className="text-lg font-semibold">Ask a question</h2>

        <div className="mt-3 space-y-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleAsk();
            }}
            placeholder="Where is JWT authentication?"
            className={inputClass}
          />

          <button onClick={handleAsk} disabled={loading} className={buttonClass}>
            {loading ? "Thinking... (first time for a repo can take a minute or two)" : "Ask"}
          </button>
        </div>

        {error && <div className={errorClass}>{error}</div>}

        {data && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Answer</h3>
              <button onClick={handleCopyAnswer} className={secondaryButtonClass}>
                {answerCopied ? "Copied!" : "Copy answer"}
              </button>
            </div>
            <div className={resultBoxClass}>
              <Markdown>{data.answer}</Markdown>
            </div>

            <p className="mt-2 text-xs opacity-60">
              Searched {data.chunks} chunks from {data.files} files in {data.seconds}s
              {data.fromCache ? " (using saved index)" : " (new index created)"}
            </p>

            <h3 className="mb-2 mt-5 font-semibold">Sources</h3>
            <div className="space-y-2">
              {data.sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-400 px-3 py-2 text-sm hover:border-blue-500"
                >
                  <code className="break-all">
                    {s.filePath}:{s.startLine}-{s.endLine}
                  </code>
                  <span className="shrink-0 rounded bg-blue-600/20 px-2 py-0.5 text-xs">
                    score {s.score}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------- Explain a file ---------- */}
      <section className="mt-8 rounded-xl border border-gray-500 p-5">
        <h2 className="text-lg font-semibold">Explain a file</h2>

        <div className="mt-3 space-y-4">
          <button onClick={handleLoadFiles} disabled={filesLoading} className={buttonClass}>
            {filesLoading ? "Loading files... (first time can take a minute or two)" : "Load files"}
          </button>

          {files.length > 0 && (
            <>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className={`${inputClass} bg-black`}
              >
                {files.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <button onClick={handleExplain} disabled={explainLoading} className={buttonClass}>
                {explainLoading ? "Explaining..." : "Explain this file"}
              </button>
            </>
          )}
        </div>

        {fileError && <div className={errorClass}>{fileError}</div>}

        {explainData && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <a
                href={explainData.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm font-semibold underline"
              >
                {explainData.filePath}
              </a>
              <span className="shrink-0 text-xs opacity-60">{explainData.seconds}s</span>
            </div>

            <div className={resultBoxClass}>
              <Markdown>{explainData.explanation}</Markdown>
            </div>

            {explainData.truncated && (
              <p className="mt-2 text-xs text-yellow-500">
                This file is long, so only the first part was explained.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---------- Generate documentation ---------- */}
      <section className="mt-8 rounded-xl border border-gray-500 p-5">
        <h2 className="text-lg font-semibold">Generate documentation</h2>
        <p className="mt-1 text-xs opacity-60">
          Creates a README from the file list and key files. Please review it before using it.
        </p>

        <div className="mt-3">
          <button onClick={handleGenerateDocs} disabled={docsLoading} className={buttonClass}>
            {docsLoading
              ? "Writing README... (first time for a repo can take a minute or two)"
              : "Generate README"}
          </button>
        </div>

        {docsError && <div className={errorClass}>{docsError}</div>}

        {docsData && (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs opacity-60">
                {docsData.repoName} · {docsData.seconds}s
              </span>
              <div className="flex gap-2">
                <button onClick={handleCopyDocs} className={secondaryButtonClass}>
                  {docsCopied ? "Copied!" : "Copy markdown"}
                </button>
                <button onClick={handleDownloadDocs} className={secondaryButtonClass}>
                  Download .md
                </button>
              </div>
            </div>

            <div className={resultBoxClass}>
              <Markdown>{docsData.markdown}</Markdown>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
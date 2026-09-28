"use client";

import { useState } from "react";

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

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AskResponse | null>(null);

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
        body: JSON.stringify({
          repo: repoUrl.trim().replace(/\.git$/, ""),
          question: question.trim(),
        }),
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">AI GitHub Codebase Assistant</h1>
      <p className="mt-2 text-sm opacity-70">
        Paste a public GitHub repository and ask a question about its code.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">GitHub repository URL</label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className="w-full rounded-lg border border-gray-400 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Your question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleAsk();
            }}
            placeholder="Where is JWT authentication?"
            className="w-full rounded-lg border border-gray-400 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleAsk}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Thinking... (first time for a repo can take a minute or two)" : "Ask"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {data && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Answer</h2>
          <div className="whitespace-pre-wrap rounded-lg border border-blue-500 bg-blue-500/5 p-4 text-sm leading-relaxed">
            {data.answer}
          </div>

          <p className="mt-2 text-xs opacity-60">
            Searched {data.chunks} chunks from {data.files} files in {data.seconds}s
            {data.fromCache ? " (using saved index)" : " (new index created)"}
          </p>

          <h2 className="mb-2 mt-6 text-lg font-semibold">Sources</h2>
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
        </section>
      )}
    </main>
  );
}
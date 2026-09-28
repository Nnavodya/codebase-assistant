"use client";

import { useState } from "react";

type SearchResult = {
  id: string;
  score: number;
  preview: string;
};

type SearchResponse = {
  question: string;
  files: number;
  chunks: number;
  seconds: number;
  results: SearchResult[];
  error?: string;
};

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);

  async function handleSearch() {
    if (!repoUrl.trim() || !question.trim()) {
      setError("Please enter both a GitHub repo URL and a question.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const params = new URLSearchParams({
        repo: repoUrl.trim().replace(/\.git$/, ""),
        q: question.trim(),
      });
      const res = await fetch(`/api/test-search?${params.toString()}`);
      const json: SearchResponse = await res.json();

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
              if (e.key === "Enter" && !loading) handleSearch();
            }}
            placeholder="Where is JWT authentication?"
            className="w-full rounded-lg border border-gray-400 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching... (first run can take a minute)" : "Search"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {data && (
        <section className="mt-8">
          <p className="mb-4 text-sm opacity-70">
            Searched {data.chunks} chunks from {data.files} files in {data.seconds}s
          </p>

          <div className="space-y-4">
            {data.results.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-400 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <code className="break-all text-sm font-semibold">{r.id}</code>
                  <span className="shrink-0 rounded bg-blue-600/20 px-2 py-0.5 text-xs">
                    score {r.score}
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs opacity-80">
                  {r.preview}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
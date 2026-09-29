import fs from "fs/promises";
import path from "path";
import { fetchRepoFiles, parseRepoUrl } from "./github";
import { chunkFiles, type CodeChunk } from "./chunker";
import { embedTexts, embedText, cosineSimilarity } from "./embeddings";

const STOPWORDS = new Set([
  "the", "is", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or",
  "this", "what", "where", "how", "are", "does", "do", "it", "with", "was",
  "repository", "repo", "code", "file", "project",
]);

// Split text into lowercase words, dropping common stopwords
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// How much of the question's meaningful words appear in this chunk (0 to 1)
function keywordOverlap(questionWords: string[], chunk: CodeChunk): number {
  if (questionWords.length === 0) return 0;

  const haystack = tokenize(`${chunk.filePath} ${chunk.content}`);
  const haystackSet = new Set(haystack);

  let matches = 0;
  for (const word of questionWords) {
    if (haystackSet.has(word)) matches++;
    // Extra credit if the word appears in the file NAME itself (strong signal)
    else if (chunk.filePath.toLowerCase().includes(word)) matches += 0.5;
  }

  return Math.min(matches / questionWords.length, 1);
}

// Documentation files describe intentions; code files prove what is actually built.
// Slightly trust code more when ranking results.
// Words that signal the user wants to see actual implementation, not a description
const IMPLEMENTATION_SIGNALS = [
  "implement", "implemented", "implementation", "where", "how",
  "function", "code", "logic", "handle", "handles", "route", "endpoint",
];

// Documentation files describe intentions; code files prove what is actually built.
// Only trust code more when the question is clearly asking about implementation.
function languageWeight(language: string, questionWords: string[]): number {
  const isImplementationQuestion = questionWords.some((w) => IMPLEMENTATION_SIGNALS.includes(w));
  if (language === "markdown" && isImplementationQuestion) return 0.5;
  return 1.0;
}
export type RepoIndex = {
  repoUrl: string;
  owner: string;
  repo: string;
  createdAt: string;
  fileCount: number;
  chunks: CodeChunk[];
  vectors: number[][];
};

export type SearchHit = {
  chunk: CodeChunk;
  score: number;
};

const DATA_DIR = path.join(process.cwd(), "data");

// Keep recently used indexes in memory so we do not read the file every time
const memoryCache = new Map<string, RepoIndex>();

function safeName(text: string) {
  return text.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function indexFilePath(owner: string, repo: string) {
  return path.join(DATA_DIR, `${safeName(owner)}__${safeName(repo)}.json`.toLowerCase());
}

async function readIndexFromDisk(filePath: string): Promise<RepoIndex | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as RepoIndex;
  } catch {
    return null; // file does not exist yet
  }
}

// Get the saved index for a repo, or build it (fetch + chunk + embed + save)
export async function getOrBuildIndex(
  repoUrl: string,
  forceRebuild = false
): Promise<{ index: RepoIndex; fromCache: boolean }> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const filePath = indexFilePath(owner, repo);

  if (!forceRebuild) {
    const inMemory = memoryCache.get(filePath);
    if (inMemory) return { index: inMemory, fromCache: true };

    const onDisk = await readIndexFromDisk(filePath);
    if (onDisk) {
      memoryCache.set(filePath, onDisk);
      return { index: onDisk, fromCache: true };
    }
  }

  // Build a new index
  const files = await fetchRepoFiles(repoUrl);
  const chunks = chunkFiles(files);

  if (chunks.length === 0) {
    throw new Error("No indexable code files were found in this repository.");
  }

  const vectors = await embedTexts(chunks.map((c) => c.text));

  const index: RepoIndex = {
    repoUrl,
    owner,
    repo,
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    chunks,
    vectors,
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(index), "utf-8");
  memoryCache.set(filePath, index);

  return { index, fromCache: false };
}

// Find the chunks whose meaning is closest to the question
export async function searchIndex(
  index: RepoIndex,
  question: string,
  topK = 5
): Promise<SearchHit[]> {
  const questionVector = await embedText(question);
  const questionWords = tokenize(question);

  const scored = index.chunks.map((chunk, i) => {
    const vectorScore = cosineSimilarity(questionVector, index.vectors[i]);
    const keywordScore = keywordOverlap(questionWords, chunk);

    // Meaning match matters most, keyword overlap adds precision,
    // and code files are trusted slightly more than documentation.
    const combined = (vectorScore * 0.7 + keywordScore * 0.3) * languageWeight(chunk.language, questionWords);
    return { chunk, score: combined };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
import fs from "fs/promises";
import path from "path";
import { fetchRepoFiles, parseRepoUrl } from "./github";
import { chunkFiles, type CodeChunk } from "./chunker";
import { embedTexts, embedText, cosineSimilarity } from "./embeddings";

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

  return index.chunks
    .map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(questionVector, index.vectors[i]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
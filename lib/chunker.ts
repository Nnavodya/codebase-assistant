import type { RepoFile } from "./github";

export type CodeChunk = {
  id: string; // unique id, for example "lib/auth.ts:12-40"
  filePath: string;
  startLine: number; // 1-based, first line of the chunk
  endLine: number; // 1-based, last line of the chunk
  language: string;
  content: string; // the raw code of the chunk
  text: string; // file path + code, this is what we will embed later
};

const MAX_CHARS = 1500; // maximum size of one chunk
const MIN_CHARS = 400; // do not cut at a blank line before this size
const OVERLAP_LINES = 4; // lines repeated at the start of the next chunk

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  java: "java",
  php: "php",
  sql: "sql",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  properties: "properties",
};

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGES[ext] ?? "text";
}

export function chunkFile(file: RepoFile): CodeChunk[] {
  const lines = file.content.split("\n");
  const language = detectLanguage(file.path);
  const chunks: CodeChunk[] = [];

  let start = 0;

  while (start < lines.length) {
    let end = start;
    let size = 0;
    let lastBlank = -1;

    // Add lines until the chunk is big enough
    while (end < lines.length) {
      const lineLength = lines[end].length + 1;
      if (size + lineLength > MAX_CHARS && end > start) break;
      size += lineLength;
      if (lines[end].trim() === "" && size >= MIN_CHARS) lastBlank = end;
      end++;
    }

    // If the file is not finished, try to cut at the last blank line
    if (end < lines.length && lastBlank > start) {
      end = lastBlank + 1;
    }

    // Safety: a single very long line (for example minified code)
    const content = lines
      .slice(start, end)
      .join("\n")
      .trim()
      .slice(0, MAX_CHARS * 2);

    if (content.length > 0) {
      const startLine = start + 1;
      const endLine = end;
      chunks.push({
        id: `${file.path}:${startLine}-${endLine}`,
        filePath: file.path,
        startLine,
        endLine,
        language,
        content,
        text: `File: ${file.path}\n${content}`,
      });
    }

    if (end >= lines.length) break;

    // Next chunk starts a few lines earlier (overlap), but must always move forward
    start = Math.max(end - OVERLAP_LINES, start + 1);
  }

  return chunks;
}

export function chunkFiles(files: RepoFile[]): CodeChunk[] {
  return files.flatMap((file) => chunkFile(file));
}
import type { RepoIndex } from "./vectorStore";
import { callGroq } from "./llm";

const MAX_TREE_FILES = 120; // keep the prompt small for free plans

const DOCS_SYSTEM_PROMPT = `You write a README.md for a GitHub repository. Use ONLY the information given: the file list, the environment variables found in the code, some package.json files, some main files, and the existing README (which may be outdated or wrong).

Use this structure:
# Project title
A short description (2-3 sentences).
## Features
Only features that are clearly proven by file names or code that is shown.
## Tech Stack
Only technologies you can see in package.json or the code.
## Project Structure
A short explanation of the main folders and files.
## Getting Started
Prerequisites, install steps, and run commands using ONLY the scripts found in package.json.
## Environment Variables
List ONLY the variable names from the section "Environment variables found in the code", spelled exactly the same. Do not add any other variable, even if the existing README mentions it.
## Main Modules
The main routes, models, components or services. Describe them only by their file and folder names.

Strict rules:
- Do not invent features, scripts, environment variables, URLs, versions, or behaviors.
- Do not describe what an endpoint does unless the code shown proves it. For example, do not claim "token refresh", "filtering" or "status tracking" from a file name alone.
- Do not state a Node.js version unless a package.json "engines" field shows it.
- Do not add License, Author, Contributing, Deployment, or Roadmap sections.
- If something is unknown, leave that section or line out.
- Use simple English and keep it short.
- Return only the markdown, with no extra comments and without wrapping it in a code fence.`;

// Get the first chunk(s) of a file from the saved index
function fileHead(index: RepoIndex, filePath: string, count = 1): string {
  return index.chunks
    .filter((c) => c.filePath === filePath)
    .sort((a, b) => a.startLine - b.startLine)
    .slice(0, count)
    .map((c) => c.content)
    .join("\n");
}

// Find environment variable names used anywhere in the code (with the first file that uses them)
function findEnvVars(index: RepoIndex): { name: string; file: string }[] {
  const found = new Map<string, string>();
  const patterns = [/process\.env\.([A-Z][A-Z0-9_]*)/g, /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g];

  for (const chunk of index.chunks) {
    // Markdown files are not real code, so skip them
    if (chunk.language === "markdown") continue;
    for (const pattern of patterns) {
      for (const match of chunk.content.matchAll(pattern)) {
        const name = match[1];
        if (name === "NODE_ENV") continue;
        if (!found.has(name)) found.set(name, chunk.filePath);
      }
    }
  }

  return Array.from(found, ([name, file]) => ({ name, file })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

const depth = (p: string) => p.split("/").length;

export async function generateReadme(index: RepoIndex): Promise<string> {
  const paths = Array.from(new Set(index.chunks.map((c) => c.filePath))).sort();

  // Pick the most useful files to read
  const readme = paths.find((p) => /^readme\.md$/i.test(p));
  const packageJsons = paths
    .filter((p) => p.endsWith("package.json"))
    .sort((a, b) => depth(a) - depth(b))
    .slice(0, 2);
  const entryFiles = paths
    .filter((p) => /(^|\/)(server|app|index|main|App)\.(js|ts|jsx|tsx)$/.test(p))
    .filter((p) => !p.includes("test"))
    .sort((a, b) => depth(a) - depth(b))
    .slice(0, 3);

  // File list (cut if there are too many files)
  const shownPaths = paths.slice(0, MAX_TREE_FILES);
  const hiddenCount = paths.length - shownPaths.length;
  let context = `Repository: ${index.owner}/${index.repo}\n\n## File list\n${shownPaths.join("\n")}`;
  if (hiddenCount > 0) context += `\n... and ${hiddenCount} more files`;

  // Facts found by scanning ALL the code
  const envVars = findEnvVars(index);
  context += `\n\n## Environment variables found in the code`;
  context +=
    envVars.length > 0
      ? `\n${envVars.map((v) => `${v.name} (used in ${v.file})`).join("\n")}`
      : `\nNone found.`;

  for (const p of packageJsons) {
    context += `\n\n## ${p}\n\`\`\`json\n${fileHead(index, p, 2)}\n\`\`\``;
  }
  for (const p of entryFiles) {
    context += `\n\n## ${p} (first part)\n\`\`\`\n${fileHead(index, p, 1)}\n\`\`\``;
  }
  if (readme) {
    context += `\n\n## Existing README (may be outdated or wrong)\n${fileHead(index, readme, 1)}`;
  }

  const markdown = await callGroq(
    [
      { role: "system", content: DOCS_SYSTEM_PROMPT },
      { role: "user", content: `${context}\n\n---\nWrite the README.md for this repository.` },
    ],
    3000
  );

  // Some models wrap the whole answer in a code fence: remove it
  return markdown
    .trim()
    .replace(/^```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/, "");
}
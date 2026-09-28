import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Folders and files we do not want to index
const SKIP_DIRS = [
  "node_modules", ".git", "dist", "build", ".next", "coverage", "vendor", "__pycache__",
];
const SKIP_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "AGENTS.md", "CLAUDE.md"];

// Only these file types are useful for code questions
const ALLOWED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".php", ".sql",
  ".json", ".md", ".css", ".html", ".yml", ".yaml", ".xml", ".properties",
];

const MAX_FILE_SIZE = 100_000; // bytes, skip very large files
const MAX_FILES = 300; // safety limit for free usage
const BATCH_SIZE = 10; // how many files we download at the same time

export type RepoFile = {
  path: string;
  content: string;
};

export function parseRepoUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function fetchRepoFiles(url: string): Promise<RepoFile[]> {
  const { owner, repo } = parseRepoUrl(url);

  // 1. Find the default branch (main or master)
  const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
  const branch = repoInfo.default_branch;

  // 2. Get the full file tree in one request
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  // 3. Keep only useful code files
  const wanted = tree.tree
    .filter((item) => {
      if (item.type !== "blob" || !item.path || !item.sha) return false;
      const parts = item.path.split("/");
      if (parts.some((p) => SKIP_DIRS.includes(p))) return false;
      const name = parts[parts.length - 1];
      if (SKIP_FILES.includes(name)) return false;
      if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) return false;
      if ((item.size ?? 0) > MAX_FILE_SIZE) return false;
      return true;
    })
    .slice(0, MAX_FILES);

  // 4. Download file contents in small batches
  const files: RepoFile[] = [];
  for (let i = 0; i < wanted.length; i += BATCH_SIZE) {
    const batch = wanted.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => {
        const { data: blob } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!,
        });
        const content = Buffer.from(blob.content, "base64").toString("utf-8");
        return { path: item.path!, content };
      })
    );
    files.push(...results);
  }

  return files;
}
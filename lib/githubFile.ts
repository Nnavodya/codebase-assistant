import { Octokit } from "octokit";
import { parseRepoUrl } from "./github";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Download the text of ONE file from a public GitHub repo
export async function fetchSingleFile(repoUrl: string, filePath: string): Promise<string> {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
  });

  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error(`"${filePath}" is not a readable file.`);
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}
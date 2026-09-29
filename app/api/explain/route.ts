import { NextResponse } from "next/server";
import { getOrBuildIndex } from "@/lib/vectorStore";
import { fetchSingleFile } from "@/lib/githubFile";
import { explainFile } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

// Free Groq plans have token limits per minute, so very long files are cut
const MAX_CODE_CHARS = 12000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const repoUrl: string | undefined = body?.repo?.trim();
  const filePath: string | undefined = body?.filePath?.trim();

  if (!repoUrl || !filePath) {
    return NextResponse.json(
      { error: "Both 'repo' and 'filePath' are required." },
      { status: 400 }
    );
  }

  try {
    const start = Date.now();
    const { index } = await getOrBuildIndex(repoUrl);

    // Only allow files that are in the index
    const known = index.chunks.some((c) => c.filePath === filePath);
    if (!known) {
      return NextResponse.json(
        { error: "This file is not in the indexed repository." },
        { status: 400 }
      );
    }

    const fullCode = await fetchSingleFile(repoUrl, filePath);
    const truncated = fullCode.length > MAX_CODE_CHARS;
    const code = truncated ? fullCode.slice(0, MAX_CODE_CHARS) : fullCode;

    const explanation = await explainFile(filePath, code, truncated);

    return NextResponse.json({
      explanation,
      filePath,
      truncated,
      seconds: (Date.now() - start) / 1000,
      url: `https://github.com/${index.owner}/${index.repo}/blob/HEAD/${filePath}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
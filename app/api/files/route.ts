import { NextResponse } from "next/server";
import { getOrBuildIndex } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const repoUrl = new URL(req.url).searchParams.get("repo")?.trim();

  if (!repoUrl) {
    return NextResponse.json({ error: "'repo' is required." }, { status: 400 });
  }

  try {
    const { index, fromCache } = await getOrBuildIndex(repoUrl);

    // Unique file paths from the saved chunks
    const files = Array.from(new Set(index.chunks.map((c) => c.filePath))).sort();

    return NextResponse.json({ files, fromCache });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
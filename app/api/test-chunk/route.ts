import { NextResponse } from "next/server";
import { fetchRepoFiles } from "@/lib/github";
import { chunkFiles } from "@/lib/chunker";

export async function GET(req: Request) {
  const repoUrl = new URL(req.url).searchParams.get("repo");

  if (!repoUrl) {
    return NextResponse.json(
      { error: "Add ?repo=<github url> to the address" },
      { status: 400 }
    );
  }

  try {
    const files = await fetchRepoFiles(repoUrl);
    const chunks = chunkFiles(files);

    const avgChars = chunks.length
      ? Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length)
      : 0;

    return NextResponse.json({
      files: files.length,
      chunks: chunks.length,
      averageChunkChars: avgChars,
      preview: chunks.slice(0, 3).map((c) => ({
        id: c.id,
        language: c.language,
        lines: `${c.startLine}-${c.endLine}`,
        content: c.content,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
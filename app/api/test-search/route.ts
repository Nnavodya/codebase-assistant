import { NextResponse } from "next/server";
import { getOrBuildIndex, searchIndex } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const repoUrl = params.get("repo");
  const question = params.get("q") ?? "where is the database connection";
  const rebuild = params.get("rebuild") === "1";

  if (!repoUrl) {
    return NextResponse.json(
      { error: "Add ?repo=<github url>&q=<your question> to the address" },
      { status: 400 }
    );
  }

  try {
    const start = Date.now();

    const { index, fromCache } = await getOrBuildIndex(repoUrl, rebuild);
    const top = await searchIndex(index, question, 5);

    return NextResponse.json({
      question,
      files: index.fileCount,
      chunks: index.chunks.length,
      fromCache,
      seconds: (Date.now() - start) / 1000,
      results: top.map(({ chunk, score }) => ({
        id: chunk.id,
        score: Number(score.toFixed(3)),
        preview: chunk.content.slice(0, 300),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
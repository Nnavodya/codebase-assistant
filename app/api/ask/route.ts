import { NextResponse } from "next/server";
import { getOrBuildIndex, searchIndex } from "@/lib/vectorStore";
import { askLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const repoUrl: string | undefined = body?.repo?.trim();
  const question: string | undefined = body?.question?.trim();

  if (!repoUrl || !question) {
    return NextResponse.json(
      { error: "Both 'repo' and 'question' are required." },
      { status: 400 }
    );
  }

  try {
    const start = Date.now();

    // 1. Get the saved index (or build it the first time)
    const { index, fromCache } = await getOrBuildIndex(repoUrl);

    // 2. Find the 6 most relevant code chunks
    const hits = await searchIndex(index, question, 6);

    // 3. Ask the LLM to answer using those chunks
    const answer = await askLLM(question, hits);

    return NextResponse.json({
      answer,
      fromCache,
      seconds: (Date.now() - start) / 1000,
      chunks: index.chunks.length,
      files: index.fileCount,
      sources: hits.map(({ chunk, score }) => ({
        id: chunk.id,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        score: Number(score.toFixed(3)),
        url: `https://github.com/${index.owner}/${index.repo}/blob/HEAD/${chunk.filePath}#L${chunk.startLine}-L${chunk.endLine}`,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
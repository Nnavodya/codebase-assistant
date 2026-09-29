import { NextResponse } from "next/server";
import { getOrBuildIndex } from "@/lib/vectorStore";
import { generateReadme } from "@/lib/docs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const repoUrl: string | undefined = body?.repo?.trim();

  if (!repoUrl) {
    return NextResponse.json({ error: "'repo' is required." }, { status: 400 });
  }

  try {
    const start = Date.now();
    const { index } = await getOrBuildIndex(repoUrl);
    const markdown = await generateReadme(index);

    return NextResponse.json({
      markdown,
      repoName: index.repo,
      seconds: (Date.now() - start) / 1000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
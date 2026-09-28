import { NextResponse } from "next/server";
import { fetchRepoFiles } from "@/lib/github";

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
    return NextResponse.json({
      count: files.length,
      paths: files.map((f) => f.path),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
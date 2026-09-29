import type { SearchHit } from "./vectorStore";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Models are tried in this order. If one is not available (404), the next one is used.
// You can put your own first choice in .env.local, for example: GROQ_MODEL=openai/gpt-oss-20b
const MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
].filter((m): m is string => Boolean(m));

type Message = { role: "system" | "user"; content: string };

// Sends messages to Groq and tries the next model if one is not available
export async function callGroq(messages: Message[], maxTokens: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to .env.local and restart the dev server.");
  }

  const triedModels: string[] = [];

  for (const model of MODELS) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens, // some models use part of this for thinking, so keep it high
        messages,
      }),
    });

    // Model not available for this account: try the next one
    if (res.status === 404) {
      triedModels.push(model);
      continue;
    }

    if (res.status === 429) {
      throw new Error("Groq rate limit reached. Please wait a minute and try again.");
    }
    if (res.status === 401) {
      throw new Error("Groq API key is invalid. Check GROQ_API_KEY in .env.local.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error ${res.status} (model ${model}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const answer: string = data.choices?.[0]?.message?.content ?? "";
    if (!answer.trim()) {
      throw new Error(`Model ${model} returned an empty answer. Please try again.`);
    }
    console.log(`Answered with Groq model: ${model}`);
    return answer;
  }

  throw new Error(
    `None of these Groq models are available for your account: ${triedModels.join(", ")}. ` +
      `Open console.groq.com/docs/models, pick a model you can use, and set GROQ_MODEL=<model name> in .env.local.`
  );
}

// ---------- Question answering (RAG) ----------

const QA_SYSTEM_PROMPT = `You are an expert code assistant that helps developers understand a GitHub repository.

Rules:
- Answer ONLY using the code snippets provided in the context.
- Always mention the file path and line range (for example: backend/middleware/auth.js lines 1-38) for the code you refer to.
- If the answer is not in the provided snippets, say clearly that you could not find it. Do not guess or invent files, functions, or code.
- Keep the answer clear and short. Use simple English.
- Use markdown code blocks only for small code excerpts.`;

// Turn the search results into text that the LLM can read
function buildContext(hits: SearchHit[]): string {
  return hits
    .map(({ chunk }) => {
      return `### File: ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine})\n\`\`\`${chunk.language}\n${chunk.content}\n\`\`\``;
    })
    .join("\n\n");
}

export async function askLLM(question: string, hits: SearchHit[]): Promise<string> {
  const userMessage = `Code context from the repository:\n\n${buildContext(hits)}\n\n---\nQuestion: ${question}`;

  return callGroq(
    [
      { role: "system", content: QA_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    1500
  );
}

// ---------- Explain one file ----------

const EXPLAIN_SYSTEM_PROMPT = `You explain one source code file to a student developer.

Use exactly this structure, with short markdown headings:
## Purpose
1-2 sentences about what this file is for.
## Main parts
A list of the important functions, classes, components or config blocks. For each one, say what it does and give its line range (the code has line numbers at the start of each line).
## How it connects
What this file imports, what it exports, and which other parts of a project probably use it. Only mention what you can see in the code.
## Things to notice
Only if something is clearly important (security, error handling, environment variables). Skip this section if there is nothing.

Rules:
- Use simple English and keep it short.
- Do not invent code or files that are not in the given file.
- If the file was cut because it was too long, say so at the end.`;

export async function explainFile(
  filePath: string,
  code: string,
  truncated: boolean
): Promise<string> {
  // Add line numbers so the LLM can mention line ranges
  const numbered = code
    .split("\n")
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");

  const userMessage =
    `File path: ${filePath}\n` +
    (truncated ? "Note: this file is long, so only the first part is shown.\n" : "") +
    `\n\`\`\`\n${numbered}\n\`\`\`\n\nExplain this file.`;

  return callGroq(
    [
      { role: "system", content: EXPLAIN_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    2000
  );
}
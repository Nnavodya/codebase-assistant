import type { SearchHit } from "./vectorStore";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// You can change the model in .env.local with GROQ_MODEL=...
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an expert code assistant that helps developers understand a GitHub repository.

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to .env.local and restart the dev server.");
  }

  const userMessage = `Code context from the repository:\n\n${buildContext(hits)}\n\n---\nQuestion: ${question}`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Groq rate limit reached. Please wait a minute and try again.");
    }
    if (res.status === 401) {
      throw new Error("Groq API key is invalid. Check GROQ_API_KEY in .env.local.");
    }
    const text = await res.text();
    throw new Error(`Groq error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No answer was returned.";
}
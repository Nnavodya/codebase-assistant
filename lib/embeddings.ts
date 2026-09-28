import { pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";

type Extractor = (
  input: string[],
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ tolist(): number[][] }>;

// The model is loaded only once and reused (loading is slow)
let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL) as unknown as Promise<Extractor>;
  }
  return extractorPromise;
}

// Turn many texts into vectors (done in small batches to save memory)
export async function embedTexts(texts: string[], batchSize = 16): Promise<number[][]> {
  const extractor = await getExtractor();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    vectors.push(...output.tolist());
  }

  return vectors;
}

// Turn one text (for example the user's question) into a vector
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

// Vectors are normalized, so the dot product equals cosine similarity.
// Result is between -1 and 1. A higher number means a closer meaning.
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}
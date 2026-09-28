import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages must run as normal Node.js packages on the server
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
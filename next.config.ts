import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The system prompt is read from disk at request time so judges can read it
  // as prompts/system.txt in the repo. Tracing does not follow a runtime
  // readFileSync, so name the file explicitly or it is missing in production.
  outputFileTracingIncludes: {
    "/api/advise": ["./prompts/**"],
  },
};

export default nextConfig;

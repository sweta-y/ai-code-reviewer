import { ESLint } from "eslint";

const eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });

export async function runStaticAnalysis(filename, content) {
  // Only lint JS/JSX/TS/TSX files — skip everything else (README, JSON, etc.)
  if (!/\.(js|jsx|mjs|cjs)$/.test(filename)) {
    return [];
  }

  try {
    const results = await eslint.lintText(content, { filePath: filename });
    const messages = results[0]?.messages || [];

    return messages.map((m) => ({
      line: m.line,
      severity: m.severity === 2 ? "warning" : "suggestion",
      category: "static-analysis",
      message: `[ESLint: ${m.ruleId || "unknown"}] ${m.message}`,
    }));
  } catch (err) {
    console.error(`⚠️ ESLint failed on ${filename}: ${err.message}`);
    return [];
  }
}
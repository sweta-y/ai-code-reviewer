const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are an expert senior software engineer performing a code review on a GitHub pull request diff.

Review the diff for:
1. **Security issues** — injection risks, hardcoded secrets, unsafe deserialization, auth/authz bugs, unvalidated input.
2. **Code quality** — readability, naming, duplication, dead code, missing error handling.
3. **Bugs** — logic errors, off-by-one, null/undefined handling, race conditions.
4. **Performance** — obvious inefficiencies, unnecessary loops/queries, N+1 patterns.
5. **Best practices** — idiomatic usage for the language/framework used.

Rules:
- Only comment on lines that actually changed (lines starting with "+" in the diff). Never comment on unchanged context lines or removed ("-") lines.
- Be specific and actionable. Reference the exact line and explain the "why", not just the "what".
- Skip nitpicks unless nothing else is wrong. Do not invent issues to pad the review.
- If a file has no real issues, do not include it in the output.
- Severity must be one of: "critical", "warning", "suggestion".

Respond with ONLY valid JSON (no markdown fences, no preamble), matching this exact schema:
{
  "summary": "2-3 sentence overall assessment of the PR",
  "overall_risk": "low" | "medium" | "high",
  "files": [
    {
      "filename": "path/to/file.js",
      "comments": [
        {
          "line": 42,
          "severity": "critical" | "warning" | "suggestion",
          "category": "security" | "quality" | "bug" | "performance" | "best-practice",
          "message": "Specific, actionable feedback"
        }
      ]
    }
  ]
}`;

export class Reviewer {
  constructor({ apiKey, model = "gemini-2.5-flash" }) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Add it to your .env file.");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async _callGemini(systemPrompt, userPrompt, maxTokens) {
    const url = `${GEMINI_API_URL}/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.2,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    return text.trim();
  }

  /**
   * Reviews a single file's diff patch.
   * Returns { filename, comments: [...] } or null if no patch/no issues.
   */
  async reviewFile({ filename, patch, prTitle, prBody }) {
    if (!patch) return null; // binary files, or GitHub omitted the patch (too large)

    const userPrompt = `PR Title: ${prTitle || "(no title)"}
PR Description: ${prBody || "(no description)"}

File: ${filename}

Diff:
\`\`\`diff
${patch}
\`\`\`

Review only this file's diff and respond with the JSON schema described in your instructions, but scoped to just this one file (files array should have 0 or 1 entries).`;

    const text = await this._callGemini(SYSTEM_PROMPT, userPrompt, 4000);
    return this._safeParse(text, filename);
  }

  /**
   * Generates a high-level PR summary from all per-file results.
   */
  async summarize({ prTitle, prBody, fileResults }) {
    const issueCount = fileResults.reduce((sum, f) => sum + (f?.comments?.length || 0), 0);
    const criticalCount = fileResults.reduce(
      (sum, f) => sum + (f?.comments?.filter((c) => c.severity === "critical").length || 0),
      0
    );

    const userPrompt = `PR Title: ${prTitle}
PR Description: ${prBody || "(no description)"}

Total issues found across all files: ${issueCount} (${criticalCount} critical)

Files reviewed:
${fileResults.map((f) => `- ${f.filename}: ${f.comments.length} issue(s)`).join("\n")}

Write a concise 2-4 sentence executive summary of this PR's overall code quality and risk level, and state overall_risk as "low", "medium", or "high". Respond with ONLY valid JSON: {"summary": "...", "overall_risk": "low|medium|high"}`;

    try {
      const text = await this._callGemini(null, userPrompt, 300);
      return JSON.parse(this._stripFences(text));
    } catch {
      return { summary: "Review complete.", overall_risk: issueCount > 0 ? "medium" : "low" };
    }
  }

  _stripFences(text) {
    return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  }

_safeParse(text, filename) {
    try {
      const parsed = JSON.parse(this._stripFences(text));
      const file = parsed.files?.[0];
      if (!file || !file.comments?.length) return null;
      return { filename, comments: file.comments };
    } catch (err) {
      console.error(`⚠️  Skipped ${filename} (response too long or malformed — this is normal for very large files)`);
      return null;
    }
  }
}
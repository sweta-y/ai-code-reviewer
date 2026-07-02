\# 🤖 AI Code Reviewer



An AI-powered CLI tool that automatically reviews GitHub pull requests — flagging security issues, bugs, code quality problems, and performance concerns using Google's Gemini AI.



\## ✨ Features



\- 🔍 \*\*Automated PR Review\*\* — Fetches any GitHub PR diff and reviews it file-by-file

\- 🛡️ \*\*Security Analysis\*\* — Catches injection risks, hardcoded secrets, unsafe deserialization, auth bugs

\- 🐛 \*\*Bug Detection\*\* — Logic errors, null/undefined handling, race conditions

\- ⚡ \*\*Performance Checks\*\* — Inefficient loops, N+1 query patterns

\- 📝 \*\*Best Practice Suggestions\*\* — Idiomatic code recommendations

\- 💬 \*\*GitHub Integration\*\* — Posts review summaries and inline comments directly on the PR

\- 🎯 \*\*Severity Levels\*\* — Issues categorized as critical, warning, or suggestion

\- ⏱️ \*\*Rate-Limit Aware\*\* — Built-in throttling to stay within free-tier API limits



\## 🛠️ Tech Stack



\- \*\*Node.js\*\* — Runtime

\- \*\*Google Gemini API\*\* (`gemini-2.5-flash`) — AI code analysis

\- \*\*GitHub REST API\*\* (via Octokit) — Fetching PR data \& posting comments

\- \*\*Commander.js\*\* — CLI argument parsing

\- \*\*Chalk\*\* — Terminal output styling



\## 📸 Screenshots



<!-- Add screenshots here -->

<!-- !\[Terminal Output](screenshots/terminal-output.png) -->

<!-- !\[Posted PR Comment](screenshots/pr-comment.png) -->



\## 🚀 Getting Started



\### Prerequisites



\- \[Node.js](https://nodejs.org/) v18 or higher

\- A free \[Google Gemini API key](https://aistudio.google.com/apikey)

\- A \[GitHub Personal Access Token](https://github.com/settings/tokens) (scope: `public\_repo` or `repo`)



\### Installation



```bash

git clone https://github.com/sweta-y/ai-code-reviewer.git

cd ai-code-reviewer

npm install

```



\### Configuration



Copy `.env.example` to `.env` and add your keys:



```bash

cp .env.example .env

```



```env

GEMINI\_API\_KEY=your\_gemini\_key\_here

GITHUB\_TOKEN=your\_github\_token\_here

```



\### Usage



\*\*Dry run\*\* (prints review to terminal only):



```bash

node index.js https://github.com/owner/repo/pull/123

```



\*\*Post review as a comment on the PR:\*\*



```bash

node index.js https://github.com/owner/repo/pull/123 --post

```



\*\*Post inline comments too\*\* (requires `--post`):



```bash

node index.js https://github.com/owner/repo/pull/123 --post --inline

```



\*\*Use a different Gemini model:\*\*



```bash

node index.js https://github.com/owner/repo/pull/123 -m gemini-2.5-pro

```



\## 📋 Example Output



```

AI Code Review: Add user authentication middleware

by contributor • feature/auth → main

Overall Risk: MEDIUM

Summary: This PR adds JWT-based auth middleware. Generally solid, but

a few security and error-handling improvements are recommended.

Found 3 issue(s) across 2 file(s):

📄 src/middleware/auth.js

🔴 L14 \[security] JWT secret is read without a fallback check —

will throw an unclear error if the env var is missing.

🟡 L22 \[bug] Token expiry isn't validated before decoding payload.



```


**## ⚙️ How It Works**



**1. Fetches the PR's changed files and diff via the GitHub API**

**2. Sends each file's diff to Gemini with a structured review prompt**

**3. Parses the AI's response into categorized, line-level comments**

**4. Generates an overall risk assessment and summary**

**5. Optionally posts the review back to GitHub as PR comments**



**## 🗺️ Roadmap**



**- \[ ] GitHub webhook integration for automatic reviews on PR open/update**

**- \[ ] Support for multiple AI providers (Claude, GPT-4)**

**- \[ ] Configurable review rules per repository**

**- \[ ] GitHub Action for CI/CD integration**



**## 📄 License**



**MIT**



**## 👤 Author**



**\*\*Sweta Yadav\*\***

**\[GitHub](https://github.com/sweta-y)**
<!-- test automation -->


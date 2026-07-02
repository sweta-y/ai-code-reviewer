#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import chalk from "chalk";
import { GitHubClient, parsePrUrl } from "./github.js";
import { Reviewer } from "./reviewer.js";
import { printReview, buildSummaryMarkdown, buildInlineCommentMarkdown } from "./formatter.js";

const program = new Command();

program
  .name("ai-review")
  .description("AI-powered code reviewer for GitHub pull requests, using Gemini")
  .argument("<pr-url>", "GitHub PR URL, e.g. https://github.com/owner/repo/pull/123")
  .option("--post", "post the review as comments on the PR (default: print only)")
  .option("--inline", "post individual inline comments too (requires --post)")
  .option("-m, --model <model>", "Gemini model to use", process.env.GEMINI_MODEL || "gemini-2.5-flash")
  .action(main);

program.parse();

async function main(prUrl, options) {
  try {
    const target = parsePrUrl(prUrl);
    const github = new GitHubClient(process.env.GITHUB_TOKEN);
    const reviewer = new Reviewer({ apiKey: process.env.GEMINI_API_KEY, model: options.model });

    console.log(chalk.dim(`Fetching PR #${target.pull_number} from ${target.owner}/${target.repo}...`));

    const [prInfo, files] = await Promise.all([
      github.getPrInfo(target),
      github.getPrFiles(target),
    ]);

    console.log(chalk.dim(`Reviewing ${files.length} changed file(s) with ${options.model}...`));

    const results = [];
for (const f of files) {
  const result = await reviewer.reviewFile({
    filename: f.filename,
    patch: f.patch,
    prTitle: prInfo.title,
    prBody: prInfo.body,
  });
  results.push(result);
  await new Promise((resolve) => setTimeout(resolve, 13000)); // 13 sec gap, free tier ke 5 req/min limit ke andar rehne ke liye
}

    const fileResults = results.filter(Boolean); // drop nulls (no issues / no patch)

    const summary = await reviewer.summarize({
      prTitle: prInfo.title,
      prBody: prInfo.body,
      fileResults,
    });

    printReview({ prInfo, summary, fileResults });

    if (options.post) {
      console.log(chalk.dim("\nPosting review to GitHub..."));
      const body = buildSummaryMarkdown({ summary, fileResults });
      await github.postComment(target, body);
      console.log(chalk.green("✅ Summary comment posted."));

      if (options.inline && fileResults.length > 0) {
        const commitId = await github.getHeadSha(target);
        let posted = 0;
        for (const file of fileResults) {
          for (const comment of file.comments) {
            try {
              await github.postReviewComment(target, {
                path: file.filename,
                line: comment.line,
                body: buildInlineCommentMarkdown(comment),
                commit_id: commitId,
              });
              posted++;
            } catch (err) {
              // Line might not be part of the diff's addressable range - skip gracefully
              console.error(chalk.dim(`  (skipped inline comment on ${file.filename}:${comment.line} — ${err.message})`));
            }
          }
        }
        console.log(chalk.green(`✅ ${posted} inline comment(s) posted.`));
      }
    } else {
      console.log(chalk.dim("\n(Dry run — use --post to publish this review to the PR)"));
    }
  } catch (err) {
    console.error(chalk.red(`\n❌ Error: ${err.message}`));
    process.exit(1);
  }
}
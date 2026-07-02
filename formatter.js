import chalk from "chalk";

const SEVERITY_STYLE = {
  critical: { icon: "🔴", color: chalk.red.bold },
  warning: { icon: "🟡", color: chalk.yellow },
  suggestion: { icon: "🔵", color: chalk.blue },
};

const RISK_COLOR = {
  low: chalk.green.bold,
  medium: chalk.yellow.bold,
  high: chalk.red.bold,
};

export function printReview({ prInfo, summary, fileResults }) {
  console.log("\n" + chalk.bold.underline(`AI Code Review: ${prInfo.title}`));
  console.log(chalk.dim(`by ${prInfo.author} • ${prInfo.headBranch} → ${prInfo.baseBranch}`));
  console.log();

  const riskColor = RISK_COLOR[summary.overall_risk] || chalk.white;
  console.log(chalk.bold("Overall Risk: ") + riskColor(summary.overall_risk.toUpperCase()));
  console.log(chalk.bold("Summary: ") + summary.summary);
  console.log();

  const totalIssues = fileResults.reduce((sum, f) => sum + f.comments.length, 0);

  if (totalIssues === 0) {
    console.log(chalk.green("✅ No issues found. Looks good!"));
    return;
  }

  console.log(chalk.bold(`Found ${totalIssues} issue(s) across ${fileResults.length} file(s):\n`));

  for (const file of fileResults) {
    console.log(chalk.bold.cyan(`📄 ${file.filename}`));
    for (const comment of file.comments) {
      const style = SEVERITY_STYLE[comment.severity] || SEVERITY_STYLE.suggestion;
      console.log(
        `  ${style.icon} ${chalk.dim(`L${comment.line}`)} ${style.color(`[${comment.category}]`)} ${comment.message}`
      );
    }
    console.log();
  }
}

/** Builds the markdown body used for the GitHub summary comment */
export function buildSummaryMarkdown({ summary, fileResults }) {
  const totalIssues = fileResults.reduce((sum, f) => sum + f.comments.length, 0);
  const riskEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[summary.overall_risk] || "⚪";

  let md = `## 🤖 AI Code Review\n\n`;
  md += `**Overall Risk:** ${riskEmoji} ${summary.overall_risk.toUpperCase()}\n\n`;
  md += `${summary.summary}\n\n`;

  if (totalIssues === 0) {
    md += `✅ No issues found. Looks good!\n`;
    return md;
  }

  md += `Found **${totalIssues}** issue(s) across **${fileResults.length}** file(s). Details posted as inline comments.\n\n`;
  md += `| File | Critical | Warning | Suggestion |\n|---|---|---|---|\n`;
  for (const file of fileResults) {
    const counts = { critical: 0, warning: 0, suggestion: 0 };
    for (const c of file.comments) counts[c.severity] = (counts[c.severity] || 0) + 1;
    md += `| \`${file.filename}\` | ${counts.critical} | ${counts.warning} | ${counts.suggestion} |\n`;
  }

  return md;
}

/** Builds the markdown body for a single inline review comment */
export function buildInlineCommentMarkdown(comment) {
  const style = SEVERITY_STYLE[comment.severity] || SEVERITY_STYLE.suggestion;
  return `${style.icon} **[${comment.category}]** ${comment.message}\n\n*— AI Code Reviewer (${comment.severity})*`;
}

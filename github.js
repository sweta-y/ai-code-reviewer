import { Octokit } from "@octokit/rest";

/**
 * Parses a GitHub PR URL into owner, repo, and PR number.
 * Example: https://github.com/owner/repo/pull/123
 */
export function parsePrUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(
      `Invalid GitHub PR URL: ${url}\nExpected format: https://github.com/owner/repo/pull/123`
    );
  }
  const [, owner, repo, number] = match;
  return { owner, repo, pull_number: parseInt(number, 10) };
}

export class GitHubClient {
  constructor(token) {
    if (!token) {
      throw new Error("GITHUB_TOKEN is missing. Add it to your .env file.");
    }
    this.octokit = new Octokit({ auth: token });
  }

  /** Fetch PR metadata (title, description, author, etc.) */
  async getPrInfo({ owner, repo, pull_number }) {
    const { data } = await this.octokit.pulls.get({ owner, repo, pull_number });
    return {
      title: data.title,
      body: data.body,
      author: data.user.login,
      baseBranch: data.base.ref,
      headBranch: data.head.ref,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
    };
  }

  /** Fetch the list of changed files with their diffs (patches) */
  async getPrFiles({ owner, repo, pull_number }) {
    const files = await this.octokit.paginate(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
      per_page: 100,
    });
    return files.map((f) => ({
      filename: f.filename,
      status: f.status, // added, modified, removed, renamed
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || null, // undefined for binary files or very large diffs
    }));
  }

  /** Post a general (summary) comment on the PR */
  async postComment({ owner, repo, pull_number }, body) {
    return this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body,
    });
  }

  /** Post an inline comment on a specific file + line of the PR diff */
  async postReviewComment({ owner, repo, pull_number }, { path, line, body, commit_id }) {
    return this.octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number,
      commit_id,
      path,
      line,
      body,
      side: "RIGHT",
    });
  }

  /** Get the latest commit SHA on the PR head (needed for inline comments) */
  async getHeadSha({ owner, repo, pull_number }) {
    const { data } = await this.octokit.pulls.get({ owner, repo, pull_number });
    return data.head.sha;
  }

  /** Fetch the full content of a file at the PR's head commit */
  async getFileContent({ owner, repo }, path, ref) {
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref });
      if (data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      return null;
    } catch (err) {
      console.error(`⚠️ Could not fetch content for ${path}: ${err.message}`);
      return null;
    }
  }
}
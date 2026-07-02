import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function saveReview({ repoName, prNumber, prTitle, overallRisk, fileResults }) {
  const client = await pool.connect();
  try {
    const reviewResult = await client.query(
      `INSERT INTO reviews (repo_name, pr_number, pr_title, overall_risk, total_issues)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [repoName, prNumber, prTitle, overallRisk, fileResults.reduce((sum, f) => sum + (f.comments?.length || 0), 0)]
    );

    const reviewId = reviewResult.rows[0].id;

    for (const file of fileResults) {
      for (const c of file.comments || []) {
        await client.query(
          `INSERT INTO review_comments (review_id, filename, line, severity, category, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [reviewId, file.filename, c.line, c.severity, c.category, c.message]
        );
      }
    }

    console.log(`✅ Review saved to database (review id: ${reviewId})`);
  } catch (err) {
    console.error("❌ Failed to save review to database:", err.message);
  } finally {
    client.release();
  }
}
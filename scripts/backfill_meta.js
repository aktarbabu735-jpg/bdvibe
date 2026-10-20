const { db } = require('../database');
const { transformNewsItem } = require('../newsTransformer');

console.log('[Migration] Starting backfill of headlines, hook descriptions, and meta tags...');

const articles = db.prepare('SELECT id, title, description, content, category, source FROM articles').all();
console.log(`[Migration] Found ${articles.length} articles to transform.`);

const updateStmt = db.prepare(`
  UPDATE articles
  SET title = ?,
      description = ?,
      meta_title = ?,
      meta_description = ?
  WHERE id = ?
`);

let updated = 0;
for (const art of articles) {
  const transformed = transformNewsItem({
    title: art.title,
    description: art.description,
    content: art.content,
    source: art.source
  }, art.category, art.source);

  updateStmt.run(
    transformed.title,
    transformed.description,
    transformed.meta_title,
    transformed.meta_description,
    art.id
  );
  updated++;
}

console.log(`[Migration] Successfully updated ${updated} articles!`);

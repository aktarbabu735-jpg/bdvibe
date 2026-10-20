const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'news.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency & speed
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guid TEXT UNIQUE,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    content TEXT,
    image_url TEXT,
    pub_date TEXT,
    timestamp INTEGER NOT NULL,
    is_breaking INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
  CREATE INDEX IF NOT EXISTS idx_articles_timestamp ON articles(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
  CREATE INDEX IF NOT EXISTS idx_articles_breaking ON articles(is_breaking);

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT UNIQUE,
    channel TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    thumbnail TEXT,
    embed_url TEXT NOT NULL,
    duration TEXT DEFAULT 'ভিডিও',
    timestamp INTEGER NOT NULL,
    views TEXT DEFAULT '১০০K+'
  );

  CREATE INDEX IF NOT EXISTS idx_videos_timestamp ON videos(timestamp DESC);

  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category_default TEXT DEFAULT 'national',
    logo_color TEXT DEFAULT '#dc2626',
    active INTEGER DEFAULT 1,
    last_fetched INTEGER DEFAULT 0,
    total_articles INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot TEXT NOT NULL, /* 'billboard', 'sidebar', 'infeed' */
    title TEXT NOT NULL,
    sponsor TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    target_url TEXT,
    active INTEGER DEFAULT 1,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0
  );
`);

// Insert default Sources if empty or update them
const countSources = db.prepare('SELECT COUNT(*) as count FROM sources').get();
if (countSources.count < 8) {
  const insertSource = db.prepare(`
    INSERT OR REPLACE INTO sources (id, name, url, category_default, logo_color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const initialSources = [
    ['prothomalo', 'প্রথম আলো', 'https://www.prothomalo.com/feed', 'national', '#e11d48'],
    ['samakal', 'সমকাল', 'https://samakal.com/feed.xml', 'national', '#0284c7'],
    ['jagonews24', 'জাগোনিউজ ২৪', 'https://www.jagonews24.com/rss/rss.xml', 'national', '#ea580c'],
    ['deshrupantor', 'দেশ রূপান্তর', 'https://www.deshrupantor.com/feed/', 'national', '#8b5cf6'],
    ['channelionline', 'চ্যানেল আই অনলাইন', 'https://www.channelionline.com/feed/', 'national', '#10b981'],
    ['ntvbd', 'এনটিভি অনলাইন', 'https://www.ntvbd.com/rss.xml', 'national', '#d97706'],
    ['bbcbangla', 'বিবিসি বাংলা', 'https://feeds.bbci.co.uk/bengali/rss.xml', 'national', '#b91c1c'],
    ['dailystar', 'দ্য ডেইলি স্টার', 'https://www.thedailystar.net/rss.xml', 'national', '#0f766e']
  ];

  for (const s of initialSources) {
    insertSource.run(...s);
  }
}

// Insert default Demo Ads if empty
const countAds = db.prepare('SELECT COUNT(*) as count FROM ads').get();
if (countAds.count === 0) {
  const insertAd = db.prepare(`
    INSERT INTO ads (slot, title, sponsor, description, image_url, target_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const demoAds = [
    [
      'billboard',
      'ডিজিটাল বাংলাদেশ ২০২৬ সামিট — আজই রেজিষ্ট্রেশন করুন',
      'টেক হাব বাংলাদেশ',
      'দেশের সর্ববৃহৎ প্রযুক্তি ও উদ্ভাবনী মেলা। শীর্ষ উদ্যোক্তা ও প্রযুক্তিবিদদের মিলনমেলা।',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      '#'
    ],
    [
      'sidebar',
      'বিকাশ ইনস্ট্যান্ট পেমেন্টে ২০% পর্যন্ত ক্যাশব্যাক!',
      'bKash Ltd',
      'যেকোনো অনলাইন কেনাকাটায় বিকাশ পেমেন্টে উপভোগ করুন বিশেষ ছাড় ও বোনাস রিওয়ার্ড।',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80',
      '#'
    ],
    [
      'infeed',
      'ক্লাউড হোস্টিং ও ডোমেইন প্যাকেজে মেগা ছাড় — ৫০% ডিসকাউন্ট',
      'বিডি হোস্ট প্রো',
      'আপনার অনলাইন প্ল্যাটফর্মের জন্য দ্রুতগতির ও নিরাপদ এসএসডি সার্ভার। ফ্রি এসএসএল সার্টিফিকেট।',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
      '#'
    ]
  ];

  for (const a of demoAds) {
    insertAd.run(...a);
  }
}

module.exports = {
  db,
  saveArticle(article) {
    const stmt = db.prepare(`
      INSERT INTO articles (
        guid, title, link, source, source_id, category, description,
        content, image_url, pub_date, timestamp, is_breaking
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guid) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        image_url = COALESCE(excluded.image_url, articles.image_url),
        category = excluded.category
    `);

    try {
      stmt.run(
        article.guid,
        article.title,
        article.link,
        article.source,
        article.source_id,
        article.category,
        article.description || '',
        article.content || '',
        article.image_url || null,
        article.pub_date || new Date().toISOString(),
        article.timestamp || Date.now(),
        article.is_breaking ? 1 : 0
      );
      return true;
    } catch (err) {
      console.error('Error inserting article:', err.message);
      return false;
    }
  },

  saveVideo(video) {
    const stmt = db.prepare(`
      INSERT INTO videos (
        video_id, channel, channel_id, title, link, thumbnail, embed_url, duration, timestamp, views
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(video_id) DO UPDATE SET
        title = excluded.title,
        thumbnail = excluded.thumbnail,
        embed_url = excluded.embed_url
    `);

    try {
      stmt.run(
        video.video_id,
        video.channel,
        video.channel_id,
        video.title,
        video.link,
        video.thumbnail || '',
        video.embed_url,
        video.duration || 'ভিডিও',
        video.timestamp || Date.now(),
        video.views || '১০০K+'
      );
      return true;
    } catch (err) {
      console.error('Error inserting video:', err.message);
      return false;
    }
  },

  getVideos(limit = 12) {
    return db.prepare('SELECT * FROM videos ORDER BY timestamp DESC LIMIT ?').all(Number(limit));
  },

  getArticleById(id) {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(Number(id));
  },

  updateArticleContent(id, content) {
    try {
      db.prepare('UPDATE articles SET content = ? WHERE id = ?').run(content, Number(id));
      return true;
    } catch (e) {
      return false;
    }
  },

  getArticles({ category, source_id, search, limit = 30, offset = 0, is_breaking = null }) {
    return this.getArticlesWithTotal({ category, source_id, search, limit, offset, is_breaking }).articles;
  },

  getArticlesWithTotal({ category, source_id, search, limit = 24, offset = 0, is_breaking = null }) {
    let whereClause = ' WHERE 1=1';
    const params = [];

    if (category && category !== 'all' && category !== 'প্রচ্ছদ') {
      whereClause += ' AND category = ?';
      params.push(category);
      if (category === 'live') {
        whereClause += " AND (guid LIKE 'tv-%' OR link LIKE '%watch?v=%' OR link LIKE '%youtu.be%')";
      }
    }

    if (source_id && source_id !== 'all') {
      whereClause += ' AND (source_id = ? OR source = ?)';
      params.push(source_id, source_id);
    }

    if (is_breaking !== null) {
      whereClause += ' AND is_breaking = ?';
      params.push(is_breaking ? 1 : 0);
    }

    if (search && search.trim()) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR content LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    // Total count for pagination & statistics
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM articles ${whereClause}`);
    const total = countStmt.get(...params).count;

    // Paginated articles
    const query = `SELECT * FROM articles ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const paginatedParams = [...params, Number(limit), Number(offset)];
    const articles = db.prepare(query).all(...paginatedParams);

    return { articles, total };
  },

  searchSuggestions(query, limit = 6) {
    if (!query || !query.trim()) return [];
    const s = `%${query.trim()}%`;
    return db.prepare(`
      SELECT id, title, source, category, image_url, timestamp 
      FROM articles 
      WHERE title LIKE ? OR description LIKE ? 
      ORDER BY timestamp DESC LIMIT ?
    `).all(s, s, Number(limit));
  },

  getHeroArticles() {
    // 1. Lead story: most recent article with image
    const lead = db.prepare(`
      SELECT * FROM articles 
      WHERE image_url IS NOT NULL AND image_url != ''
      ORDER BY timestamp DESC LIMIT 1
    `).get() || db.prepare('SELECT * FROM articles ORDER BY timestamp DESC LIMIT 1').get();

    // 2. Sub-leads (4 articles) - STRICT SOURCE DIVERSITY
    const recentCandidates = db.prepare(`
      SELECT * FROM articles 
      WHERE id != ? AND image_url IS NOT NULL AND image_url != ''
      ORDER BY timestamp DESC LIMIT 60
    `).all(lead ? lead.id : 0);

    const subLeads = [];
    const usedSources = new Set();
    if (lead && lead.source) usedSources.add(lead.source);

    // Pass 1: Select articles from completely unique sources
    for (const item of recentCandidates) {
      if (!usedSources.has(item.source)) {
        subLeads.push(item);
        usedSources.add(item.source);
        if (subLeads.length >= 4) break;
      }
    }

    // Pass 2: Fill remaining slots if fewer than 4 distinct sources found
    if (subLeads.length < 4) {
      for (const item of recentCandidates) {
        if (!subLeads.some(s => s.id === item.id)) {
          subLeads.push(item);
          if (subLeads.length >= 4) break;
        }
      }
    }

    // 3. Trending / Top Stories (6 articles) - DIVERSE SOURCES
    const trendingPool = db.prepare(`
      SELECT * FROM articles 
      ORDER BY timestamp DESC LIMIT 60
    `).all();

    const trending = [];
    const usedTrendingSources = new Set();
    for (const item of trendingPool) {
      if (!usedTrendingSources.has(item.source)) {
        trending.push(item);
        usedTrendingSources.add(item.source);
        if (trending.length >= 6) break;
      }
    }
    if (trending.length < 6) {
      for (const item of trendingPool) {
        if (!trending.some(t => t.id === item.id)) {
          trending.push(item);
          if (trending.length >= 6) break;
        }
      }
    }

    return { lead, subLeads, trending };
  },

  getCategoriesSummary() {
    const categories = [
      { key: 'live', label: 'লাইভ ভিডিও ও টিভি' },
      { key: 'politics', label: 'রাজনীতি ও সমকালীন' },
      { key: 'economy', label: 'অর্থনীতি ও বাণিজ্য' },
      { key: 'tech', label: 'প্রযুক্তি ও উদ্ভাবন' },
      { key: 'lifestyle', label: 'লাইফস্টাইল ও লিভিং' },
      { key: 'education', label: 'শিক্ষা ও ক্যাম্পাস' },
      { key: 'agriculture', label: 'কৃষি ও গ্রামীণ অর্থনীতি' },
      { key: 'career', label: 'ক্যারিয়ার ও কর্মসংস্থান' },
      { key: 'sports', label: 'খেলাধুলা' },
      { key: 'entertainment', label: 'বিনোদন ও সংস্কৃতি' },
      { key: 'health', label: 'স্বাস্থ্য ও সুস্থতা' },
      { key: 'probash', label: 'প্রবাস ও রেমিট্যান্স' },
      { key: 'national', label: 'জাতীয় ও আন্তর্জাতিক' }
    ];

    const result = {};
    const poolStmt = db.prepare(`
      SELECT * FROM articles 
      WHERE category = ? 
      ORDER BY timestamp DESC LIMIT 35
    `);

    for (const cat of categories) {
      const pool = poolStmt.all(cat.key);
      const selected = [];
      const usedSources = new Set();

      // Pass 1: Select articles from completely unique sources
      for (const item of pool) {
        if (!usedSources.has(item.source)) {
          selected.push(item);
          usedSources.add(item.source);
          if (selected.length >= 4) break;
        }
      }

      // Pass 2: Fill remaining up to 4 if needed
      if (selected.length < 4) {
        for (const item of pool) {
          if (!selected.some(s => s.id === item.id)) {
            selected.push(item);
            if (selected.length >= 4) break;
          }
        }
      }

      result[cat.key] = {
        label: cat.label,
        articles: selected
      };
    }

    return result;
  },

  getBreakingNews(limit = 12) {
    const stmt = db.prepare(`
      SELECT id, title, link, source, timestamp, category 
      FROM articles 
      ORDER BY timestamp DESC LIMIT ?
    `);
    return stmt.all(Number(limit));
  },

  getSources() {
    return db.prepare('SELECT * FROM sources WHERE active = 1').all();
  },

  getAds(slot) {
    if (slot) {
      return db.prepare('SELECT * FROM ads WHERE active = 1 AND slot = ?').all(slot);
    }
    return db.prepare('SELECT * FROM ads WHERE active = 1').all();
  },

  incrementViews(id) {
    db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(Number(id));
  },

  getLatestTimestamp() {
    const row = db.prepare('SELECT MAX(timestamp) as maxT FROM articles').get();
    return row ? row.maxT : 0;
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const catCounts = db.prepare('SELECT category, COUNT(*) as count FROM articles GROUP BY category').all();
    const sourceCounts = db.prepare('SELECT source, COUNT(*) as count FROM articles GROUP BY source').all();
    const latest = db.prepare('SELECT MAX(timestamp) as lastUpdate FROM articles').get().lastUpdate;
    const totalVideos = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;

    return {
      totalArticles: total,
      totalVideos: totalVideos,
      categoryCounts: catCounts,
      sourceCounts: sourceCounts,
      lastUpdate: latest ? new Date(latest).toISOString() : null
    };
  }
};

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { updateFeeds, initCron } = require('./feedManager');
const { extractFullArticle } = require('./articleExtractor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Curated Bangladeshi News Videos & Bulletins
const CURATED_VIDEOS = [
  {
    id: 'vid-1',
    channel: 'যমুনা টিভি (Jamuna TV)',
    title: 'যমুনা টেলিভিশন ২৪ ঘণ্টা সরাসরি সম্প্রচার | Jamuna TV Live Stream',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC1mOq72_nF_x1V9NfQxK-rg',
    youtubeId: 'live_jamuna',
    duration: 'লাইভ',
    views: '১.২ মিলিয়ন',
    category: 'লাইভ সংবাদ'
  },
  {
    id: 'vid-2',
    channel: 'সময় সংবাদ (Somoy News)',
    title: 'দেশের সাম্প্রতিক শীর্ষ খবর ও বিশেষ বুলেটিন | Somoy TV Bulletin',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/fA4uU-Hj6pU',
    youtubeId: 'somoy_bulletin',
    duration: '১৫:২০',
    views: '৮৫০ হাজার',
    category: 'বিশেষ বুলেটিন'
  },
  {
    id: 'vid-3',
    channel: 'ইন্ডিপেন্ডেন্ট টিভি (Independent TV)',
    title: 'আজকের বাংলাদেশ: রাজনীতি ও অর্থনীতির গভীর বিশ্লেষণ',
    thumbnail: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/5qap5aO4i9A',
    youtubeId: 'independent_talk',
    duration: '৪৫:১০',
    views: '৪২০ হাজার',
    category: 'টকশো ও বিশ্লেষণ'
  },
  {
    id: 'vid-4',
    channel: 'চ্যানেল ২৪ (Channel 24)',
    title: 'বিজনেস ২৪: শেয়ারবাজার, মূল্যস্ফীতি ও ডলারের সর্বশেষ বাজারদর',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dFlDRhvM4b0',
    youtubeId: 'channel24_biz',
    duration: '১২:৪৫',
    views: '৩১০ হাজার',
    category: 'বাণিজ্য'
  },
  {
    id: 'vid-5',
    channel: 'ডিবিসি নিউজ (DBC News)',
    title: 'খেলাযোগ: বিপিএল ও জাতীয় ক্রিকেট দলের সর্বশেষ আপডেট',
    thumbnail: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
    embedUrl: 'https://www.youtube-nocookie.com/embed/fA4uU-Hj6pU',
    youtubeId: 'dbc_sports',
    duration: '১০:১৮',
    views: '৫৬০ হাজার',
    category: 'খেলাধুলা'
  }
];

// Currency & Market Rates API
app.get('/api/currency', (req, res) => {
  res.json({
    base: 'BDT',
    updatedAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    rates: [
      { currency: 'USD', symbol: '$', buy: '১২১.৫০', sell: '১২২.২০', change: '+০.১০' },
      { currency: 'EUR', symbol: '€', buy: '১২৭.৮০', sell: '১২৮.৬০', change: '+০.২৫' },
      { currency: 'GBP', symbol: '£', buy: '১৫৩.৪০', sell: '১৫৪.৫০', change: '-০.১৫' },
      { currency: 'SAR', symbol: '﷼', buy: '৩২.৪০', sell: '৩২.৭০', change: '০.০০' },
      { currency: 'AED', symbol: 'د.إ', buy: '৩৩.১০', sell: '৩৩.৩৫', change: '+০.০৫' },
      { currency: 'স্বর্ণ (২২ ক্যারেট)', symbol: '🪙', buy: '১,৪৩,৭৮০ ৳/ভরি', sell: '১,৪৪,৫০০ ৳/ভরি', change: '+১,২০০' }
    ]
  });
});

// Weather API
app.get('/api/weather', (req, res) => {
  res.json({
    city: 'ঢাকা',
    temp: '২৯° সে.',
    condition: 'আংশিক মেঘলা',
    humidity: '৬৮%',
    wind: '১২ কিমি/ঘণ্টা',
    forecast: [
      { day: 'আজ', high: '৩২°', low: '২৪°', icon: '☀️' },
      { day: 'আগামীকাল', high: '৩১°', low: '২৩°', icon: '⛅' },
      { day: 'বৃহস্পতি', high: '৩০°', low: '২২°', icon: '🌧️' }
    ]
  });
});

// Articles List with Filtering & Pagination
app.get('/api/news', (req, res) => {
  try {
    const { category, source_id, search, limit = 24, offset = 0 } = req.query;
    const { articles, total } = db.getArticlesWithTotal({
      category,
      source_id,
      search,
      limit: Math.min(Number(limit) || 24, 100),
      offset: Number(offset) || 0
    });
    res.json({
      success: true,
      count: articles.length,
      total,
      hasMore: (Number(offset) + articles.length) < total,
      articles
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Article by ID (or pass through to next route if not numeric)
// Enriches with 85% to 100% full original article content directly from source
app.get('/api/news/:id', async (req, res, next) => {
  if (isNaN(req.params.id)) return next();
  try {
    const article = db.getArticleById(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

    // Check if full content (85%-100%) needs to be extracted
    const currentLen = (article.content || '').trim().length;
    const isVideoOrAudio = article.link && (article.link.includes('youtube.com') || article.link.includes('youtu.be'));

    if (currentLen < 350 && article.link && article.link.startsWith('http') && !isVideoOrAudio) {
      try {
        const fullContent = await extractFullArticle(article.link, article.source);
        if (fullContent && fullContent.length > currentLen) {
          article.content = fullContent;
          db.updateArticleContent(article.id, fullContent);
        }
      } catch (e) {
        // Continue with available description/content
      }
    }

    res.json({ success: true, article });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-Time Live Search Suggestions
app.get('/api/news/search-suggestions', (req, res) => {
  try {
    const { q = '', limit = 6 } = req.query;
    const suggestions = db.searchSuggestions(q, Number(limit));
    res.json({
      success: true,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BDVibe Hero Package
app.get('/api/news/hero', (req, res) => {
  try {
    const heroData = db.getHeroArticles();
    res.json({
      success: true,
      ...heroData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Breaking News Ticker
app.get('/api/news/breaking', (req, res) => {
  try {
    const breaking = db.getBreakingNews(12);
    res.json({
      success: true,
      breaking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Categories Summary for BDVibe Grid
app.get('/api/news/categories-summary', (req, res) => {
  try {
    const summary = db.getCategoriesSummary();
    res.json({
      success: true,
      categories: summary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic Video Content from TV YouTube Feeds & Curated Streams
app.get('/api/videos', (req, res) => {
  try {
    const dbVideos = db.getVideos(20);
    const videos = dbVideos.length > 0 ? dbVideos : CURATED_VIDEOS;
    res.json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (err) {
    res.json({ success: true, videos: CURATED_VIDEOS });
  }
});

// Real-Time Live Check (for second-by-second live updates)
app.get('/api/news/latest-check', (req, res) => {
  try {
    const since = Number(req.query.since) || 0;
    const latestTimestamp = db.getLatestTimestamp();
    const countNew = db.db.prepare('SELECT COUNT(*) as c FROM articles WHERE timestamp > ?').get(since).c;
    res.json({
      success: true,
      hasNew: countNew > 0,
      newCount: countNew,
      latestTimestamp
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sources List
app.get('/api/sources', (req, res) => {
  try {
    const sources = db.getSources();
    res.json({ success: true, sources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Advertisements
app.get('/api/ads', (req, res) => {
  try {
    const { slot } = req.query;
    const ads = db.getAds(slot);
    res.json({ success: true, ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Ad Click
app.post('/api/ads/:id/click', (req, res) => {
  try {
    db.db.prepare('UPDATE ads SET clicks = clicks + 1 WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Article Views Increment
app.post('/api/news/:id/view', (req, res) => {
  try {
    db.incrementViews(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual RSS Refresh
app.post('/api/refresh', async (req, res) => {
  try {
    const result = await updateFeeds();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to SPA for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`🚀 BD Vibe Content Aggregator is running on http://localhost:${PORT}`);
  console.log(`===================================================`);

  // Initialize auto-updating cron
  initCron();

  // Run initial feed fetch if database is fresh
  const count = db.db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
  if (count === 0) {
    console.log('[Server Startup] Database empty. Triggering initial feed ingestion...');
    updateFeeds().catch(e => console.error('[Initial Ingestion Error]', e));
  } else {
    console.log(`[Server Startup] Database currently holds ${count} articles.`);
    // Run background update quietly
    updateFeeds().catch(e => console.error('[Background Refresh Error]', e));
  }
});

const Parser = require('rss-parser');
const cron = require('node-cron');
const { saveArticle, saveVideo, db } = require('./database');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 BDVibeHub/2.0'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:group', 'mediaGroup'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
      ['yt:videoId', 'ytVideoId']
    ]
  }
});

// Category classification rules
const categoryKeywords = {
  live: [
    'লাইভ', 'সরাসরি সম্প্রচার', 'সরাসরি', 'লাইভ টিভি', 'live stream', 'livestream', 'live broadcast', 'live'
  ],
  politics: [
    'রাজনীতি', 'নির্বাচন', 'সরকার', 'বিএনপি', 'আওয়ামী', 'জামায়াত', 'উপদেষ্টা', 'সংসদ',
    'মন্ত্রণালয়', 'নির্বাচন কমিশন', 'রাজনৈতিক', 'তারেক রহমান', 'খালেদা জিয়া', 'politics', 'governance'
  ],
  economy: [
    'অর্থনীতি', 'বাণিজ্য', 'ব্যাংক', 'শেয়ারবাজার', 'মুদ্রাস্ফীতি', 'বাজেট', 'টাকা',
    'ডলার', 'রাজস্ব', 'কর', 'আমদানি', 'রপ্তানি', 'ব্যবসায়ী', 'মূল্যবৃদ্ধি', 'রেমিট্যান্স',
    'economy', 'business', 'finance', 'market', 'stock'
  ],
  tech: [
    'প্রযুক্তি', 'মোবাইল', 'স্মার্টফোন', 'এআই', 'কৃত্রিম বুদ্ধিমত্তা', 'ইন্টারনেট', 'কম্পিউটার',
    'সফটওয়্যার', 'গ্যাজেট', 'সাইবার', 'আইটি', 'অ্যাপল', 'গুগল', 'ফেসবুক', 'technology', 'tech', 'ai'
  ],
  lifestyle: [
    'লাইফস্টাইল', 'ফ্যাশন', 'রূপচর্চা', 'ভ্রমণ', 'খাবার', 'রেসিপি', 'পরামর্শ', 'সম্পর্ক',
    'সৌন্দর্য', 'সাজসজ্জা', 'ট্যুর', 'পর্যটন', 'বিয়ে', 'lifestyle', 'travel', 'fashion'
  ],
  education: [
    'শিক্ষা', 'পরীক্ষা', 'বিশ্ববিদ্যালয়', 'কলেজ', 'শিক্ষার্থী', 'এইচএসসি', 'এসএসসি',
    'ভর্তি', 'শিক্ষক', 'বিসিএস', 'প্রাথমিক', 'বোর্ড', 'স্কুল', 'উপবৃত্তি', 'education', 'exam'
  ],
  agriculture: [
    'কৃষি', 'কৃষক', 'ফসল', 'ধান', 'গম', 'শাকসবজি', 'মৎস্য', 'প্রাণিসম্পদ', 'সার',
    'বীজ', 'গাছপালা', 'ফলমূল', 'হাঁস-মুরগি', 'গরু-ছাগল', 'মাছ চাষ', 'কৃষি সংবাদ', 'agriculture', 'farming'
  ],
  career: [
    'চাকরি', 'নিয়োগ', 'কর্মসংস্থান', 'বিজ্ঞপ্তি', 'বেতন', 'ইন্টারভিউ', 'ক্যারিয়ার',
    'চাকরির খবর', 'চাকরিপ্রার্থী', 'কর্মস্থল', 'সিভি', 'jobs', 'career', 'recruitment'
  ],
  sports: [
    'খেলা', 'ক্রিকেট', 'ফুটবল', 'বিপিএল', 'আইপিএল', 'বিশ্বকাপ', 'ম্যাচ', 'রান', 'উইকেট',
    'গোল', 'মেসি', 'রোনালদো', 'সাকিব', 'তামিম', 'নাজমুল', 'সিরিজ', 'টেস্ট', 'ওয়ানডে',
    'টি-টোয়েন্টি', 'sports'
  ],
  entertainment: [
    'বিনোদন', 'সিনেমা', 'নাটক', 'গান', 'অভিনেতা', 'অভিনেত্রী', 'শাকিব খান', 'হলিউড',
    'বলিউড', 'চলচ্চিত্র', 'তারকা', 'গায়ক', 'গায়িকা', 'ওটিটি', 'মিউজিক', 'entertainment', 'cinema'
  ],
  health: [
    'স্বাস্থ্য', 'রোগ', 'হাসপাতাল', 'চিকিৎসা', 'ওষুধ', 'ডাক্তার', 'ক্যান্সার', 'ডেঙ্গু',
    'করোনা', 'হার্ট', 'পুষ্টি', 'মানসিক স্বাস্থ্য', 'অপারেশন', 'health', 'medical'
  ],
  probash: [
    'প্রবাস', 'প্রবাসী', 'মালয়েশিয়া', 'সৌদি', 'দুবাই', 'কাতার', 'ইউরোপ',
    'অভিবাসন', 'ভিসা', 'মধ্যপ্রাচ্য', 'লন্ডন', 'আমেরিকা প্রবাসী', 'probash', 'diaspora'
  ]
};

// Fallback category imagery (high-quality visual assets)
const categoryFallbackImages = {
  politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80',
  economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
  education: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
  agriculture: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80',
  career: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80',
  sports: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
  probash: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  national: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80'
};

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractImageUrl(item) {
  if (item.enclosure && item.enclosure.url && item.enclosure.url.startsWith('http')) {
    return item.enclosure.url;
  }
  if (Array.isArray(item.mediaContent) && item.mediaContent.length > 0) {
    const mc = item.mediaContent[0];
    if (mc.url) return mc.url;
    if (mc.$ && mc.$.url) return mc.$.url;
  }
  if (item.mediaGroup && item.mediaGroup['media:thumbnail'] && item.mediaGroup['media:thumbnail'][0]) {
    const t = item.mediaGroup['media:thumbnail'][0];
    if (t.url) return t.url;
    if (t.$ && t.$.url) return t.$.url;
  }
  const htmlToSearch = (item.contentEncoded || '') + ' ' + (item.content || '') + ' ' + (item.description || '');
  const match = htmlToSearch.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (match && match[1]) {
    if (!match[1].includes('1x1') && !match[1].includes('feedburner')) {
      return match[1];
    }
  }
  return null;
}

function classifyArticle(item, defaultCategory = 'national') {
  const categoriesList = Array.isArray(item.categories) ? item.categories.join(' ') : '';
  const searchCorpus = (
    (item.title || '') + ' ' +
    (item.contentSnippet || '') + ' ' +
    categoriesList + ' ' +
    (item.link || '')
  ).toLowerCase();

  // If live broadcast keywords match, assign directly to live category
  if (searchCorpus.includes('সরাসরি') || searchCorpus.includes('লাইভ') || searchCorpus.includes('livestream') || /\blive\b/i.test(searchCorpus)) {
    return 'live';
  }

  for (const [catKey, keywords] of Object.entries(categoryKeywords)) {
    for (const kw of keywords) {
      if (searchCorpus.includes(kw.toLowerCase())) {
        return catKey;
      }
    }
  }

  return defaultCategory;
}

// All Active Content Sources (News, Portals, Media)
const FEEDS_CONFIG = [
  {
    id: 'prothomalo',
    name: 'প্রথম আলো',
    url: 'https://www.prothomalo.com/feed',
    defaultCategory: 'national'
  },
  {
    id: 'samakal',
    name: 'সমকাল',
    url: 'https://samakal.com/feed.xml',
    defaultCategory: 'national'
  },
  {
    id: 'jagonews24',
    name: 'জাগোনিউজ ২৪',
    url: 'https://www.jagonews24.com/rss/rss.xml',
    defaultCategory: 'national'
  },
  {
    id: 'deshrupantor',
    name: 'দেশ রূপান্তর',
    url: 'https://www.deshrupantor.com/feed/',
    defaultCategory: 'national'
  },
  {
    id: 'ittefaq',
    name: 'দৈনিক ইত্তেফাক',
    url: 'https://www.ittefaq.com.bd/feed/',
    defaultCategory: 'national'
  },
  {
    id: 'dhakapost',
    name: 'ঢাকা পোস্ট',
    url: 'https://www.dhakapost.com/rss/rss.xml',
    defaultCategory: 'national'
  },
  {
    id: 'bd24live',
    name: 'বিডি২৪লাইভ',
    url: 'https://www.bd24live.com/bangla/feed/',
    defaultCategory: 'national'
  },
  {
    id: 'channelionline',
    name: 'চ্যানেল আই অনলাইন',
    url: 'https://www.channelionline.com/feed/',
    defaultCategory: 'national'
  },
  {
    id: 'ntvbd',
    name: 'এনটিভি অনলাইন',
    url: 'https://www.ntvbd.com/rss.xml',
    defaultCategory: 'national'
  },
  {
    id: 'bbcbangla',
    name: 'বিবিসি বাংলা',
    url: 'https://feeds.bbci.co.uk/bengali/rss.xml',
    defaultCategory: 'national'
  },
  {
    id: 'dailystar',
    name: 'দ্য ডেইলি স্টার',
    url: 'https://www.thedailystar.net/rss.xml',
    defaultCategory: 'national'
  },
  {
    id: 'dailystarbangla',
    name: 'ডেইলি স্টার বাংলা',
    url: 'https://bangla.thedailystar.net/rss.xml',
    defaultCategory: 'national'
  }
];

// Top 12 Bangladeshi TV Channels Official Feeds
const YOUTUBE_FEEDS_CONFIG = [
  {
    id: 'jamunatv',
    channel: 'যমুনা টিভি',
    channelId: 'UCN6sm8iHiPd0cnoUardDAnw',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCN6sm8iHiPd0cnoUardDAnw'
  },
  {
    id: 'somoynews',
    channel: 'সময় সংবাদ',
    channelId: 'UCxHoBXkY88Tb8z1Ssj6CWsQ',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxHoBXkY88Tb8z1Ssj6CWsQ'
  },
  {
    id: 'independenttv',
    channel: 'ইন্ডিপেন্ডেন্ট টিভি',
    channelId: 'UCATUkaOHwO9EP_W87zCiPbA',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCATUkaOHwO9EP_W87zCiPbA'
  },
  {
    id: 'channel24',
    channel: 'চ্যানেল ২৪',
    channelId: 'UCTqKPB3dPUAKqmRJhtF-Lig',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCTqKPB3dPUAKqmRJhtF-Lig'
  },
  {
    id: 'dbcnews',
    channel: 'ডিবিসি নিউজ',
    channelId: 'UCUvXoiDEKI8VZJrr58g4VAw',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCUvXoiDEKI8VZJrr58g4VAw'
  },
  {
    id: 'ekattortv',
    channel: 'একাত্তর টিভি',
    channelId: 'UCtqvtAVmad5zywaziN6CbfA',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtqvtAVmad5zywaziN6CbfA'
  },
  {
    id: 'channeli',
    channel: 'চ্যানেল আই',
    channelId: 'UC8NcXMG3A3f2aFQyGTpSNww',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8NcXMG3A3f2aFQyGTpSNww'
  },
  {
    id: 'news24',
    channel: 'নিউজ ২৪',
    channelId: 'UCO0akufu9MOzyz3nvGIXAAw',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCO0akufu9MOzyz3nvGIXAAw'
  },
  {
    id: 'atnnews',
    channel: 'এটিএন নিউজ',
    channelId: 'UC9Rgo0CrNyd7OWliLekqqGA',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9Rgo0CrNyd7OWliLekqqGA'
  },
  {
    id: 'rtvnews',
    channel: 'আরটিভি নিউজ',
    channelId: 'UC2P5Fd5g41Gtdqf0Uzh8Qaw',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2P5Fd5g41Gtdqf0Uzh8Qaw'
  },
  {
    id: 'banglavision',
    channel: 'বাংলাভিশন',
    channelId: 'UCA4y9g_GRdNrZLH_u5LLSdw',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCA4y9g_GRdNrZLH_u5LLSdw'
  },
  {
    id: 'deshtv',
    channel: 'দেশ টিভি',
    channelId: 'UCz3nB1YSKcZxeriQHKsjKBQ',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCz3nB1YSKcZxeriQHKsjKBQ'
  }
];

let isFetching = false;

async function updateFeeds() {
  if (isFetching) {
    console.log('[FeedManager] An update is already in progress. Skipping...');
    return { success: false, message: 'Update already in progress' };
  }

  isFetching = true;
  console.log('[FeedManager] Starting full multi-source content update...');
  let totalSaved = 0;
  let totalVideosSaved = 0;
  const startTime = Date.now();

  // 1. Fetch Articles from all Bangladeshi Newspapers & Portals
  for (const feedConfig of FEEDS_CONFIG) {
    try {
      console.log(`[FeedManager] Fetching ${feedConfig.name}...`);
      const feed = await parser.parseURL(feedConfig.url);
      
      let savedForSource = 0;
      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const cleanTitle = stripHtml(item.title);
        const cleanDesc = stripHtml(item.contentSnippet || item.content || item.summary || item.description || '');
        const category = classifyArticle(item, feedConfig.defaultCategory);
        let imageUrl = extractImageUrl(item);
        if (!imageUrl) {
          imageUrl = categoryFallbackImages[category] || categoryFallbackImages.national;
        }

        const pubDateObj = item.pubDate ? new Date(item.pubDate) : new Date();
        let timestamp = isNaN(pubDateObj.getTime()) ? Date.now() : pubDateObj.getTime();

        // Timezone anomaly protection (capping future timestamps)
        const now = Date.now();
        if (timestamp > now) {
          if (timestamp - 6 * 3600 * 1000 <= now) {
            timestamp = timestamp - 6 * 3600 * 1000;
          } else {
            timestamp = now;
          }
        }

        const guid = item.guid || item.id || item.link;

        const isBreaking = (
          cleanTitle.includes('ব্রেকিং') ||
          cleanTitle.includes('জরুরি') ||
          cleanTitle.includes('গুরুত্বপূর্ণ') ||
          (Date.now() - timestamp < 3600000 && Math.random() > 0.8)
        ) ? 1 : 0;

        const saved = saveArticle({
          guid,
          title: cleanTitle,
          link: item.link,
          source: feedConfig.name,
          source_id: feedConfig.id,
          category,
          description: cleanDesc.slice(0, 400),
          content: item.content || item.contentEncoded || cleanDesc,
          image_url: imageUrl,
          pub_date: pubDateObj.toISOString(),
          timestamp,
          is_breaking: isBreaking
        });

        if (saved) {
          totalSaved++;
          savedForSource++;
        }
      }

      // Update source stats
      db.prepare(`
        INSERT INTO sources (id, name, url, category_default, last_fetched, total_articles)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_fetched = excluded.last_fetched,
          total_articles = total_articles + excluded.total_articles
      `).run(feedConfig.id, feedConfig.name, feedConfig.url, feedConfig.defaultCategory, Date.now(), savedForSource);

      console.log(`[FeedManager] Parsed ${feedConfig.name}: ${feed.items.length} items (${savedForSource} saved)`);
    } catch (err) {
      console.error(`[FeedManager] Error in ${feedConfig.name}:`, err.message);
    }
  }

  // 2. Fetch Live TV & YouTube Video Feeds from all 12 Bangladeshi TV Channels
  for (const yt of YOUTUBE_FEEDS_CONFIG) {
    try {
      console.log(`[FeedManager] Fetching TV feed for ${yt.channel}...`);
      const feed = await parser.parseURL(yt.url);
      
      for (const vItem of feed.items) {
        const rawVideoId = vItem.ytVideoId || (vItem.link ? (vItem.link.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null);
        if (!rawVideoId || rawVideoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(rawVideoId)) continue;

        const cleanTitle = stripHtml(vItem.title);
        const pubDateObj = vItem.pubDate ? new Date(vItem.pubDate) : new Date();
        let timestamp = isNaN(pubDateObj.getTime()) ? Date.now() : pubDateObj.getTime();
        
        // Timezone protection
        const now = Date.now();
        if (timestamp > now) timestamp = now;

        const thumbnail = `https://i.ytimg.com/vi/${rawVideoId}/hqdefault.jpg`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/${rawVideoId}`;

        const isLive = cleanTitle.toLowerCase().includes('live') || cleanTitle.includes('সরাসরি') || cleanTitle.includes('লাইভ');
        const duration = isLive ? 'লাইভ' : 'ভিডিও';

        // 1. Save in videos table for BDVibe Watch
        const savedVideo = saveVideo({
          video_id: rawVideoId,
          channel: yt.channel,
          channel_id: yt.channelId,
          title: cleanTitle,
          link: vItem.link,
          thumbnail,
          embed_url: embedUrl,
          duration,
          timestamp,
          views: isLive ? 'সরাসরি সম্প্রচার' : '৮৫K+ ভিউ'
        });

        if (savedVideo) totalVideosSaved++;

        // 2. Also save as an Article so TV News shows up inside news categories & feeds!
        const tvCategory = isLive ? 'live' : classifyArticle(vItem, 'national');
        const savedArticle = saveArticle({
          guid: `tv-${rawVideoId}`,
          title: cleanTitle,
          link: vItem.link,
          source: yt.channel,
          source_id: yt.id,
          category: tvCategory,
          description: `${cleanTitle} — ${yt.channel} বিশেষ ভিডিও বুলেটিন ও সর্বশেষ টিভি সংবাদ।`,
          content: `${cleanTitle} — ${yt.channel} সরাসরি সম্প্রচার ও বিশেষ ভিডিও বুলেটিন। বিস্তারিত দেখতে ভিডিও প্রতিবেদনটি দেখুন।`,
          image_url: thumbnail,
          pub_date: pubDateObj.toISOString(),
          timestamp,
          is_breaking: isLive ? 1 : 0
        });

        if (savedArticle) totalSaved++;
      }
      console.log(`[FeedManager] TV News ingested for ${yt.channel}: ${feed.items.length}`);
    } catch (ytErr) {
      console.error(`[FeedManager] Error fetching TV feed for ${yt.channel}:`, ytErr.message);
    }
  }

  isFetching = false;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[FeedManager] Update completed in ${duration}s. Articles: ${totalSaved}, Videos: ${totalVideosSaved}`);

  return {
    success: true,
    totalSaved,
    totalVideosSaved,
    durationSeconds: duration
  };
}

// Background Cron Job: Run automatically every 10 minutes
function initCron() {
  cron.schedule('*/10 * * * *', () => {
    console.log('[FeedManager Cron] Scheduled 10-minute content update triggered.');
    updateFeeds().catch(err => console.error('[FeedManager Cron Error]:', err));
  });
  console.log('[FeedManager Cron] Auto-updater initialized (every 10 minutes).');
}

module.exports = {
  updateFeeds,
  initCron,
  categoryFallbackImages,
  FEEDS_CONFIG,
  YOUTUBE_FEEDS_CONFIG
};

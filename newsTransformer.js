/**
 * BDVibe News Transformation Layer
 * 
 * Transforms raw RSS/YouTube data into:
 * 1. Engaging, punchy headlines (আকর্ষণীয় হেডলাইন)
 * 2. Hook-type captivating descriptions (হুক-টাইপ বর্ণনা)
 * 3. SEO-optimized Meta Title (মেটা টাইটেল)
 * 4. High-CTR Meta Description (মেটা ডেসক্রিপশন)
 */

const CATEGORY_LABELS = {
  national: 'জাতীয়',
  politics: 'রাজনীতি',
  economy: 'অর্থনীতি',
  tech: 'প্রযুক্তি',
  sports: 'খেলাধুলা',
  entertainment: 'বিনোদন',
  lifestyle: 'লাইফস্টাইল',
  education: 'শিক্ষা',
  agriculture: 'কৃষি',
  career: 'ক্যারিয়ার',
  health: 'স্বাস্থ্য',
  probash: 'প্রবাস',
  live: 'লাইভ'
};

const CATEGORY_HOOK_PREFIXES = {
  national: [
    'দেশজুড়ে আলোচনার কেন্দ্রে—',
    'জাতীয় অঙ্গনে নতুন মোড়:',
    'সবাই যা জানতে চাইছে:',
    'ঘটনাস্থলের সর্বশেষ প্রেক্ষাপট—'
  ],
  politics: [
    'রাজনৈতিক অঙ্গনে নতুন উত্তাপ:',
    'বড় সিদ্ধান্তের মুখে—',
    'রাজনীতির সমীকরণে হঠাৎ পরিবর্তন:',
    'আলোচিত এই ইস্যু নিয়ে মাঠপর্যায়ে তৎপরতা—'
  ],
  economy: [
    'অর্থনীতির বাজারে বড় প্রভাব:',
    'বাজারের চিত্র বদলে দিয়ে—',
    'ব্যবসা-বাণিজ্যে নতুন সমীকরণ:',
    'অর্থনৈতিক অঙ্গনে আলোড়ন সৃষ্টিকারী খবর—'
  ],
  tech: [
    'প্রযুক্তির দুনিয়ায় দারুণ চমক:',
    'ব্যবহারকারীদের জন্য নতুন দিগন্ত খুলে দিয়ে—',
    'ডিজিটাল দুনিয়ায় যুগান্তকারী পরিবর্তন:',
    'ভবিষ্যতের প্রযুক্তিতে বড় বিপ্লব—'
  ],
  sports: [
    'খেলার মাঠে চরম উত্তেজনা:',
    'ভক্তদের মাঝে তুমুল আলোড়ন ফেলে—',
    'ম্যাচের রোমাঞ্চকর মোড়:',
    'ক্রীড়াঙ্গনে ইতিহাস গড়া মুহূর্ত—'
  ],
  entertainment: [
    'শোবিজ অঙ্গনে জোর গুঞ্জন:',
    'ভক্ত ও দর্শকদের নজর কেড়ে—',
    'বিনোদন জগতে নতুন চমক:',
    'আলোচিত তারকার এই বিশেষ খবর—'
  ],
  lifestyle: [
    'দৈনন্দিন জীবনকে সহজ করতে—',
    'বিশেষ লাইফস্টাইল বার্তা ও পরামর্শ:',
    'চলতি সময়ের জনপ্রিয় ট্রেন্ড—'
  ],
  health: [
    'স্বাস্থ্য সুরক্ষায় জরুরি বার্তা:',
    'চিকিৎসাবিজ্ঞানের নতুন দিকনির্দেশনা—',
    'বিশেষজ্ঞদের গুরুত্বপূর্ণ পরামর্শ:'
  ],
  agriculture: [
    'কৃষিক্ষেত্রে বড় সম্ভাবনা ও অগ্রগতি—',
    'মাঠপর্যায়ে চাষীদের নতুন তৎপরতা:',
    'কৃষি অর্থনীতিতে বড় প্রভাব ফেলে—'
  ],
  probash: [
    'প্রবাসী ভাই-বোনদের জন্য জরুরি আপডেট:',
    'আন্তর্জাতিক শ্রমবাজারে নতুন খবর:',
    'বিদেশে বাংলাদেশিদের জন্য গুরুত্বপূর্ণ তথ্য—'
  ],
  live: [
    'সরাসরি মাঠপর্যায় থেকে সম্প্রচার:',
    'তাৎক্ষণিক পরিস্থিতি ও লাইভ বিশ্লেষণ—',
    'সবশেষ তাজা তথ্য নিয়ে লাইভ আপডেট:'
  ]
};

const HOOK_ENDINGS = [
    'পরিস্থিতির বিস্তারিত ও সবশেষ তথ্য এক নজরে জানুন।',
    'পুরো ঘটনার ভেতরের খবর ও মূল বিষয়াবলী জানুন।',
    'সিদ্ধান্তের পেছনের কারণ ও প্রভাবের বিস্তারিত জানুন।',
    'ঘটনার সার্বিক প্রেক্ষাপট ও মূল আপডেট দেখে নিন।'
];

function cleanRawText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&#39;/g, "'")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 1. Clean and transform raw headlines into engaging, punchy headlines
 */
function transformHeadline(rawTitle, category = 'national', source = '') {
  let title = cleanRawText(rawTitle);

  // Remove generic TV station and bulletin stamps
  title = title
    .replace(/^[🔴🛑▶•|–—\s]+/, '')
    .replace(/^(?:সরাসরি\s*\|\s*|লাইভ\s*\|\s*|ব্রেকিং\s*\|\s*|বিশেষ\s*সংবাদ\s*:\s*|টকশো\s*[:|]\s*)+/gi, '')
    .replace(/\s*\|\s*(?:Jamuna\s*TV|Rtv\s*News|BanglaVision(?:\s*Live)?(?:\s*News)?(?:\s*Bulletin)?|Ekattor\s*TV|Somoy\s*TV|Channel\s*24|DBC\s*News|Independent\s*TV|News24|ATN\s*News|Desh\s*TV)[^|]*$/gi, '')
    .replace(/\s*\|\s*\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}.*$/gi, '')
    .replace(/\s*\|\s*\d{1,2}\s+(?:জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)\s+\d{4}.*$/gi, '')
    .replace(/\s*—\s*(?:প্রথম আলো|সমকাল|ইত্তেফাক|যুগান্তর|কালের কণ্ঠ|ঢাকা পোস্ট|জাগো নিউজ).*$/gi, '')
    .replace(/\s*\.{3,}$/, '')
    .trim();

  // If title was stripped too much, fallback to cleaned original
  if (title.length < 15) {
    title = cleanRawText(rawTitle).replace(/^[🔴🛑▶•|–—\s]+/, '');
  }

  // Remove redundant quotation wrapping if whole title is wrapped in quotes
  if ((title.startsWith('‘') && title.endsWith('’')) || (title.startsWith('"') && title.endsWith('"'))) {
    title = title.slice(1, -1).trim();
  }

  return title;
}

/**
 * 2. Generate an engaging hook-type description
 */
function transformHookDescription(rawDesc, cleanTitle, category = 'national', source = '') {
  let desc = cleanRawText(rawDesc);

  // Strip trailing "বিস্তারিত", "আরও পড়ুন", "..."
  desc = desc
    .replace(/\s*(?:বিস্তারিত|আরও\s*পড়ুন|পড়ুন|ভিডিওতে\s*দেখুন|ছবিতে\s*দেখুন)\s*$/gi, '')
    .replace(/\s*\.{3,}$/, '')
    .trim();

  // If description repeats the clean title at the beginning, strip it out
  if (desc.startsWith(cleanTitle)) {
    desc = desc.slice(cleanTitle.length).replace(/^[\s—–:-]+/, '').trim();
  }

  // If description is empty or too short, generate a rich contextual hook
  if (desc.length < 35) {
    const prefixes = CATEGORY_HOOK_PREFIXES[category] || CATEGORY_HOOK_PREFIXES.national;
    const prefix = prefixes[Math.abs(hashString(cleanTitle)) % prefixes.length];
    const ending = HOOK_ENDINGS[Math.abs(hashString(cleanTitle + 'end')) % HOOK_ENDINGS.length];
    return `${prefix} ${cleanTitle}। ${ending}`;
  }

  // Take the first 1-2 complete sentences
  const sentences = desc.split(/(?<=[।?!])\s+/).filter(s => s.trim().length > 10);
  let mainCore = sentences.length > 0 ? sentences.slice(0, 2).join(' ') : desc;
  
  if (mainCore.length > 175) {
    mainCore = mainCore.slice(0, 172) + '...';
  }

  // Add category hook prefix if it doesn't already have one
  const prefixes = CATEGORY_HOOK_PREFIXES[category] || CATEGORY_HOOK_PREFIXES.national;
  const prefix = prefixes[Math.abs(hashString(cleanTitle)) % prefixes.length];

  // If mainCore doesn't start with a hook phrase, add prefix
  let hookDesc = `${prefix} ${mainCore}`;
  if (hookDesc.length > 210) {
    hookDesc = hookDesc.slice(0, 206) + '...';
  }

  return hookDesc;
}

/**
 * 3. Generate SEO Meta Title & Meta Description
 */
function generateMetaTags(transformedTitle, hookDescription, category = 'national') {
  const catLabel = CATEGORY_LABELS[category] || 'সংবাদ';

  // Meta Title: Ideal 50 - 65 chars
  let metaTitle = `${transformedTitle} | BDVibe ${catLabel}`;
  if (metaTitle.length > 68) {
    metaTitle = `${transformedTitle.slice(0, 56)}... | BDVibe`;
  }

  // Meta Description: Ideal 140 - 160 chars for Google SERP
  let metaDesc = hookDescription;
  if (metaDesc.length > 155) {
    metaDesc = metaDesc.slice(0, 152) + '...';
  }
  metaDesc = `${metaDesc} বিস্তারিত খবর ও সবশেষ আপডেট পড়ুন BDVibe পোর্টালে।`;
  if (metaDesc.length > 165) {
    metaDesc = metaDesc.slice(0, 160) + '...';
  }

  return {
    meta_title: metaTitle,
    meta_description: metaDesc
  };
}

/**
 * Master Transformation Pipeline Function
 */
function transformNewsItem(rawItem, category = 'national', source = '') {
  const cat = category || 'national';
  const src = source || rawItem.source || 'BDVibe';

  const transformedTitle = transformHeadline(rawItem.title, cat, src);
  const hookDescription = transformHookDescription(rawItem.description || rawItem.content, transformedTitle, cat, src);
  const { meta_title, meta_description } = generateMetaTags(transformedTitle, hookDescription, cat);

  return {
    title: transformedTitle,
    description: hookDescription,
    meta_title,
    meta_description
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

module.exports = {
  transformNewsItem,
  transformHeadline,
  transformHookDescription,
  generateMetaTags
};

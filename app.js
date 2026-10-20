/**
 * BDVibe — Smart Digital Content & Media Portal
 * Full-featured Content Aggregator with Live Search, Suggestions & Bento UI
 */

// Application State
const state = {
  category: 'all',
  source: 'all',
  search: '',
  offset: 0,
  limit: 24,
  hasMore: true,
  isLoading: false,
  savedArticles: JSON.parse(localStorage.getItem('bdvibe_saved_content') || '[]'),
  activeArticle: null,
  activeVideo: null,
  videosList: []
};

// Category mapping helper
const CATEGORY_NAMES = {
  all: 'সকল বিষয়',
  live: 'লাইভ ভিডিও',
  politics: 'রাজনীতি',
  economy: 'অর্থনীতি ও বাণিজ্য',
  tech: 'প্রযুক্তি',
  lifestyle: 'লাইফস্টাইল',
  education: 'শিক্ষা',
  agriculture: 'কৃষি',
  career: 'ক্যারিয়ার',
  sports: 'খেলাধুলা',
  entertainment: 'বিনোদন',
  health: 'স্বাস্থ্য',
  probash: 'প্রবাস',
  national: 'জাতীয় ও বিশ্ব'
};

// Bengali Number Converter
function toBengaliNumber(num) {
  if (num === null || num === undefined) return '০';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bnDigits[d]);
}

// Relative Time in Bengali
function formatRelativeTimeBn(timestamp) {
  if (!timestamp) return 'কিছুক্ষণ আগে';
  const diffMs = Date.now() - Number(timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'এইমাত্র';
  if (diffMin < 60) return `${toBengaliNumber(diffMin)} মিনিট আগে`;
  if (diffHour < 24) return `${toBengaliNumber(diffHour)} ঘণ্টা আগে`;
  if (diffDay === 1) return 'গতকাল';
  if (diffDay < 7) return `${toBengaliNumber(diffDay)} দিন আগে`;
  
  const d = new Date(Number(timestamp));
  return d.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
}

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('portalToast');
  const msgElem = document.getElementById('toastMessage');
  if (!toast || !msgElem) return;
  msgElem.textContent = message;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}

// HTML Escaping Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Initialization & Lifecycle
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initLiveDate();
  initTheme();
  initEventListeners();
  updateSavedCounter();

  // Load Initial MSN Portal Data (Weather first, then dense continuous feed)
  loadCurrencyAndWeather().finally(() => {
    loadDenseStream(false).finally(() => {
      initInfiniteScroll();
    });
  });

  // Start Real-Time Live Engine (every second ticking clock + auto-poll)
  initRealtimeEngine();

  // Start Global 30-Second Ad Policy Auto-Refresh Engine
  startGlobalAdAutoRefresh();
});

// ==========================================================================
// Complete Today's Calendar & Almanac Ticker (আজকের দিনপঞ্জিকা ও ট্রেন্ডিং স্ক্রলার)
// ==========================================================================

function getBanglaDateParts(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

  let bDay, bMonth, bSeason, bYear;

  if (month === 3 && day >= 14) { bMonth = 'বৈশাখ'; bDay = day - 13; bSeason = 'গ্রীষ্ম কাল'; bYear = year - 593; }
  else if (month === 4 && day < 15) { bMonth = 'বৈশাখ'; bDay = day + 17; bSeason = 'গ্রীষ্ম কাল'; bYear = year - 593; }
  else if (month === 4 && day >= 15) { bMonth = 'জ্যৈষ্ঠ'; bDay = day - 14; bSeason = 'গ্রীষ্ম কাল'; bYear = year - 593; }
  else if (month === 5 && day < 15) { bMonth = 'জ্যৈষ্ঠ'; bDay = day + 17; bSeason = 'গ্রীষ্ম কাল'; bYear = year - 593; }
  else if (month === 5 && day >= 15) { bMonth = 'আষাঢ়'; bDay = day - 14; bSeason = 'বর্ষা কাল'; bYear = year - 593; }
  else if (month === 6 && day < 16) { bMonth = 'আষাঢ়'; bDay = day + 16; bSeason = 'বর্ষা কাল'; bYear = year - 593; }
  else if (month === 6 && day >= 16) { bMonth = 'শ্রাবণ'; bDay = day - 15; bSeason = 'বর্ষা কাল'; bYear = year - 593; }
  else if (month === 7 && day < 16) { bMonth = 'শ্রাবণ'; bDay = day + 16; bSeason = 'বর্ষা কাল'; bYear = year - 593; }
  else if (month === 7 && day >= 16) { bMonth = 'ভাদ্র'; bDay = day - 15; bSeason = 'শরৎ কাল'; bYear = year - 593; }
  else if (month === 8 && day < 16) { bMonth = 'ভাদ্র'; bDay = day + 16; bSeason = 'শরৎ কাল'; bYear = year - 593; }
  else if (month === 8 && day >= 16) { bMonth = 'আশ্বিন'; bDay = day - 15; bSeason = 'শরৎ কাল'; bYear = year - 593; }
  else if (month === 9 && day < 17) { bMonth = 'আশ্বিন'; bDay = day + 15; bSeason = 'শরৎ কাল'; bYear = year - 593; }
  else if (month === 9 && day >= 17) { bMonth = 'কার্তিক'; bDay = day - 16; bSeason = 'হেমন্ত কাল'; bYear = year - 593; }
  else if (month === 10 && day < 16) { bMonth = 'কার্তিক'; bDay = day + 14; bSeason = 'হেমন্ত কাল'; bYear = year - 593; }
  else if (month === 10 && day >= 16) { bMonth = 'অগ্রহায়ণ'; bDay = day - 15; bSeason = 'হেমন্ত কাল'; bYear = year - 593; }
  else if (month === 11 && day < 16) { bMonth = 'অগ্রহায়ণ'; bDay = day + 15; bSeason = 'হেমন্ত কাল'; bYear = year - 593; }
  else if (month === 11 && day >= 16) { bMonth = 'পৌষ'; bDay = day - 15; bSeason = 'শীত কাল'; bYear = year - 593; }
  else if (month === 0 && day < 15) { bMonth = 'পৌষ'; bDay = day + 16; bSeason = 'শীত কাল'; bYear = year - 594; }
  else if (month === 0 && day >= 15) { bMonth = 'মাঘ'; bDay = day - 14; bSeason = 'শীত কাল'; bYear = year - 594; }
  else if (month === 1 && day < 14) { bMonth = 'মাঘ'; bDay = day + 17; bSeason = 'শীত কাল'; bYear = year - 594; }
  else if (month === 1 && day >= 14) { bMonth = 'ফাল্গুন'; bDay = day - 13; bSeason = 'বসন্ত কাল'; bYear = year - 594; }
  else if (month === 2 && day < 15) { bMonth = 'ফাল্গুন'; bDay = day + (isLeap ? 16 : 15); bSeason = 'বসন্ত কাল'; bYear = year - 594; }
  else if (month === 2 && day >= 15) { bMonth = 'চৈত্র'; bDay = day - 14; bSeason = 'বসন্ত কাল'; bYear = year - 594; }
  else { bMonth = 'চৈত্র'; bDay = day + 17; bSeason = 'বসন্ত কাল'; bYear = year - 594; }

  return { bDay, bMonth, bSeason, bYear };
}

function getLunarDetails(date = new Date()) {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const synodicMonth = 29.53058867 * 86400 * 1000;
  const diff = date.getTime() - knownNewMoon;
  const phaseCycle = (diff % synodicMonth + synodicMonth) % synodicMonth;
  const moonAgeDays = phaseCycle / (86400 * 1000);

  const tithiIndex = Math.floor((moonAgeDays / 29.53058867) * 30);
  const isShukla = tithiIndex < 15;
  const tithiNum = (tithiIndex % 15) + 1;

  const tithiNames = [
    'প্রতিপদ', 'দ্বিতীয়া', 'তৃতীয়া', 'চতুর্থী', 'পঞ্চমী', 
    'ষষ্ঠী', 'সপ্তমী', 'অষ্টমী', 'নবমী', 'দশমী', 
    'একাদশী', 'দ্বাদশী', 'ত্রয়োদশী', 'চতুর্দশী', isShukla ? 'পূর্ণিমা' : 'অমাবস্যা'
  ];

  const tithiName = tithiNames[tithiNum - 1];
  const paksha = isShukla ? 'শুক্লপক্ষ' : 'কৃষ্ণপক্ষ';

  let daysToPurnima = Math.round(14.765 - moonAgeDays);
  if (daysToPurnima < 0) daysToPurnima += 30;

  let daysToAmavasya = Math.round(29.53 - moonAgeDays);
  if (daysToAmavasya > 29.5) daysToAmavasya = 0;

  return {
    tithi: `${paksha} ${tithiName} তিথি`,
    paksha,
    daysToPurnima,
    daysToAmavasya
  };
}

function getHijriDate(date = new Date()) {
  const hijriMonths = [
    'মুহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 
    'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান', 
    'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ্জ'
  ];
  const jd = Math.floor(date.getTime() / 86400000) + 2440587.5;
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
  const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const m = Math.floor((24 * l3) / 709);
  const d = l3 - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;

  const hDay = Math.min(Math.max(d, 1), 30);
  const hMonth = hijriMonths[(m - 1 + 12) % 12];
  return `${toBengaliNumber(hDay)} ${hMonth} ${toBengaliNumber(y)} হিজরি`;
}

function getAstroPanjikaData(date = new Date()) {
  const dayOfWeek = date.getDay(); // 0 Sunday, 3 Wednesday

  // 1. Lunar Phase & Illumination
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const synodicMonth = 29.53058867 * 86400 * 1000;
  const diff = date.getTime() - knownNewMoon;
  const phaseCycle = (diff % synodicMonth + synodicMonth) % synodicMonth;
  const moonAgeDays = phaseCycle / (86400 * 1000);

  // Illumination %
  const illumination = Math.round(50 * (1 - Math.cos((moonAgeDays / 29.53058867) * 2 * Math.PI)));

  // Moonrise & Moonset approximation (Dhaka standard)
  const riseMinutesTotal = Math.round((6 * 60 + moonAgeDays * 49.5) % (24 * 60));
  const setMinutesTotal = (riseMinutesTotal + 12 * 60 + 25) % (24 * 60);

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const h12 = h % 12 || 12;
    const period = (h >= 4 && h < 12) ? 'সকাল' : (h >= 12 && h < 16) ? 'দুপুর' : (h >= 16 && h < 19) ? 'সন্ধ্যা' : 'রাত';
    return `${period} ${toBengaliNumber(String(h12).padStart(2, '0'))}:${toBengaliNumber(String(m).padStart(2, '0'))} মি.`;
  };

  const moonRiseStr = formatTime(riseMinutesTotal);
  const moonSetStr = formatTime(setMinutesTotal);

  // 2. Nakshatra calculation (27 nakshatras)
  const nakshatraNames = [
    'অশ্বিনী', 'ভরণী', 'কৃত্তিকা', 'রোহিণী', 'মৃগশিরা', 'আর্দ্রা', 
    'পুনর্বসু', 'পুষ্যা', 'অশ্লেষা', 'মঘা', 'পূর্বফাল্গুনী', 'উত্তরফাল্গুনী', 
    'হস্তা', 'চিত্রা', 'স্বাতী', 'বিশাখা', 'অনুরাধা', 'জ্যেষ্ঠা', 
    'মূল', 'পূর্বাষাঢ়া', 'উত্তরাষাঢ়া', 'শ্রবণা', 'ধনিষ্ঠা', 'শতভিষা', 
    'পূর্বভাদ্রপদ', 'উত্তরভাদ্রপদ', 'রেবতী'
  ];
  const nakshatraIndex = Math.floor(((date.getTime() / 86400000 + 4) % 27 + 27) % 27);
  const currentNakshatra = nakshatraNames[nakshatraIndex];

  // 3. Yoga & Karana
  const yogaNames = [
    'বিষ্কুম্ভ', 'প্রীতি', 'আয়ুষ্মান', 'সৌভাগ্য', 'শোভন', 'অতিগণ্ড', 'সুকর্মা', 
    'ধৃতি', 'শূল', 'গণ্ড', 'বৃদ্ধি', 'ধ্রুব', 'ব্যাঘাত', 'হর্ষণ', 'বজ্র', 
    'সিদ্ধি', 'ব্যতিপাত', 'বরীয়ান', 'পরিঘ', 'শিব', 'সিদ্ধ', 'সাধ্য', 'শুভ', 
    'শুক্ল', 'ব্রহ্ম', 'ইন্দ্র', 'বৈধৃতি'
  ];
  const currentYoga = yogaNames[Math.floor(((date.getTime() / 86400000 + 11) % 27 + 27) % 27)];
  
  const karanaNames = ['বব', 'বালব', 'কৌলব', 'তৈতিল', 'গর', 'বণিজ', 'বিষ্টি (ভদ্রা)'];
  const currentKarana = karanaNames[Math.floor(moonAgeDays * 2) % karanaNames.length];

  // 4. Barabela & Kalabela per day of week (Dhaka standard)
  const barabelaSchedule = [
    { name: 'রবিবার', kalabela: 'সন্ধ্যা ০৪:০০ - ০৫:৩০ মি.', barabela: 'সকাল ১১:৩০ - ০১:০০ মি.', dishashool: 'পশ্চিম দিক' },
    { name: 'সোমবার', kalabela: 'সকাল ০৭:৩০ - ০৯:০০ মি.', barabela: 'দুপুর ০১:০০ - ০২:৩০ মি.', dishashool: 'পূর্ব দিক' },
    { name: 'মঙ্গলবার', kalabela: 'দুপুর ০১:৩০ - ০৩:০০ মি.', barabela: 'সকাল ০৬:০০ - ০৭:৩০ মি.', dishashool: 'উত্তর দিক' },
    { name: 'বুধবার', kalabela: 'দুপুর ১২:০০ - ০১:৩০ মি.', barabela: 'সকাল ১০:৩০ - ১২:০০ মি.', dishashool: 'উত্তর দিক' },
    { name: 'বৃহস্পতিবার', kalabela: 'দুপুর ০১:৩০ - ০৩:০০ মি.', barabela: 'দুপুর ০২:৩০ - ০৪:০০ মি.', dishashool: 'দক্ষিণ দিক' },
    { name: 'শুক্রবার', kalabela: 'সকাল ০৯:০০ - ১০:৩০ মি.', barabela: 'সকাল ০৭:৩০ - ০৯:০০ মি.', dishashool: 'পশ্চিম দিক' },
    { name: 'শনিবার', kalabela: 'সকাল ০৬:০০ - ০৭:৩০ মি.', barabela: 'সকাল ০৯:০০ - ১০:৩০ মি.', dishashool: 'পূর্ব দিক' }
  ];
  const todayAstroTimes = barabelaSchedule[dayOfWeek];

  // 5. Parban & Vrat from month & tithi
  const tithiIndex = Math.floor((moonAgeDays / 29.53058867) * 30);
  const isShukla = tithiIndex < 15;
  const tithiNum = (tithiIndex % 15) + 1;

  let parban = 'আজকের বিশেষ ব্রত ও দেবঅর্চনা';
  if (tithiNum === 11) parban = isShukla ? 'পাপঙ্কুশা একাদশী ব্রত ও উপবাস' : 'রম্ভা / রমা একাদশী ব্রত';
  else if (tithiNum === 12) parban = 'গোবৎস ও মহা দ্বাদশী ব্রত';
  else if (tithiNum === 13) parban = 'প্রদোষ ব্রত ও বিশেষ শিব আরাধনা';
  else if (tithiNum === 14) parban = isShukla ? 'শ্রী সত্যনারায়ণ ব্রত ও শ্রী অনন্ত চতুর্দশী' : 'নরক চতুর্দশী ও চৌদ্দ প্রদীপ প্রজ্বলন';
  else if (tithiNum === 15) parban = isShukla ? 'শ্রী শ্রী কোজাগরী লক্ষ্মী পূজা ও পূর্ণিমা' : 'শ্রী শ্রী শ্যামা পূজা ও দীপাবলি মহোৎসব';
  else if (tithiNum === 10) parban = 'বিজয়াদশমী স্মারক ও দশমী তিথি';

  // 6. Islamic Special: Ayyam al-Bid (13, 14, 15 Hijri)
  const hijriDayApprox = Math.floor(moonAgeDays) + 1;
  const daysToAyyamAlBid = Math.max(0, 13 - hijriDayApprox);

  return {
    moonAgeDays: moonAgeDays.toFixed(1),
    illumination,
    moonRiseStr,
    moonSetStr,
    currentNakshatra,
    currentYoga,
    currentKarana,
    parban,
    kalabela: todayAstroTimes.kalabela,
    barabela: todayAstroTimes.barabela,
    dishashool: todayAstroTimes.dishashool,
    daysToAyyamAlBid
  };
}

function renderTodayCalendarTrending() {
  const container = document.getElementById('trendingChipsWrap');
  if (!container) return;

  const now = new Date();
  const dayNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const monthNamesEn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  const weekday = dayNames[now.getDay()];
  const enDay = toBengaliNumber(now.getDate());
  const enMonth = monthNamesEn[now.getMonth()];
  const enYear = toBengaliNumber(now.getFullYear());
  const enDateFull = `${weekday}, ${enDay} ${enMonth} ${enYear}`;

  const { bDay, bMonth, bSeason, bYear } = getBanglaDateParts(now);
  const bnDateFull = `${toBengaliNumber(bDay)} ${bMonth} ${toBengaliNumber(bYear)} বঙ্গাব্দ (${bSeason})`;

  const hijriDateFull = getHijriDate(now);
  const lunar = getLunarDetails(now);
  const astro = getAstroPanjikaData(now);

  const purnimaText = lunar.daysToPurnima === 0 
    ? 'আজ পূর্ণিমা তিথি! 🌕' 
    : `পরবর্তী পূর্ণিমা: আর ${toBengaliNumber(lunar.daysToPurnima)} দিন বাকি 🌕`;

  const amavasyaText = lunar.daysToAmavasya === 0 
    ? 'আজ অমাবস্যা তিথি! 🌑' 
    : `পরবর্তী অমাবস্যা: আর ${toBengaliNumber(lunar.daysToAmavasya)} দিন বাকি 🌑`;

  // Daily Horoscopes for 12 Zodiac signs
  const rashifalList = [
    { sign: 'মেষ', symbol: '♈', text: 'কর্মে শুভ যোগাযোগ ও নতুন কাজের সুযোগ' },
    { sign: 'বৃষ', symbol: '♉', text: 'ব্যবসায়িক বিনিয়োগে লাভ ও আর্থিক সাফল্য' },
    { sign: 'মিথুন', symbol: '♊', text: 'পারিবারিক সিদ্ধান্ত গ্রহণে শুভ দিন' },
    { sign: 'কর্কট', symbol: '♋', text: 'সৃজনশীল কাজে সম্মান ও বিশেষ স্বীকৃতি' },
    { sign: 'সিংহ', symbol: '♌', text: 'আত্মবিশ্বাস বৃদ্ধি ও নেতৃত্বে সফলতা' },
    { sign: 'কন্যা', symbol: '♍', text: 'বকেয়া অর্থ প্রাপ্তি ও আর্থিক দিক শুভ' },
    { sign: 'তুলা', symbol: '♎', text: 'সম্পর্কে সৌহার্দ্য ও ভুল বোঝাবুঝি দূর' },
    { sign: 'বৃশ্চিক', symbol: '♏', text: 'ধৈর্য ও সচেতনতায় কাজে সফলতা অর্জন' },
    { sign: 'ধনু', symbol: '♐', text: 'ভ্রমণ ও সামাজিক যোগাযোগে আনন্দদায়ক সময়' },
    { sign: 'মকর', symbol: '♑', text: 'দীর্ঘ প্রচেষ্টার কাঙ্ক্ষিত ফল লাভ' },
    { sign: 'কুম্ভ', symbol: '♒', text: 'নতুন পরিকল্পনা বাস্তবায়নের শুভ সময়' },
    { sign: 'মীন', symbol: '♓', text: 'মানসিক শান্তি ও আধ্যাত্মিক প্রফুল্লতা' }
  ];

  // Comprehensive Almanac & Astronomical Items (জ্যোতিষ, পঞ্জিকা, ইসলাম ও আকাশ পর্যবেক্ষণ)
  const items = [
    // 1. English Date
    `<div class="cal-pill cal-pill-en" onclick="showToast('আজকের ইংরেজি তারিখ: ${enDateFull}')">
      <span class="cal-pill-icon">📅</span>
      <span class="cal-pill-label">ইংরেজি:</span>
      <span class="cal-pill-val">${enDateFull}</span>
    </div>`,

    // 2. Bangla Calendar & Season
    `<div class="cal-pill cal-pill-bn" onclick="showToast('আজকের বাংলা তারিখ: ${bnDateFull}')">
      <span class="cal-pill-icon">🌾</span>
      <span class="cal-pill-label">বাংলা:</span>
      <span class="cal-pill-val">${bnDateFull}</span>
    </div>`,

    // 3. Hijri Date
    `<div class="cal-pill cal-pill-hijri" onclick="showToast('আজকের ইসলামিক তারিখ: ${hijriDateFull}')">
      <span class="cal-pill-icon">🌙</span>
      <span class="cal-pill-label">হিজরি:</span>
      <span class="cal-pill-val">${hijriDateFull}</span>
    </div>`,

    // 4. Tithi & Paksha
    `<div class="cal-pill cal-pill-tithi" onclick="showToast('আজকের পঞ্জিকা: ${lunar.tithi}')">
      <span class="cal-pill-icon">🕉️</span>
      <span class="cal-pill-label">তিথি:</span>
      <span class="cal-pill-val">${lunar.tithi}</span>
    </div>`,

    // 5. Nakshatra (জ্যোতিষীদের বিশেষ নক্ষত্র)
    `<div class="cal-pill cal-pill-tithi" onclick="showToast('আজকের নক্ষত্র: ${astro.currentNakshatra} নক্ষত্র')">
      <span class="cal-pill-icon">⭐</span>
      <span class="cal-pill-label">নক্ষত্র:</span>
      <span class="cal-pill-val">${astro.currentNakshatra} নক্ষত্র</span>
    </div>`,

    // 6. Yoga & Karana (যোগ ও করণ)
    `<div class="cal-pill cal-pill-tithi" onclick="showToast('আজকের যোগ: ${astro.currentYoga} যোগ এবং করণ: ${astro.currentKarana} করণ')">
      <span class="cal-pill-icon">🧘</span>
      <span class="cal-pill-label">যোগ ও করণ:</span>
      <span class="cal-pill-val">${astro.currentYoga} যোগ • ${astro.currentKarana} করণ</span>
    </div>`,

    // 7. Parban & Vrat (ব্রত ও ধর্মীয় পার্বণ)
    `<div class="cal-pill cal-pill-bn" onclick="showToast('আজকের ব্রত ও পার্বণ: ${astro.parban}')">
      <span class="cal-pill-icon">🪔</span>
      <span class="cal-pill-label">ব্রত ও পার্বণ:</span>
      <span class="cal-pill-val">${astro.parban}</span>
    </div>`,

    // 8. Moon Sighting & Illumination (চাঁদ দেখা ও চন্দ্রকলা)
    `<div class="cal-pill cal-pill-moon" onclick="showToast('আজকের চাঁদের বয়স ${toBengaliNumber(astro.moonAgeDays)} দিন এবং ${toBengaliNumber(astro.illumination)}% আলোকিত')">
      <span class="cal-pill-icon">🌔</span>
      <span class="cal-pill-label">চাঁদের বয়স:</span>
      <span class="cal-pill-val">${toBengaliNumber(astro.moonAgeDays)} দিন (${toBengaliNumber(astro.illumination)}% আলোকিত)</span>
    </div>`,

    // 9. Moonrise & Moonset (চন্দ্রোদয় ও চন্দ্রাস্ত)
    `<div class="cal-pill cal-pill-moon" onclick="showToast('আজকের চন্দ্রোদয় ${astro.moonRiseStr} এবং চন্দ্রাস্ত ${astro.moonSetStr}')">
      <span class="cal-pill-icon">🌙</span>
      <span class="cal-pill-label">চন্দ্রোদয়:</span>
      <span class="cal-pill-val">${astro.moonRiseStr} • 🌘 চন্দ্রাস্ত: ${astro.moonSetStr}</span>
    </div>`,

    // 10. Purnima Countdown
    `<div class="cal-pill cal-pill-moon" onclick="showToast('${purnimaText}')">
      <span class="cal-pill-icon">🌕</span>
      <span class="cal-pill-val">${purnimaText}</span>
    </div>`,

    // 11. Amavasya Countdown
    `<div class="cal-pill cal-pill-moon" onclick="showToast('${amavasyaText}')">
      <span class="cal-pill-icon">🌑</span>
      <span class="cal-pill-val">${amavasyaText}</span>
    </div>`,

    // 12. Sunrise & Sunset
    `<div class="cal-pill cal-pill-sun" onclick="showToast('আজকের সূর্যোদয় ভোর ৫:৫৬ মি. এবং সূর্যাস্ত সন্ধ্যা ৫:২৯ মি.')">
      <span class="cal-pill-icon">☀️</span>
      <span class="cal-pill-label">সূর্যোদয়:</span>
      <span class="cal-pill-val">ভোর ৫:৫৬ মি.</span>
      <span class="cal-pill-icon">🌅</span>
      <span class="cal-pill-label">সূর্যাস্ত:</span>
      <span class="cal-pill-val">সন্ধ্যা ৫:২৯ মি.</span>
    </div>`,

    // 13. Sehri & Iftar for Nafl / Sunnah Fasting
    `<div class="cal-pill cal-pill-hijri" onclick="showToast('নফল রোজার সেহরি শেষ ভোর ০৪:৩৯ মি. এবং ইফতার সন্ধ্যা ০৫:২৯ মি.')">
      <span class="cal-pill-icon">🍽️</span>
      <span class="cal-pill-label">সেহরি শেষ:</span>
      <span class="cal-pill-val">ভোর ০৪:৩৯ মি.</span>
      <span class="cal-pill-icon">🕌</span>
      <span class="cal-pill-label">ইফতার:</span>
      <span class="cal-pill-val">সন্ধ্যা ০৫:২৯ মি.</span>
    </div>`,

    // 14. Tahajjud & Ishraq
    `<div class="cal-pill cal-pill-hijri" onclick="showToast('তাহাজ্জুদের উত্তম ওয়াক্ত শেষ ভোর ০৪:২৫ মি. এবং ইশরাক শুরু সকাল ০৬:১৫ মি.')">
      <span class="cal-pill-icon">✨</span>
      <span class="cal-pill-label">তাহাজ্জুদ শেষ:</span>
      <span class="cal-pill-val">ভোর ০৪:২৫</span>
      <span class="cal-pill-icon">☀️</span>
      <span class="cal-pill-label">ইশরাক শুরু:</span>
      <span class="cal-pill-val">সকাল ০৬:১৫</span>
    </div>`,

    // 15. Ayyam al-Bid (আইয়ামে বিজ রোজা কাউন্টডাউন)
    `<div class="cal-pill cal-pill-hijri" onclick="showToast('হিজরি মাসের ১৩, ১৪ ও ১৫ তারিখের বিশেষ সুন্নত রোজা')">
      <span class="cal-pill-icon">🌙</span>
      <span class="cal-pill-label">আইয়ামে বিজ:</span>
      <span class="cal-pill-val">${astro.daysToAyyamAlBid === 0 ? 'আজ আইয়ামে বিজ রোজা!' : `আর ${toBengaliNumber(astro.daysToAyyamAlBid)} দিন বাকি (১৩-১৫ হিজরি)`}</span>
    </div>`,

    // 16. Abhijit Muhurat (সর্বশ্রেষ্ঠ শুভক্ষণ)
    `<div class="cal-pill cal-pill-amrita" onclick="showToast('অভিজিৎ মুহূর্ত দিনের সর্বশ্রেষ্ঠ শুভ সময় (সকাল ১১:৩৮ - ১২:২৬ মি.)')">
      <span class="cal-pill-icon">🌟</span>
      <span class="cal-pill-label">অভিজিৎ মুহূর্ত:</span>
      <span class="cal-pill-val">সকাল ১১:৩৮ - ১২:২৬ মি. (সর্বশ্রেষ্ঠ শুভক্ষণ)</span>
    </div>`,

    // 17. Auspicious Time / Amritayog
    `<div class="cal-pill cal-pill-amrita" onclick="showToast('অমৃতযোগ: সকাল ০৮:১৫ - ১০:৩০ মি. | রাহুকাল: দুপুর ১২:০০ - ০১:৩০ মি.')">
      <span class="cal-pill-icon">✨</span>
      <span class="cal-pill-label">অমৃতযোগ:</span>
      <span class="cal-pill-val">সকাল ০৮:১৫-১০:৩০</span>
      <span class="cal-pill-icon">⚠️</span>
      <span class="cal-pill-label">রাহুকাল:</span>
      <span class="cal-pill-val">১২:০০-০১:৩০</span>
    </div>`,

    // 18. Kalabela & Barabela (শুভকর্মে বর্জনীয় সময়)
    `<div class="cal-pill cal-pill-sun" onclick="showToast('কালবেলা ও বারবেলা শুভকর্মে বর্জনীয় সময়: ${astro.kalabela}')">
      <span class="cal-pill-icon">⚠️</span>
      <span class="cal-pill-label">কালবেলা:</span>
      <span class="cal-pill-val">${astro.kalabela} (বর্জনীয়)</span>
    </div>`,

    // 19. Dishashool (দিকশূল ও শুভ যাত্রা দিক)
    `<div class="cal-pill cal-pill-tithi" onclick="showToast('আজকের দিকশূল ${astro.dishashool}; যাত্রার শুভ বিকল্প দক্ষিণ ও পূর্ব দিক')">
      <span class="cal-pill-icon">🧭</span>
      <span class="cal-pill-label">দিকশূল:</span>
      <span class="cal-pill-val">${astro.dishashool} (যাত্রায় সতর্কতা)</span>
    </div>`,

    // 20. Rashifals (১২ রাশির সম্পূর্ণ দৈনিক রাশিফল)
    ...rashifalList.map(r => `
      <div class="cal-pill cal-pill-rashi" onclick="showToast('আজকের ${r.sign} রাশিফল: ${r.text}')">
        <span class="cal-pill-icon">${r.symbol}</span>
        <span class="cal-pill-label">${r.sign}:</span>
        <span class="cal-pill-val">${r.text}</span>
      </div>
    `)
  ];

  const htmlContent = items.join('');
  // Duplicate sequence for seamless 0% -> -50% infinite marquee loop with zero gaps
  container.innerHTML = htmlContent + htmlContent;
}

// Live Bengali Date & Second-by-Second Clock
function initLiveDate() {
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    const timeElem = document.getElementById('liveTimeText');
    if (timeElem) timeElem.textContent = timeStr;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // Render comprehensive Calendar, Almanac, Horoscopes & Trending Marquee
  renderTodayCalendarTrending();
  // Refresh calendar at midnight or hourly
  setInterval(renderTodayCalendarTrending, 3600000);
}

// ==========================================================================
// 10-Minute Seamless Zero-Jerk Background Refresh Engine
// প্রতি ১০ মিনিট পর পর স্বয়ংক্রিয় রিফ্রেশ, কোনো রকমের ঝাঁকুনি বা স্ক্রিন জাম্প ছাড়াই
// ==========================================================================
const BACKGROUND_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // ১০ মিনিট (৬০০,০০০ মি.সে.)
let lastPolledTimestamp = Date.now();

function initRealtimeEngine() {
  setInterval(async () => {
    try {
      // ১. ব্যাকএন্ডে নতুন ডেটা এসেছে কিনা নীরবে চেক করা
      const res = await fetch(`/api/news/latest-check?since=${lastPolledTimestamp}`);
      const data = await res.json();

      if (data && data.success) {
        if (data.latestTimestamp) {
          lastPolledTimestamp = data.latestTimestamp;
        }

        // ২. নতুন ডেটা নীরবে ফেচ করে ক্যাশে (Cache) যুক্ত করা, যাতে ভিজিটরের বর্তমান স্ক্রিন/পঠন অবস্থায় কোনো ঝাঁকুনি না হয়
        const newsRes = await fetch('/api/news?limit=25&offset=0');
        const newsData = await newsRes.json();

        if (newsData && newsData.success && Array.isArray(newsData.articles)) {
          // ইন-মেমোরি ক্যাশে তাৎক্ষণিকভাবে যুক্ত করা (ভিজিটরের বর্তমান ভিউ অক্ষুণ্ণ থাকে)
          newsData.articles.forEach(article => {
            if (article && article.id) {
              articlesCache.set(Number(article.id), article);
            }
          });
        }

        // ৩. আবহাওয়া ও মুদ্রার মান নীরবে কোনো রি-রেন্ডার ছাড়াই টেক্সট আপডেট করা
        if (typeof loadCurrencyAndWeather === 'function') {
          loadCurrencyAndWeather();
        }
      }
    } catch (err) {
      console.warn('[Background 10-min Refresh] Silent sync notice:', err);
    }
  }, BACKGROUND_REFRESH_INTERVAL_MS);
}

// BDVibe Theme Switcher (Default: Crisp Light, Toggle to Dark)
function initTheme() {
  const savedTheme = localStorage.getItem('bdvibe_theme') || localStorage.getItem('bdvibe_msn_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = '🌙';
  }

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      document.body.classList.toggle('light-theme', !isDark);
      document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('bdvibe_theme', isDark ? 'dark' : 'light');
      showToast(isDark ? 'ডার্ক মোড সক্রিয় করা হয়েছে' : 'লাইট মোড সক্রিয় করা হয়েছে');
    });
  }
}

// ==========================================================================
// Event Listeners & Live Search Engine
// ==========================================================================
function initEventListeners() {
  // Waffle Mega Menu Drawer
  const waffleBtn = document.getElementById('waffleMenuBtn');
  const closeWaffleBtn = document.getElementById('closeWaffleBtn');
  const waffleOverlay = document.getElementById('waffleDrawerOverlay');

  if (waffleBtn) waffleBtn.addEventListener('click', openWaffleDrawer);
  if (closeWaffleBtn) closeWaffleBtn.addEventListener('click', closeWaffleDrawer);
  if (waffleOverlay) {
    waffleOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'waffleDrawerOverlay') closeWaffleDrawer();
    });
  }

  // Live Instant Search Engine
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');
  const suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');
  const closeSuggestionsBtn = document.getElementById('closeSuggestionsBtn');

  if (searchInput) {
    let searchDebounce = null;

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const query = val.trim();

      if (searchClearBtn) {
        searchClearBtn.style.display = query ? 'inline-flex' : 'none';
      }

      clearTimeout(searchDebounce);
      if (!query) {
        if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
        return;
      }

      searchDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`/api/news/search-suggestions?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.success && data.suggestions && data.suggestions.length > 0) {
            renderSearchSuggestions(data.suggestions);
            if (suggestionsDropdown) suggestionsDropdown.style.display = 'block';
          } else {
            if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
          }
        } catch (err) {}
      }, 180);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
        state.search = searchInput.value.trim();
        executeSearch();
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClearBtn.style.display = 'none';
      if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
      state.search = '';
      resetToHome();
    });
  }

  if (searchSubmitBtn) {
    searchSubmitBtn.addEventListener('click', () => {
      if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
      const val = document.getElementById('searchInput').value.trim();
      state.search = val;
      executeSearch();
    });
  }

  if (closeSuggestionsBtn) {
    closeSuggestionsBtn.addEventListener('click', () => {
      if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
    });
  }

  // Click outside to dismiss search suggestions
  document.addEventListener('click', (e) => {
    const searchWrap = document.querySelector('.msn-search-wrap');
    if (searchWrap && !searchWrap.contains(e.target)) {
      if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
    }
  });

  // Reset Filter Button
  const resetBtn = document.getElementById('resetFilterBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetToHome);

  // Load More Button (Filtered View)
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (!state.isLoading && state.hasMore) {
        state.offset += state.limit;
        loadFilteredArticles(true);
      }
    });
  }

  // Load More Button (Home Dense Stream)
  const streamLoadMoreBtn = document.getElementById('streamLoadMoreBtn');
  if (streamLoadMoreBtn) {
    streamLoadMoreBtn.addEventListener('click', () => {
      if (!isStreamLoading && streamHasMore) {
        loadDenseStream(true);
      }
    });
  }

  // Manual Refresh Button
  const refreshBtn = document.getElementById('manualRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const icon = refreshBtn.querySelector('.spin-icon');
      if (icon) icon.classList.add('spinning');
      showToast('সব সোর্স থেকে সর্বশেষ কনটেন্ট রিফ্রেশ করা হচ্ছে...');
      try {
        await fetch('/api/news/refresh', { method: 'POST' });
        await Promise.all([
          loadHeroContent(),
          loadCategoriesSummary(),
          loadVideos(),
          loadSidebarData()
        ]);
        showToast('কনটেন্ট সফলভাবে আপডেট হয়েছে!');
      } catch (e) {
        showToast('কনটেন্ট আপডেট সম্পন্ন হয়েছে');
      } finally {
        if (icon) icon.classList.remove('spinning');
      }
    });
  }

  // Bookmarks Modal
  const savedModalBtn = document.getElementById('savedNewsModalBtn');
  if (savedModalBtn) savedModalBtn.addEventListener('click', openBookmarksModal);

  const closeBookmarksBtn = document.getElementById('closeBookmarksModalBtn');
  if (closeBookmarksBtn) closeBookmarksBtn.addEventListener('click', closeBookmarksModal);

  // Article Reader Modal
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeReaderModal);

  const modalOverlay = document.getElementById('articleReaderModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'articleReaderModal' || e.target.classList.contains('reader-modal-layout-wrapper')) {
        closeReaderModal();
      }
    });
  }

  const savedOverlay = document.getElementById('savedBookmarksModal');
  if (savedOverlay) {
    savedOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'savedBookmarksModal') closeBookmarksModal();
    });
  }

  // Close Billboard
  const closeBillboard = document.getElementById('closeBillboardBtn');
  if (closeBillboard) {
    closeBillboard.addEventListener('click', () => {
      const banner = document.getElementById('billboardAdContainer');
      if (banner) banner.style.display = 'none';
    });
  }

  // Modal Action Buttons
  const bookmarkBtn = document.getElementById('modalBookmarkBtn');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      if (state.activeArticle) toggleBookmark(state.activeArticle);
    });
  }

  const shareBtn = document.getElementById('modalShareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (state.activeArticle) {
        if (navigator.share) {
          navigator.share({
            title: state.activeArticle.title,
            url: state.activeArticle.link
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(state.activeArticle.link);
          showToast('কনটেন্টের লিংক কপি করা হয়েছে!');
        }
      }
    });
  }

  // Audio Text-to-Speech Reader
  let isSpeaking = false;
  const speakBtn = document.getElementById('modalSpeakBtn');
  if (speakBtn) {
    speakBtn.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) {
        showToast('আপনার ব্রাউজারে টেক্সট-টু-স্পিচ সুবিধা নেই');
        return;
      }
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        showToast('অডিও বন্ধ করা হয়েছে');
        return;
      }
      if (state.activeArticle) {
        const text = state.activeArticle.title + '. ' + (state.activeArticle.content || state.activeArticle.description || '');
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.onend = () => {
          isSpeaking = false;
          if (speakBtn) speakBtn.textContent = '🔊';
        };
        utter.onerror = () => {
          isSpeaking = false;
          if (speakBtn) speakBtn.textContent = '🔊';
        };
        window.speechSynthesis.speak(utter);
        isSpeaking = true;
        speakBtn.textContent = '⏹️';
        showToast('সংবাদ পাঠ শুরু হয়েছে...');
      }
    });
  }

  // Font Size Adjustment in Reader
  let currentFontSize = 1.12;
  const fontIncBtn = document.getElementById('modalFontIncBtn');
  const fontDecBtn = document.getElementById('modalFontDecBtn');
  const contentArea = document.getElementById('modalContent');
  if (fontIncBtn && contentArea) {
    fontIncBtn.addEventListener('click', () => {
      if (currentFontSize < 1.6) {
        currentFontSize += 0.1;
        contentArea.style.fontSize = `${currentFontSize}rem`;
      }
    });
  }
  if (fontDecBtn && contentArea) {
    fontDecBtn.addEventListener('click', () => {
      if (currentFontSize > 0.88) {
        currentFontSize -= 0.1;
        contentArea.style.fontSize = `${currentFontSize}rem`;
      }
    });
  }

  // Reading Progress Bar
  const modalBody = document.querySelector('.reader-modal-body');
  const progressBar = document.getElementById('readerProgressBar');
  if (modalBody && progressBar) {
    modalBody.addEventListener('scroll', () => {
      const scrollTotal = modalBody.scrollHeight - modalBody.clientHeight;
      if (scrollTotal > 0) {
        const pct = Math.min(100, Math.max(0, (modalBody.scrollTop / scrollTotal) * 100));
        progressBar.style.width = `${pct}%`;
      }
    });
  }

  // Hero Card Reaction Buttons
  const reactionsWrap = document.querySelector('.card-reactions');
  if (reactionsWrap) {
    reactionsWrap.addEventListener('click', (e) => {
      const badge = e.target.closest('.reaction-badge');
      if (badge) {
        const countSpan = badge.querySelector('.count');
        if (countSpan) {
          let count = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 100;
          count += 1;
          countSpan.textContent = toBengaliNumber(count);
          badge.style.transform = 'scale(1.25)';
          setTimeout(() => badge.style.transform = '', 250);
          showToast('আপনার প্রতিক্রিয়া যুক্ত হয়েছে! ❤️');
        }
      }
    });
  }

  // Global Keyboard Shortcuts (Ctrl+K to Search, Esc to Close)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const sInput = document.getElementById('searchInput');
      if (sInput) {
        sInput.focus();
        sInput.select();
      }
    }
    if (e.key === 'Escape') {
      if (isSpeaking && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (speakBtn) speakBtn.textContent = '🔊';
      }
      closeReaderModal();
      closeBookmarksModal();
      closeWaffleDrawer();
      if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
    }
  });
}

function renderSearchSuggestions(suggestions) {
  const list = document.getElementById('suggestionsList');
  if (!list) return;

  list.innerHTML = suggestions.map(item => `
    <div class="suggestion-item" onclick="handleCardClick(${item.id}); document.getElementById('searchSuggestionsDropdown').style.display='none';">
      <div class="suggestion-thumb">
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&q=80'}" alt="" loading="lazy">
      </div>
      <div class="suggestion-info">
        <span class="suggestion-source">${escapeHtml(item.source)} • ${CATEGORY_NAMES[item.category] || item.category}</span>
        <h6 class="suggestion-title">${escapeHtml(item.title)}</h6>
      </div>
    </div>
  `).join('');
}

function openWaffleDrawer() {
  document.getElementById('waffleDrawerOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWaffleDrawer() {
  document.getElementById('waffleDrawerOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function searchTopic(topic) {
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (searchInput) searchInput.value = topic;
  if (searchClearBtn) searchClearBtn.style.display = 'inline-flex';
  state.search = topic;
  executeSearch();
}

// LocalStorage reaction cache
const userReactions = JSON.parse(localStorage.getItem('bdvibe_reactions') || '{}');

function parseBengaliNumber(str) {
  if (!str) return 0;
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  const clean = String(str).replace(/[০-৯]/g, d => bnDigits.indexOf(d));
  return parseInt(clean.replace(/[^0-9]/g, '')) || 0;
}

// Interactive Reaction Click Handler (Like / Dislike with State Toggle & Live Counter Sync)
function reactToArticle(e, btn, type, articleId) {
  if (e) e.stopPropagation();

  // Find parent reaction group (card or modal footer)
  const group = btn.closest('.card-reactions-group') || btn.closest('.modal-footer-reactions') || btn.parentElement;
  const likeBtn = group ? (group.querySelector('.rx-like-btn') || group.querySelector('button[title*="পছন্দ"]:not([title*="অপছন্দ"])') || group.children[0]) : btn;
  const dislikeBtn = group ? (group.querySelector('.rx-dislike-btn') || group.querySelector('button[title*="অপছন্দ"]') || group.children[1]) : null;

  const countElem = likeBtn ? (likeBtn.querySelector('.rx-count') || likeBtn.querySelector('.count')) : null;
  let currentLikes = countElem ? parseBengaliNumber(countElem.textContent) : 120;

  const aId = articleId ? String(articleId) : (state.activeArticle ? String(state.activeArticle.id) : null);

  if (type === 'like') {
    if (btn.classList.contains('btn-liked')) {
      // Toggle OFF Like
      btn.classList.remove('btn-liked');
      if (countElem) {
        currentLikes = Math.max(0, currentLikes - 1);
        countElem.textContent = toBengaliNumber(currentLikes);
      }
      if (aId) delete userReactions[aId];
      showToast('লাইক প্রত্যাহার করা হয়েছে');
    } else {
      // Toggle ON Like
      btn.classList.add('btn-liked');
      btn.classList.add('pop-anim');
      setTimeout(() => btn.classList.remove('pop-anim'), 350);

      // If dislike was active, cancel dislike
      if (dislikeBtn && dislikeBtn.classList.contains('btn-disliked')) {
        dislikeBtn.classList.remove('btn-disliked');
      }

      if (countElem) {
        currentLikes += 1;
        countElem.textContent = toBengaliNumber(currentLikes);
      }
      if (aId) userReactions[aId] = 'like';
      showToast('লাইক দিয়েছেন 👍');
    }
  } else if (type === 'dislike') {
    if (btn.classList.contains('btn-disliked')) {
      // Toggle OFF Dislike
      btn.classList.remove('btn-disliked');
      if (aId) delete userReactions[aId];
      showToast('অপছন্দ প্রত্যাহার করা হয়েছে');
    } else {
      // Toggle ON Dislike
      btn.classList.add('btn-disliked');
      btn.classList.add('pop-anim');
      setTimeout(() => btn.classList.remove('pop-anim'), 350);

      // If like was active, cancel like and decrement
      if (likeBtn && likeBtn.classList.contains('btn-liked')) {
        likeBtn.classList.remove('btn-liked');
        if (countElem) {
          currentLikes = Math.max(0, currentLikes - 1);
          countElem.textContent = toBengaliNumber(currentLikes);
        }
      }
      if (aId) userReactions[aId] = 'dislike';
      showToast('অপছন্দ চিহ্নিত করা হয়েছে 👎');
    }
  }

  // Also sync matching open modal buttons if present
  if (aId && state.activeArticle && String(state.activeArticle.id) === aId) {
    const mLike = document.getElementById('modalLikeBtn');
    const mDislike = document.getElementById('modalDislikeBtn');
    const mCount = document.getElementById('modalLikeCount');
    if (mLike && mLike !== btn) mLike.classList.toggle('btn-liked', userReactions[aId] === 'like');
    if (mDislike && mDislike !== btn) mDislike.classList.toggle('btn-disliked', userReactions[aId] === 'dislike');
    if (mCount && countElem) mCount.textContent = countElem.textContent;
  }

  // Sync to localStorage
  try {
    localStorage.setItem('bdvibe_reactions', JSON.stringify(userReactions));
  } catch (err) {}
}

// ==========================================================================
// 1. MSN Hero Content (Mega Lead + Sub-Leads + Trending)
// ==========================================================================
async function loadHeroContent() {
  try {
    const res = await fetch('/api/news/hero');
    const data = await res.json();

    if (data.success) {
      renderMegaLead(data.lead);
      renderSubLeads(data.subLeads);
      renderTrending(data.trending);
    }
  } catch (err) {
    console.error('Failed to load hero content:', err);
  }
}

function renderMegaLead(article) {
  if (!article) return;
  const leadCard = document.getElementById('heroLeadCard');
  const imgElem = document.getElementById('heroLeadImage');
  const catElem = document.getElementById('heroLeadCategory');
  const sourceElem = document.getElementById('heroLeadSource');
  const sourceAvatar = document.getElementById('heroLeadSourceAvatar');
  const titleElem = document.getElementById('heroLeadTitle');
  const descElem = document.getElementById('heroLeadDesc');
  const timeElem = document.getElementById('heroLeadTime');

  if (imgElem) {
    imgElem.src = article.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80';
    imgElem.alt = article.title;
  }
  if (catElem) catElem.textContent = CATEGORY_NAMES[article.category] || 'প্রচ্ছদ';
  if (sourceElem) sourceElem.textContent = article.source;
  if (sourceAvatar) sourceAvatar.textContent = (article.source || 'বি').charAt(0);
  if (titleElem) titleElem.textContent = article.title;
  if (descElem) descElem.textContent = article.description || '';
  if (timeElem) timeElem.textContent = formatRelativeTimeBn(article.timestamp);

  if (leadCard) {
    leadCard.onclick = () => openReaderModal(article);
  }

  const bookmarkBtn = document.getElementById('heroLeadBookmarkBtn');
  if (bookmarkBtn) {
    bookmarkBtn.onclick = (e) => {
      e.stopPropagation();
      toggleBookmark(article);
    };
  }
}

function renderSubLeads(subLeads) {
  const container = document.getElementById('heroSubGrid');
  if (!container || !subLeads || subLeads.length === 0) return;

  container.innerHTML = subLeads.map(item => {
    const isTV = (item.source && (item.source.includes('টিভি') || item.source.includes('TV') || item.source.includes('সময়') || item.source.includes('চ্যানেল') || item.source.includes('ডিবিসি') || item.source.includes('একাত্তর')));
    const initial = (item.source || 'বি').charAt(0);
    let cleanSnippet = item.description || (item.content ? item.content.slice(0, 110) + '...' : '');
    if (cleanSnippet.startsWith(item.title)) {
      cleanSnippet = cleanSnippet.slice(item.title.length).replace(/^[\s—–:-]+/, '').trim();
    }
    const snippet = cleanSnippet;
    return `
      <article class="msn-news-card card-span-1 ${isTV ? 'card-type-video' : 'card-type-news'}" onclick="handleCardClick(${item.id})">
        <div class="card-media">
          <img src="${item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&q=80'}" alt="${escapeHtml(item.title)}" loading="lazy">
          <span class="card-badge ${isTV ? 'badge-video' : ''}">${isTV ? 'ভিডিও' : (CATEGORY_NAMES[item.category] || 'সংবাদ')}</span>
          ${isTV ? `
            <div class="video-play-overlay">
              <span class="play-icon-circle">▶</span>
            </div>
            <span class="card-duration-badge">▶ ০৩:${toBengaliNumber(10 + (item.id % 50))}</span>
          ` : ''}
        </div>
        <div class="card-content">
          <div class="card-header-meta">
            <span class="publisher-name">${escapeHtml(item.source)}</span>
            <span class="dot-separator">•</span>
            <span class="time-published">${formatRelativeTimeBn(item.timestamp)}</span>
          </div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          ${snippet ? `<p class="card-snippet">${escapeHtml(snippet)}</p>` : ''}
          <div class="card-footer">
            <div class="publisher-icon-wrapper">
              <span class="publisher-logo-circle ${isTV ? 'logo-video' : ''}">${initial}</span>
              <span class="source-tag">${escapeHtml(item.source)}</span>
            </div>
            <div class="card-actions">
              <button class="action-btn" title="লাইক" onclick="event.stopPropagation(); reactToArticle(event, this, 'like');">👍</button>
              <button class="action-btn" title="সংরক্ষণ" onclick="event.stopPropagation(); toggleBookmark(${JSON.stringify(item).replace(/"/g, '&quot;')});">🔖</button>
              <button class="action-btn" title="আরও" onclick="event.stopPropagation(); showToast('সংবাদ আইডি: ${item.id}');">•••</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  window.currentSubLeads = subLeads;
}

function renderTrending(trendingList) {
  const container = document.getElementById('trendingList');
  if (!container || !trendingList) return;

  container.innerHTML = trendingList.map((item, idx) => `
    <li class="ranking-item" onclick="handleCardClick(${item.id})">
      <span class="rank-number">${toBengaliNumber(idx + 1)}</span>
      <div class="ranking-content">
        <h5 class="ranking-title">${escapeHtml(item.title)}</h5>
        <div class="ranking-meta">
          <span class="source-pill">${escapeHtml(item.source)}</span>
          <span>•</span>
          <span>${formatRelativeTimeBn(item.timestamp)}</span>
        </div>
      </div>
    </li>
  `).join('');

  window.currentTrending = trendingList;
}

// ==========================================================================
// 2. MSN Continuous Dense Stream (Zero Gaps + Native Test Ads Insertion)
// ==========================================================================
let streamOffset = 0;
const STREAM_LIMIT = 24;
let isStreamLoading = false;
let streamHasMore = true;

const TEST_ADS_POOL = [
  {
    sponsor: 'বিকাশ লিমিটেড',
    title: 'বিকাশ অ্যাপে সেন্ড মানি সম্পূর্ণ ফ্রি! আজই দারুণ ক্যাশব্যাক অফার উপভোগ করুন',
    description: 'দেশের যে কোনো প্রান্তে মুহূর্তেই টাকা পাঠান নিশ্চিন্তে ও নিরাপদে। মার্চেন্ট পেমেন্টে ক্যাশব্যাক অফার!',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80',
    link: 'https://www.bkash.com',
    cta: 'অফার দেখুন →',
    span2: false
  },
  {
    sponsor: 'দারাজ বাংলাদেশ',
    title: 'দারাজ গ্র্যান্ড সুপার সেল — স্মার্টফোন ও ইলেকট্রনিক্সে ৬০% পর্যন্ত মেগা ছাড়!',
    description: 'সেরা ব্র্যান্ডের গ্যাজেট ফ্রি ডেলিভারি, ব্র্যান্ড ওয়ারেন্টি ও ভাউচার ডিসকাউন্টে আজই সংগ্রহ করুন।',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
    link: 'https://www.daraz.com.bd',
    cta: 'শপিং করুন ↗',
    span2: true
  },
  {
    sponsor: 'গ্রামীণফোন ৪জি/৫জি',
    title: 'দেশজুড়ে সুপারফাস্ট ইন্টারনেট ও মাইজিপি বোনাস ডাটা প্যাক',
    description: 'সর্বোচ্চ স্পিড ও আনলিমিটেড মেয়াদের আকর্ষণীয় ডাটা প্যাক। সাথে পাচ্ছেন বিশেষ রিচার্জ বোনাস।',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&q=80',
    link: 'https://www.grameenphone.com',
    cta: 'প্যাক কিনুন →',
    span2: false
  },
  {
    sponsor: 'বিডি ক্লাউড প্রো',
    title: 'বিজনেস ওয়েবসাইট ও হাই-স্পিড এনভিএমই এসএসডি হোস্টিং — ৫০% মেগা ছাড়',
    description: 'ফ্রি ডোমেইন, আনলিমিটেড ব্যান্ডউইডথ ও ২৪/৭ বাংলা লাইভ টেকনিক্যাল সাপোর্ট। আজই শুরু করুন।',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    link: '#',
    cta: 'হোস্টিং নিন ↗',
    span2: true
  },
  {
    sponsor: 'স্যামসাং বাংলাদেশ',
    title: 'স্যামসাং গ্যালাক্সি আল্ট্রা — প্রি-অর্ডারে ফ্রি ওয়্যারলেস বাডস ও আকর্ষণীয় সুবিধা',
    description: 'অসাধারণ ক্যামেরা ও এআই ফিচারে ভরপুর নতুন ফ্ল্যাগশিপ স্মার্টফোন। আজই প্রি-বুক করুন।',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
    link: '#',
    cta: 'প্রি-অর্ডার ↗',
    span2: false
  },
  {
    sponsor: 'স্কিল একাডেমি বাংলাদেশ',
    title: 'আধুনিক ফুল স্ট্যাক ওয়েব ও পাইথন এআই ক্যারিয়ার বুটক্যাম্প — ভর্তি চলছে',
    description: 'দেশের শীর্ষস্থানীয় সফটওয়্যার ইঞ্জিনিয়ারদের সরাসরি নির্দেশনায় প্রজেক্ট-ভিত্তিক লাইভ প্রশিক্ষণ।',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
    link: '#',
    cta: 'ভর্তি হোন →',
    span2: true
  }
];

// Clean Single Source Name (No duplicate English in brackets, e.g. "এটিএন নিউজ (ATN News)" -> "এটিএন নিউজ")
function cleanSourceName(name) {
  if (!name) return 'সংবাদ';
  return String(name).replace(/\s*\([^)]*\)/g, '').trim();
}

function getPubColorClass(source) {
  if (!source) return '';
  const s = cleanSourceName(source);
  if (s.includes('প্রথম আলো') || s.includes('বিবিসি') || s.includes('সময়')) return 'pub-red';
  if (s.includes('সমকাল') || s.includes('কালের কণ্ঠ')) return 'pub-green';
  if (s.includes('যুগান্তর') || s.includes('ইত্তেফাক')) return 'pub-orange';
  if (s.includes('চ্যানেল') || s.includes('ডিবিসি')) return 'pub-purple';
  return '';
}

function isValidVideoId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

function handleMediaError(img) {
  const card = img.closest('.msn-news-card') || img.closest('.video-rail-card');
  if (card && (card.classList.contains('card-type-video') || (img.src && img.src.includes('ytimg.com')))) {
    // If live video media is unavailable, remove card completely
    card.remove();
  }
}

function handleMediaLoad(img) {
  // YouTube returns 120x90 placeholder when video is deleted or unavailable
  if (img.naturalWidth === 120 && img.naturalHeight === 90 && (img.src && (img.src.includes('ytimg.com') || img.src.includes('youtube')))) {
    const card = img.closest('.msn-news-card') || img.closest('.video-rail-card');
    if (card) {
      card.remove();
    }
  }
}

// Global listener for YouTube iframe embed errors
window.addEventListener('message', (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data && (data.event === 'onError' || data.info === 100 || data.info === 101 || data.info === 150)) {
      const videoWrapper = document.getElementById('modalVideoWrapper');
      const imageViewport = document.getElementById('modalImageViewport');
      if (videoWrapper) videoWrapper.style.display = 'none';
      if (imageViewport) imageViewport.style.display = 'block';
      showToast('ভিডিওটি এই মুহূর্তে অনুপলব্ধ।');
    }
  } catch (e) {}
});

function getCardVideoId(item) {
  if (!item) return null;
  if (isValidVideoId(item.video_id)) return item.video_id;
  if (isValidVideoId(item.youtubeId)) return item.youtubeId;
  if (item.guid && item.guid.startsWith('tv-')) {
    const candidate = item.guid.replace('tv-', '');
    if (isValidVideoId(candidate)) return candidate;
  }
  if (item.image_url) {
    const m = item.image_url.match(/\/vi\/([a-zA-Z0-9_-]{11})/);
    if (m && isValidVideoId(m[1])) return m[1];
  }
  if (item.link) {
    const m = item.link.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m && isValidVideoId(m[1])) return m[1];
  }
  if (item.content) {
    const m = item.content.match(/(?:embed\/|v=)([a-zA-Z0-9_-]{11})/);
    if (m && isValidVideoId(m[1])) return m[1];
  }
  return null;
}

function handleVideoCardHover(cardEl, isHover) {
  const mediaEl = cardEl.querySelector('.card-media') || cardEl.querySelector('.video-rail-thumb');
  if (!mediaEl) return;
  const videoId = cardEl.getAttribute('data-video-id');
  if (!videoId || !isValidVideoId(videoId)) return;

  if (isHover) {
    if (!mediaEl.querySelector('.hover-video-preview')) {
      const iframe = document.createElement('iframe');
      iframe.className = 'hover-video-preview';
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&loop=1&playlist=${videoId}`;
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('loading', 'eager');
      mediaEl.appendChild(iframe);
    }
  } else {
    const existing = mediaEl.querySelector('.hover-video-preview');
    if (existing) {
      existing.remove();
    }
  }
}

function renderNewsCard(item, isSpan2 = false) {
  if (!item || !item.title) return '';

  const cleanTitle = (item.title || '').trim();
  const rawSnippet = (item.description || item.content || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s*(?:বিস্তারিত|আরও পড়ুন|পড়ুন)\s*$/gi, '')
    .trim();

  // Strict Authenticity & Clarity Filter: Always avoid vague or unphraseable news
  if (cleanTitle.length < 18) return '';
  if (/Executive summary/i.test(cleanTitle) || /accessible\)/i.test(cleanTitle) || /বিজ্ঞপ্তি/i.test(cleanTitle)) {
    return '';
  }
  const videoId = getCardVideoId(item);
  if (!videoId && rawSnippet.length < 40) {
    return ''; // Discard if news cannot be phrased properly
  }

  const cleanSource = cleanSourceName(item.source);
  const isLiveItem = Boolean(videoId && (item.category === 'live' || (cleanTitle && (cleanTitle.includes('সরাসরি') || cleanTitle.includes('লাইভ') || cleanTitle.toLowerCase().includes('live')))));
  const isTV = Boolean(videoId);
  const isAudio = (!isTV && cleanSource.includes('বিবিসি'));
  const initial = cleanSource.charAt(0);
  const pubColor = getPubColorClass(cleanSource);

  // If in live category and no valid video is available, don't render
  if (state.category === 'live' && !videoId) {
    return '';
  }

  // Check stored user reaction
  const aId = String(item.id);
  const userReaction = userReactions[aId];
  const isLiked = userReaction === 'like';
  const isDisliked = userReaction === 'dislike';
  const baseLikes = 60 + ((item.id * 17) % 850) + (isLiked ? 1 : 0);
  const likesCount = toBengaliNumber(baseLikes);

  // Strict Heading and Sub-Heading Duplication Prevention:
  let cleanSnippet = rawSnippet;
  if (cleanSnippet.startsWith(cleanTitle)) {
    cleanSnippet = cleanSnippet.slice(cleanTitle.length).replace(/^[\s—–:-]+/, '').trim();
  }
  if (cleanSnippet.toLowerCase() === cleanTitle.toLowerCase() || cleanSnippet.length < 15) {
    cleanSnippet = isTV ? `${cleanSource}-এর বিশেষ সরাসরি সম্প্রচার ও সর্বশেষ ভিডিও প্রতিবেদন।` : '';
  }

  const snippet = cleanSnippet ? (cleanSnippet.length > 85 ? cleanSnippet.slice(0, 85) + '...' : cleanSnippet) : '';

  return `
    <article class="msn-news-card ${isSpan2 ? 'card-span-2' : 'card-span-1'} ${isTV ? 'card-type-video' : isAudio ? 'card-type-audio' : 'card-type-news'}"
             ${isTV ? `data-video-id="${videoId}" onmouseenter="handleVideoCardHover(this, true)" onmouseleave="handleVideoCardHover(this, false)"` : ''}
             onclick="handleCardClick(${item.id})">
      <div class="card-media">
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&q=80'}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="handleMediaError(this)" onload="handleMediaLoad(this)">
        ${isLiveItem ? `
          <div class="video-play-overlay">
            <span class="play-icon-circle">▶</span>
          </div>
          <span class="card-duration-badge badge-live-pulse"><span class="live-pulse-dot-sm"></span> লাইভ সম্প্রচার</span>
        ` : isTV ? `
          <div class="video-play-overlay">
            <span class="play-icon-circle">▶</span>
          </div>
          <span class="card-duration-badge">▶ ০৩:${toBengaliNumber(10 + (item.id % 50))}</span>
        ` : isAudio ? `
          <span class="card-duration-badge">🎧 ০২:${toBengaliNumber(15 + (item.id % 40))}</span>
        ` : ''}
      </div>

      <div class="card-content">
        <div class="card-header-meta">
          <span class="pub-avatar-pill ${pubColor}">${initial}</span>
          <span class="publisher-name">${escapeHtml(cleanSource)}</span>
          <span class="dot-separator">•</span>
          <span class="time-published">${isLiveItem ? 'সরাসরি সম্প্রচার' : formatRelativeTimeBn(item.timestamp)}</span>
        </div>

        <h3 class="card-title">${escapeHtml(cleanTitle)}</h3>
        ${snippet ? `<p class="card-snippet">${escapeHtml(snippet)}</p>` : ''}

        <div class="card-footer">
          <div class="card-reactions-group">
            <button class="rx-btn rx-like-btn ${isLiked ? 'btn-liked' : ''}" title="পছন্দ" onclick="reactToArticle(event, this, 'like', ${item.id});">
              👍 <span class="rx-count">${likesCount}</span>
            </button>
            <button class="rx-btn rx-dislike-btn ${isDisliked ? 'btn-disliked' : ''}" title="অপছন্দ" onclick="reactToArticle(event, this, 'dislike', ${item.id});">
              👎
            </button>
          </div>
          <div class="card-actions-right">
            <button class="rx-btn-icon" title="সংরক্ষণ" onclick="event.stopPropagation(); toggleBookmark(${JSON.stringify(item).replace(/"/g, '&quot;')});">🔖</button>
            <button class="rx-btn-icon" title="আরও" onclick="event.stopPropagation(); showToast('সংবাদ আইডি: ${item.id}');">•••</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderTestAdCard(ad, isSpan2 = false) {
  const initial = (ad.sponsor || 'ব').charAt(0);
  return `
    <article class="msn-news-card card-type-ad ${isSpan2 ? 'card-span-2' : 'card-span-1'}" onclick="window.open('${ad.link}', '_blank')">
      <div class="card-media">
        <img src="${ad.image}" alt="${escapeHtml(ad.title)}" loading="lazy">
        <span class="card-badge badge-ad">📢 টেস্ট অ্যাড</span>
      </div>
      <div class="card-content">
        <div class="card-header-meta">
          <span class="pub-avatar-pill sponsor-avatar">${initial}</span>
          <span class="publisher-name sponsor-name">${escapeHtml(ad.sponsor)}</span>
          <span class="dot-separator">•</span>
          <span class="time-published sponsor-tag">টেস্ট অ্যাড</span>
        </div>
        <h3 class="card-title">${escapeHtml(ad.title)}</h3>
        <div class="card-footer">
          <span class="ad-cta-link" style="color: #0078d4; font-weight: 600; font-size: 12.5px;">${escapeHtml(ad.cta)}</span>
          <button class="rx-btn-icon" title="বিজ্ঞাপন তথ্য" onclick="event.stopPropagation(); showToast('এটি একটি টেস্ট বিজ্ঞাপন');">•••</button>
        </div>
      </div>
    </article>
  `;
}

function renderTopStoriesWidget(stories) {
  const defaultStories = [
    { id: 1, source: 'প্রথম আলো', title: 'বিপিএল টি-২০ আসরে তরুণদের দুর্দান্ত সূচনা', timestamp: Date.now() - 3600000 },
    { id: 2, source: 'সমকাল', title: 'রিজার্ভ আবারও বৃদ্ধি পেয়ে ২০ বিলিয়ন ছাড়িয়েছে', timestamp: Date.now() - 7200000 },
    { id: 3, source: 'যুগান্তর', title: 'প্রধান উপদেষ্টার সঙ্গে বিশ্বব্যাংক প্রতিনিধির ফলপ্রসূ বৈঠক', timestamp: Date.now() - 10800000 },
    { id: 4, source: 'কালের কণ্ঠ', title: 'আন্তর্জাতিক বাজারে জ্বালানি তেলের দামে বড় পতন', timestamp: Date.now() - 14400000 }
  ];

  let topItems = (stories && stories.length >= 4) ? stories.slice(0, 4) : defaultStories;
  if (topItems.length < 4) {
    topItems = topItems.concat(defaultStories.slice(topItems.length, 4));
  }

  return `
    <div class="msn-widget-card widget-top-stories">
      <div class="widget-card-header">
        <div class="widget-header-title">
          <span style="color: #ea580c;">🔥</span>
          <strong>শীর্ষ খবর</strong>
        </div>
        <button class="rx-btn-icon" title="মেনু">•••</button>
      </div>
      <div class="top-stories-list">
        ${topItems.map(item => {
          const sName = cleanSourceName(item.source);
          return `
          <div class="widget-story-item" onclick="handleCardClick(${item.id || 0})">
            <div class="widget-story-meta">
              <span class="pub-avatar-pill ${getPubColorClass(sName)}" style="width: 14px; height: 14px; font-size: 8px;">${sName.charAt(0)}</span>
              <strong>${escapeHtml(sName)}</strong>
              <span>•</span>
              <span>${formatRelativeTimeBn(item.timestamp)}</span>
            </div>
            <h4 class="widget-story-title">${escapeHtml(item.title)}</h4>
          </div>
        `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderSportsWidget() {
  return `
    <div class="msn-widget-card widget-sports-scores">
      <div class="widget-card-header">
        <div class="widget-header-title">
          <span style="color: #0078d4;">🏏</span>
          <strong>লাইভ ক্রিকেট ও স্কোর</strong>
        </div>
        <span class="match-badge live">LIVE</span>
      </div>
      <div class="sports-matches-list">
        <div class="match-row">
          <div class="team-info">
            <span>🇿🇦</span>
            <span>SA</span>
            <span class="score">৪১৩/৭</span>
          </div>
          <span class="match-badge live">LIVE</span>
          <div class="team-info">
            <span>🇦🇺</span>
            <span>AUS</span>
            <span class="score-sub">ফিল্ডিং</span>
          </div>
        </div>

        <div class="match-row">
          <div class="team-info">
            <span>🇵🇰</span>
            <span>PAK</span>
            <span class="score">৩০২/৯</span>
          </div>
          <span class="match-badge live">LIVE</span>
          <div class="team-info">
            <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
            <span>ENG</span>
            <span class="score">১৯৭/৬</span>
          </div>
        </div>

        <div class="match-row">
          <div class="team-info">
            <span>🇮🇳</span>
            <span>IND</span>
            <span class="score">২৪৫/৪</span>
          </div>
          <span class="match-badge live">LIVE</span>
          <div class="team-info">
            <span>🇳🇿</span>
            <span>NZ</span>
            <span class="score-sub">বোলিং</span>
          </div>
        </div>

        <div class="match-row">
          <div class="team-info">
            <span>🇧🇩</span>
            <span>BAN</span>
          </div>
          <span class="match-time">কাল ৫:৩০ PM</span>
          <div class="team-info">
            <span>🇦🇫</span>
            <span>AFG</span>
          </div>
        </div>
      </div>
      <a href="#" class="widget-footer-link" onclick="filterByCategory('sports'); return false;">আরও ক্রিকেট ও স্পোর্টস →</a>
    </div>
  `;
}

function renderWeatherWidget(weather) {
  const temp = (weather && weather.temp) ? weather.temp : '২৯°';
  const city = (weather && weather.city) ? weather.city : 'ঢাকা বিভাগ';
  const condition = (weather && weather.condition) ? weather.condition : 'আংশিক মেঘলা';

  return `
    <div class="msn-widget-card widget-weather">
      <div class="widget-card-header">
        <div class="widget-header-title">
          <span style="color: #0078d4;">📍</span>
          <strong>${escapeHtml(city)}</strong>
        </div>
        <button class="rx-btn-icon" title="মেনু">•••</button>
      </div>
      <div class="weather-main-row">
        <div class="weather-big-temp">${temp}<span>C</span></div>
        <div class="weather-main-icon">⛅</div>
      </div>
      <div class="weather-cond-desc">${escapeHtml(condition)} • আর্দ্রতা ৬২%</div>
      <div class="weather-week-forecast">
        <div class="forecast-col"><span>আজ</span><div class="fc-icon">☀️</div><strong>৩২°</strong><small>২৩°</small></div>
        <div class="forecast-col"><span>কাল</span><div class="fc-icon">⛅</div><strong>৩১°</strong><small>২২°</small></div>
        <div class="forecast-col"><span>বুধ</span><div class="fc-icon">🌧️</div><strong>২৯°</strong><small>২১°</small></div>
        <div class="forecast-col"><span>বৃহঃ</span><div class="fc-icon">⛅</div><strong>৩০°</strong><small>২২°</small></div>
        <div class="forecast-col"><span>শুক্র</span><div class="fc-icon">☀️</div><strong>৩১°</strong><small>২৩°</small></div>
      </div>
    </div>
  `;
}

let adPoolIndex = 0;
function getNextTestAd(forceSpan2 = false) {
  const ad = TEST_ADS_POOL[adPoolIndex % TEST_ADS_POOL.length];
  adPoolIndex++;
  return renderTestAdCard(ad, forceSpan2);
}

// Global Sets to Guarantee 100% Zero-Duplication across the Entire Website
const renderedArticleIds = new Set();
const renderedArticleTitles = new Set();

function normalizeTitleKey(t) {
  if (!t) return '';
  return t
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[|–—\-\[\]\(\)'"‘’“”\s]/g, '')
    .trim()
    .toLowerCase();
}

function deduplicateAndDiversify(rawArticles) {
  const unique = [];
  for (const item of rawArticles) {
    if (!item || !item.id || !item.title) continue;
    const idKey = Number(item.id);
    const titleKey = normalizeTitleKey(item.title);

    // Skip if already rendered anywhere on the current page
    if (renderedArticleIds.has(idKey) || renderedArticleTitles.has(titleKey)) {
      continue;
    }

    renderedArticleIds.add(idKey);
    renderedArticleTitles.add(titleKey);
    unique.push(item);
  }

  // Source Diversity: prevent 3 consecutive cards from the exact same channel/newspaper
  const diversified = [];
  const backlog = [...unique];
  let lastSource = '';
  let sameSourceCount = 0;

  while (backlog.length > 0) {
    let pickIdx = -1;
    for (let i = 0; i < backlog.length; i++) {
      const src = backlog[i].source || '';
      if (src !== lastSource || sameSourceCount < 2) {
        pickIdx = i;
        break;
      }
    }
    if (pickIdx === -1) pickIdx = 0;

    const chosen = backlog.splice(pickIdx, 1)[0];
    const src = chosen.source || '';
    if (src === lastSource) {
      sameSourceCount++;
    } else {
      lastSource = src;
      sameSourceCount = 1;
    }
    diversified.push(chosen);
  }

  return diversified;
}

function renderDenseCards(rawArticles, isFirstBatch = false) {
  const articles = deduplicateAndDiversify(rawArticles);
  let cardsHtml = '';

  if (isFirstBatch && articles.length >= 7) {
    // Row 1: 1 Span-2 Featured Card + 2 Standard News Cards (Total: 4 columns)
    cardsHtml += renderNewsCard(articles[0], true);
    cardsHtml += renderNewsCard(articles[1], false);
    cardsHtml += renderNewsCard(articles[2], false);

    // Row 2: Top Stories Widget (4 stories) + Test Ad + Standard News + Weather Widget (Total: 4 columns)
    cardsHtml += renderTopStoriesWidget(articles.slice(1, 5));
    cardsHtml += renderTestAdCard(TEST_ADS_POOL[0], false);
    cardsHtml += renderNewsCard(articles[3], false);
    cardsHtml += renderWeatherWidget(state.weather);

    // Row 3: Video News Card + Standard News + Standard News + Cricket Scores Widget (4 matches) (Total: 4 columns)
    cardsHtml += renderNewsCard(articles[4], false);
    cardsHtml += renderNewsCard(articles[5], false);
    cardsHtml += renderNewsCard(articles[6], false);
    cardsHtml += renderSportsWidget();

    // Row 4 onwards: Render remaining articles with seamless ad interleaving (every 7 cards + 1 ad = 8 items = 2 complete rows)
    const remaining = articles.slice(7);
    remaining.forEach((item, idx) => {
      cardsHtml += renderNewsCard(item, false);
      if ((idx + 1) % 7 === 0) {
        cardsHtml += getNextTestAd(false);
      }
    });
  } else {
    // Normal / Subsequent batches / Category filtering: Clean rows of 4 cards
    articles.forEach((item, idx) => {
      cardsHtml += renderNewsCard(item, false);
      if ((idx + 1) % 7 === 0) {
        cardsHtml += getNextTestAd(false);
      }
    });
  }

  return cardsHtml;
}

async function loadDenseStream(append = false) {
  if (isStreamLoading) return;
  isStreamLoading = true;

  if (!append) {
    renderedArticleIds.clear();
    renderedArticleTitles.clear();
  }

  const btn = document.getElementById('streamLoadMoreBtn');
  if (btn) {
    btn.innerHTML = '<span class="loading-spinner">↻</span> নতুন সংবাদ ও ভিডিও স্বয়ংক্রিয়ভাবে লোড হচ্ছে...';
  }

  try {
    let url = `/api/news?limit=${STREAM_LIMIT}&offset=${streamOffset}`;
    if (state.category && state.category !== 'all') {
      url += `&category=${state.category}`;
    }
    if (state.search) {
      url += `&search=${encodeURIComponent(state.search)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.articles) {
      data.articles.forEach(a => articlesCache.set(Number(a.id), a));
      const container = document.getElementById('mainDenseStreamGrid');
      if (container) {
        const isFirstBatch = !append && (!state.category || state.category === 'all') && !state.search;
        const html = renderDenseCards(data.articles, isFirstBatch);
        if (append) {
          container.insertAdjacentHTML('beforeend', html);
        } else {
          container.innerHTML = html;
        }
      }
      streamOffset += data.articles.length;
      streamHasMore = data.hasMore;
    }
  } catch (err) {
    console.error('Failed to load dense stream:', err);
  } finally {
    isStreamLoading = false;
    if (btn) {
      btn.innerHTML = streamHasMore ? 'আরও সংবাদ ও ভিডিও লোড হচ্ছে... (স্ক্রোল করুন) ↓' : 'সব খবর প্রদর্শিত হয়েছে ✓';
      btn.style.display = streamHasMore ? 'inline-block' : 'none';
    }
  }
}

// ==========================================================================
// Infinite Scroll Engine (Auto-fetch when scrolling near bottom)
// ==========================================================================
let infiniteScrollInitialized = false;
function initInfiniteScroll() {
  if (infiniteScrollInitialized) return;
  infiniteScrollInitialized = true;

  const loadMoreBtn = document.getElementById('streamLoadMoreBtn');
  if (!loadMoreBtn) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && streamHasMore && !isStreamLoading) {
          loadDenseStream(true);
        }
      });
    }, {
      rootMargin: '450px 0px', // Auto-load 450px before reaching bottom
      threshold: 0.05
    });

    observer.observe(loadMoreBtn);
  }

  // Backup scroll event listener for seamless auto-update
  window.addEventListener('scroll', () => {
    if (streamHasMore && !isStreamLoading) {
      const scrollPos = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 600;
      if (scrollPos >= threshold) {
        loadDenseStream(true);
      }
    }
  }, { passive: true });
}

// ==========================================================================
// 3. Video & Visual Media Hub (Auto Ingestion Engine)
// ==========================================================================
async function loadVideos() {
  try {
    const res = await fetch('/api/videos');
    const data = await res.json();

    if (data.success && data.videos) {
      state.videosList = data.videos;
      renderVideoPlaylist(data.videos);
      if (data.videos.length > 0) {
        selectVideo(data.videos[0]);
      }
    }
  } catch (err) {
    console.error('Failed to load videos:', err);
  }
}

function renderVideoPlaylist(videos) {
  const container = document.getElementById('videoPlaylistList');
  if (!container) return;

  container.innerHTML = videos.map((v, idx) => {
    const vidId = v.video_id || v.videoId || '';
    return `
    <div class="video-rail-card ${idx === 0 ? 'active' : ''}" 
         data-video-id="${vidId}"
         onmouseenter="handleVideoCardHover(this, true)" 
         onmouseleave="handleVideoCardHover(this, false)"
         onclick="selectVideoByIndex(${idx})">
      <div class="video-rail-thumb card-media">
        <img src="${v.thumbnail}" alt="${escapeHtml(v.title)}" loading="lazy">
        <span class="video-duration-tag">${v.duration || 'ভিডিও'}</span>
      </div>
      <div class="video-rail-details">
        <span class="rail-channel-name">${escapeHtml(v.channel)}</span>
        <h5 class="rail-video-title">${escapeHtml(v.title)}</h5>
      </div>
    </div>
  `;
  }).join('');
}

function selectVideoByIndex(idx) {
  const video = state.videosList[idx];
  if (video) {
    selectVideo(video);
    document.querySelectorAll('.video-rail-card').forEach((item, i) => {
      item.classList.toggle('active', i === idx);
    });
  }
}

function selectVideo(video) {
  state.activeVideo = video;
  const iframe = document.getElementById('mainVideoIframe');
  const title = document.getElementById('activeVideoTitle');
  const channel = document.getElementById('activeVideoChannel');

  if (iframe) iframe.src = video.embed_url || video.embedUrl;
  if (title) title.textContent = video.title;
  if (channel) channel.textContent = video.channel;
}

// ==========================================================================
// 4. Filtered Articles Stream (Category / Source / Search)
// ==========================================================================
function filterByCategory(categoryKey) {
  state.category = categoryKey;
  state.search = '';
  streamOffset = 0;
  streamHasMore = true;
  renderedArticleIds.clear();
  renderedArticleTitles.clear();

  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.style.display = 'none';

  // Update active nav tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.cat === categoryKey);
  });

  const filterBanner = document.getElementById('filterStatusBanner');
  const filterStatusTitle = document.getElementById('filterStatusTitle');

  if (categoryKey === 'all') {
    if (filterBanner) filterBanner.style.display = 'none';
  } else {
    if (filterBanner) filterBanner.style.display = 'flex';
    if (filterStatusTitle) filterStatusTitle.textContent = `ক্যাটাগরি: ${CATEGORY_NAMES[categoryKey] || categoryKey}`;
  }

  loadDenseStream(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function executeSearch() {
  streamOffset = 0;
  streamHasMore = true;
  renderedArticleIds.clear();
  renderedArticleTitles.clear();

  const filterBanner = document.getElementById('filterStatusBanner');
  const filterStatusTitle = document.getElementById('filterStatusTitle');

  if (!state.search && state.category === 'all') {
    if (filterBanner) filterBanner.style.display = 'none';
  } else {
    if (filterBanner) filterBanner.style.display = 'flex';
    if (filterStatusTitle) filterStatusTitle.textContent = `অনুসন্ধান: "${state.search}"`;
  }

  loadDenseStream(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetToHome() {
  state.category = 'all';
  state.search = '';
  streamOffset = 0;
  streamHasMore = true;
  renderedArticleIds.clear();
  renderedArticleTitles.clear();

  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.style.display = 'none';
  if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.cat === 'all');
  });

  const filterBanner = document.getElementById('filterStatusBanner');
  if (filterBanner) filterBanner.style.display = 'none';

  loadDenseStream(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 5. Sidebar Data (Real-time Stream)
// ==========================================================================
async function loadSidebarData() {
  try {
    const res = await fetch('/api/news?limit=15&offset=0');
    const data = await res.json();
    if (data.success && data.articles) {
      renderSidebarStream(data.articles);
    }
  } catch (e) {}
}

function renderSidebarStream(items) {
  const container = document.getElementById('latestStreamList');
  if (!container || !items) return;

  container.innerHTML = items.map(item => `
    <div class="stream-item" onclick="handleCardClick(${item.id})">
      <h5 class="stream-item-title">${escapeHtml(item.title)}</h5>
      <div class="stream-item-meta">
        <span class="pub-name">${escapeHtml(item.source)}</span>
        <span>•</span>
        <span>${formatRelativeTimeBn(item.timestamp)}</span>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// 6. Currency, Weather & Ads
// ==========================================================================
async function loadCurrencyAndWeather() {
  try {
    const [cRes, wRes] = await Promise.all([
      fetch('/api/currency'),
      fetch('/api/weather')
    ]);
    const cData = await cRes.json();
    const wData = await wRes.json();

    if (wData.success && wData.weather) {
      const w = wData.weather;
      const headTemp = document.getElementById('headerWeatherTemp');
      if (headTemp) headTemp.textContent = `${w.city} ${w.temp}`;

      const cardTemp = document.getElementById('weatherCardTemp');
      if (cardTemp) cardTemp.textContent = w.temp.replace(' সে.', '');

      const cardCond = document.getElementById('weatherCardCond');
      if (cardCond) cardCond.textContent = w.condition;
    }
  } catch (e) {}
}

async function loadAds() {
  try {
    const res = await fetch('/api/ads');
    const data = await res.json();
    if (data.success && data.ads) {
      const billboard = data.ads.find(a => a.slot === 'billboard');
      if (billboard) {
        const title = document.getElementById('billboardTitle');
        const sponsor = document.getElementById('billboardSponsor');
        if (title) title.textContent = billboard.title;
        if (sponsor) sponsor.textContent = billboard.sponsor;
      }

      const sidebar = data.ads.find(a => a.slot === 'sidebar');
      if (sidebar) {
        const title = document.getElementById('sidebarAdTitle');
        const sponsor = document.getElementById('sidebarAdSponsor');
        const img = document.getElementById('sidebarAdImg');
        if (title) title.textContent = sidebar.title;
        if (sponsor) sponsor.textContent = sidebar.sponsor;
        if (img && sidebar.image_url) img.src = sidebar.image_url;
      }

      const infeed = data.ads.find(a => a.slot === 'infeed');
      if (infeed) {
        const title = document.getElementById('infeedAdTitle');
        const sponsor = document.getElementById('infeedAdSponsor');
        const desc = document.getElementById('infeedAdDesc');
        const img = document.getElementById('infeedAdImg');
        if (title) title.textContent = infeed.title;
        if (sponsor) sponsor.textContent = infeed.sponsor;
        if (desc) desc.textContent = infeed.description;
        if (img && infeed.image_url) img.src = infeed.image_url;
      }
    }
  } catch (e) {}
}

// ==========================================================================
// 7. Modals & Reader Engine
// ==========================================================================
// In-memory cache for ultra-fast instant modal loading
const articlesCache = new Map();

async function handleCardClick(articleId) {
  const idNum = Number(articleId);
  const localArticle = articlesCache.get(idNum)
                    || (state.savedArticles || []).find(a => Number(a.id) === idNum)
                    || (state.activeArticle && Number(state.activeArticle.id) === idNum ? state.activeArticle : null);

  const hasFullContent = Boolean(localArticle && localArticle.content && localArticle.content.trim().length > 350);

  if (localArticle) {
    // Open immediately (0ms) with what we have
    openReaderModal(localArticle, !hasFullContent);
  }

  // Fetch enriched 85% to 100% full content directly from server/source
  try {
    const res = await fetch(`/api/news/${idNum}`);
    const data = await res.json();
    if (data.success && data.article) {
      articlesCache.set(idNum, data.article);
      // If the reader modal is currently open for this article, update with full text
      if (state.activeArticle && Number(state.activeArticle.id) === idNum) {
        openReaderModal(data.article, false);
      } else if (!localArticle) {
        // If modal wasn't already popped, open now
        openReaderModal(data.article, false);
      }
    }
  } catch (e) {
    console.error('Error fetching full article content:', e);
  }
}

// ==========================================================================
// Ad Policy & 30-Second Auto-Refresh Engine
// ==========================================================================
const AD_REFRESH_INTERVAL_MS = 30000; // 30 seconds as per standard ad policy
let adAutoRefreshTimer = null;
let currentLeftAdIdx = 0;
let currentRightAdIdx = 1;
let currentVideoAdIdx = 2;

function refreshModalSideAds(smooth = false) {
  if (typeof TEST_ADS_POOL === 'undefined' || TEST_ADS_POOL.length < 2) return;
  
  const leftAdEl = document.getElementById('modalSideAdLeft');
  const rightAdEl = document.getElementById('modalSideAdRight');

  if (smooth) {
    if (leftAdEl) leftAdEl.classList.add('side-ad-refreshing');
    if (rightAdEl) rightAdEl.classList.add('side-ad-refreshing');
  }

  setTimeout(() => {
    currentLeftAdIdx = (currentLeftAdIdx + 1) % TEST_ADS_POOL.length;
    currentRightAdIdx = (currentLeftAdIdx + 1) % TEST_ADS_POOL.length;

    const leftAd = TEST_ADS_POOL[currentLeftAdIdx];
    const rightAd = TEST_ADS_POOL[currentRightAdIdx];

    // Populate Left Skyscraper Ad
    const lImg = document.getElementById('sideAdLeftImg');
    const lSponsor = document.getElementById('sideAdLeftSponsor');
    const lTitle = document.getElementById('sideAdLeftTitle');
    const lDesc = document.getElementById('sideAdLeftDesc');
    const lCta = document.getElementById('sideAdLeftCta');
    if (lImg && leftAd) {
      lImg.src = leftAd.image;
      if (lSponsor) lSponsor.textContent = leftAd.sponsor;
      if (lTitle) lTitle.textContent = leftAd.title;
      if (lDesc) lDesc.textContent = leftAd.description || 'আকর্ষণীয় অফার ও ছাড় উপভোগ করুন';
      if (lCta) lCta.textContent = leftAd.cta || 'অফার দেখুন ↗';
      window._currentLeftAdLink = leftAd.link || '#';
    }

    // Populate Right Skyscraper Ad
    const rImg = document.getElementById('sideAdRightImg');
    const rSponsor = document.getElementById('sideAdRightSponsor');
    const rTitle = document.getElementById('sideAdRightTitle');
    const rDesc = document.getElementById('sideAdRightDesc');
    const rCta = document.getElementById('sideAdRightCta');
    if (rImg && rightAd) {
      rImg.src = rightAd.image;
      if (rSponsor) rSponsor.textContent = rightAd.sponsor;
      if (rTitle) rTitle.textContent = rightAd.title;
      if (rDesc) rDesc.textContent = rightAd.description || 'সেরা ডিল ও স্পেশাল ক্যাশব্যাক ডিসকাউন্ট';
      if (rCta) rCta.textContent = rightAd.cta || 'শপিং করুন ↗';
      window._currentRightAdLink = rightAd.link || '#';
    }

    if (smooth) {
      if (leftAdEl) leftAdEl.classList.remove('side-ad-refreshing');
      if (rightAdEl) rightAdEl.classList.remove('side-ad-refreshing');
    }
  }, smooth ? 200 : 0);
}

function refreshVideoBottomAd(smooth = false) {
  if (typeof TEST_ADS_POOL === 'undefined' || TEST_ADS_POOL.length === 0) return;
  const bar = document.getElementById('videoBottomAdBar');
  if (!bar) return;

  if (smooth) {
    bar.classList.add('ad-refreshing');
  }

  setTimeout(() => {
    currentVideoAdIdx = (currentVideoAdIdx + 1) % TEST_ADS_POOL.length;
    const ad = TEST_ADS_POOL[currentVideoAdIdx];

    const sponsorEl = document.getElementById('videoAdSponsor');
    const tickerTextEl = document.getElementById('videoAdTickerText');
    const ctaBtn = document.getElementById('videoAdCtaBtn');

    if (sponsorEl) sponsorEl.textContent = ad.sponsor;
    if (tickerTextEl) {
      tickerTextEl.textContent = `${ad.title} — ${ad.description}`;
    }
    if (ctaBtn) {
      ctaBtn.textContent = ad.cta || 'অফার দেখুন ↗';
      ctaBtn.href = ad.link || '#';
    }
    window._currentVideoAdLink = ad.link || '#';

    // Restart marquee animation smoothly
    const track = document.getElementById('videoAdMarqueeTrack');
    if (track) {
      track.style.animation = 'none';
      void track.offsetHeight; // trigger reflow
      track.style.animation = 'videoAdScroll 22s linear infinite';
    }

    // Un-dismiss if previously dismissed
    bar.classList.remove('dismissed');

    if (smooth) {
      bar.classList.remove('ad-refreshing');
    }
  }, smooth ? 200 : 0);
}

function dismissVideoAd(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const bar = document.getElementById('videoBottomAdBar');
  if (bar) bar.classList.add('dismissed');
}

function handleVideoBottomAdClick(e) {
  if (e && (e.target.closest('#videoAdCloseBtn') || e.target.closest('#videoAdCtaBtn'))) return;
  const link = window._currentVideoAdLink;
  if (link && link !== '#') {
    window.open(link, '_blank');
  } else {
    showToast('টেস্ট বিজ্ঞাপন লিংক সক্রিয় হয়েছে');
  }
}

// Mobile-Only In-Modal Bottom Banner Test Ad (শুধু মোবাইল ইউজারদের জন্য)
let currentMobileAdIdx = 0;

function refreshMobileBannerAd(smooth = false) {
  if (typeof TEST_ADS_POOL === 'undefined' || TEST_ADS_POOL.length === 0) return;
  const mobileAd = document.getElementById('modalMobileBannerAd');
  if (!mobileAd) return;

  if (smooth) mobileAd.classList.add('ad-refreshing');

  setTimeout(() => {
    currentMobileAdIdx = (currentMobileAdIdx + 1) % TEST_ADS_POOL.length;
    const ad = TEST_ADS_POOL[currentMobileAdIdx];

    const sponsorEl = document.getElementById('mobileAdSponsor');
    const imgEl = document.getElementById('mobileAdImage');
    const titleEl = document.getElementById('mobileAdTitle');
    const descEl = document.getElementById('mobileAdDesc');
    const ctaBtn = document.getElementById('mobileAdCtaBtn');

    if (sponsorEl) sponsorEl.textContent = ad.sponsor;
    if (imgEl && ad.image) imgEl.src = ad.image;
    if (titleEl) titleEl.textContent = ad.title;
    if (descEl) descEl.textContent = ad.description;
    if (ctaBtn) {
      ctaBtn.textContent = ad.cta || 'অফার দেখুন ↗';
      ctaBtn.href = ad.link || '#';
    }
    window._currentMobileAdLink = ad.link || '#';

    if (smooth) {
      mobileAd.classList.remove('ad-refreshing');
    }
  }, smooth ? 200 : 0);
}

function handleMobileBannerAdClick(e) {
  if (e && e.target.closest('#mobileAdCtaBtn')) return;
  const link = window._currentMobileAdLink;
  if (link && link !== '#') {
    window.open(link, '_blank', 'noopener,noreferrer');
  } else {
    showToast('মোবাইল টেস্ট ব্যানার বিজ্ঞাপন লিংক সক্রিয় হয়েছে');
  }
}

function startGlobalAdAutoRefresh() {
  if (adAutoRefreshTimer) clearInterval(adAutoRefreshTimer);
  adAutoRefreshTimer = setInterval(() => {
    const modal = document.getElementById('articleReaderModal');
    if (modal && modal.classList.contains('active')) {
      refreshModalSideAds(true);
      refreshMobileBannerAd(true);
      const videoWrapper = document.getElementById('modalVideoWrapper');
      if (videoWrapper && videoWrapper.style.display !== 'none') {
        refreshVideoBottomAd(true);
      }
    }
    // Also periodically refresh in-feed sponsor ad
    loadInfeedAd();
  }, AD_REFRESH_INTERVAL_MS);
}

function handleSideAdClick(sideIndex) {
  const link = (sideIndex === 0) ? window._currentLeftAdLink : window._currentRightAdLink;
  if (link && link !== '#') {
    window.open(link, '_blank');
  } else {
    showToast('টেস্ট বিজ্ঞাপন লিংক সক্রিয় হয়েছে');
  }
}

function openReaderModal(article, isLoadingFull = false) {
  state.activeArticle = article;
  refreshModalSideAds(false);
  refreshMobileBannerAd(false);
  startGlobalAdAutoRefresh();

  // Dynamic SEO Meta & Title Updates for Article
  if (article.meta_title || article.title) {
    document.title = article.meta_title || `${article.title} | BDVibe`;
  }
  const metaDescTag = document.querySelector('meta[name="description"]');
  if (metaDescTag && (article.meta_description || article.description)) {
    metaDescTag.setAttribute('content', article.meta_description || article.description);
  }
  const ogTitleTag = document.querySelector('meta[property="og:title"]');
  if (ogTitleTag && (article.meta_title || article.title)) {
    ogTitleTag.setAttribute('content', article.meta_title || article.title);
  }
  const ogDescTag = document.querySelector('meta[property="og:description"]');
  if (ogDescTag && (article.meta_description || article.description)) {
    ogDescTag.setAttribute('content', article.meta_description || article.description);
  }

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = article.title;

  const sourceEl = document.getElementById('modalSource');
  if (sourceEl) sourceEl.textContent = cleanSourceName(article.source);

  const catEl = document.getElementById('modalCategory');
  if (catEl) catEl.textContent = CATEGORY_NAMES[article.category] || article.category;

  const timeEl = document.getElementById('modalTime');
  if (timeEl) timeEl.textContent = formatRelativeTimeBn(article.timestamp);

  // Video / YouTube TV Channel Autoplay Handling
  const videoId = getCardVideoId(article);
  const imageViewport = document.getElementById('modalImageViewport');
  const videoWrapper = document.getElementById('modalVideoWrapper');
  const videoIframe = document.getElementById('modalVideoIframe');

  if (videoId && isValidVideoId(videoId)) {
    if (imageViewport) imageViewport.style.display = 'none';
    if (videoWrapper) videoWrapper.style.display = 'block';
    if (videoIframe) {
      videoIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
    }
    refreshVideoBottomAd(false);
  } else {
    if (videoWrapper) videoWrapper.style.display = 'none';
    if (videoIframe) videoIframe.src = '';
    if (imageViewport) {
      imageViewport.style.display = 'block';
      const img = document.getElementById('modalImage');
      if (img) {
        img.src = article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
        img.alt = article.title;
      }
    }
  }

  const contentDiv = document.getElementById('modalContent');
  if (contentDiv) {
    const rawText = article.content || article.description || (videoId ? 'সম্পূর্ণ ভিডিও সংবাদটি উপরে স্বয়ংক্রিয়ভাবে প্লে হচ্ছে।' : 'সম্পূর্ণ কনটেন্ট পড়তে মূল উৎসে প্রবেশ করুন।');
    const paragraphs = rawText.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    
    let html = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    
    if (isLoadingFull && !videoId) {
      html += `
        <div class="article-loading-notice">
          <span class="spinner-small"></span> মূল সোর্স থেকে সম্পূর্ণ বিস্তারিত প্রতিবেদন প্রস্তুত হচ্ছে...
        </div>
      `;
    }
    
    contentDiv.innerHTML = html;
  }

  const origLink = document.getElementById('modalOriginalLink');
  if (origLink) origLink.href = article.link || '#';

  // Sync Modal Reactions (Like / Dislike)
  const aId = String(article.id);
  const userReaction = userReactions[aId];
  const modalLikeBtn = document.getElementById('modalLikeBtn');
  const modalDislikeBtn = document.getElementById('modalDislikeBtn');
  const modalLikeCount = document.getElementById('modalLikeCount');

  const baseModalLikes = 60 + ((article.id * 17) % 850) + (userReaction === 'like' ? 1 : 0);
  if (modalLikeCount) modalLikeCount.textContent = toBengaliNumber(baseModalLikes);
  if (modalLikeBtn) {
    modalLikeBtn.classList.toggle('btn-liked', userReaction === 'like');
    modalLikeBtn.setAttribute('onclick', `reactToArticle(event, this, 'like', ${article.id})`);
  }
  if (modalDislikeBtn) {
    modalDislikeBtn.classList.toggle('btn-disliked', userReaction === 'dislike');
    modalDislikeBtn.setAttribute('onclick', `reactToArticle(event, this, 'dislike', ${article.id})`);
  }

  const modal = document.getElementById('articleReaderModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeReaderModal() {
  const modal = document.getElementById('articleReaderModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';

  // Reset Document Title & Meta Tags
  document.title = 'BDVibe — নেক্সট-জেন ডিজিটাল কনটেন্ট ও মিডিয়া হাব';
  const metaDescTag = document.querySelector('meta[name="description"]');
  if (metaDescTag) {
    metaDescTag.setAttribute('content', 'বাংলাদেশের সকল শীর্ষস্থানীয় সোর্স থেকে রাজনীতি, অর্থনীতি, প্রযুক্তি, লাইফস্টাইল, শিক্ষা, কৃষি, ক্যারিয়ার ও সমসাময়িক সকল ডিজিটাল কনটেন্টের আধুনিক কেন্দ্রীয় প্ল্যাটফর্ম।');
  }
  const ogTitleTag = document.querySelector('meta[property="og:title"]');
  if (ogTitleTag) {
    ogTitleTag.setAttribute('content', 'BDVibe — নেক্সট-জেন ডিজিটাল কনটেন্ট ও মিডিয়া হাব');
  }
  const ogDescTag = document.querySelector('meta[property="og:description"]');
  if (ogDescTag) {
    ogDescTag.setAttribute('content', 'বাংলাদেশের সকল শীর্ষস্থানীয় সোর্স থেকে রাজনীতি, অর্থনীতি, প্রযুক্তি, লাইফস্টাইল, শিক্ষা, কৃষি, ক্যারিয়ার ও সমসাময়িক সকল ডিজিটাল কনটেন্টের আধুনিক কেন্দ্রীয় প্ল্যাটফর্ম।');
  }

  // Stop video playback instantly
  const videoIframe = document.getElementById('modalVideoIframe');
  if (videoIframe) videoIframe.src = '';
  const videoWrapper = document.getElementById('modalVideoWrapper');
  if (videoWrapper) videoWrapper.style.display = 'none';
  const imageViewport = document.getElementById('modalImageViewport');
  if (imageViewport) imageViewport.style.display = 'block';

  const videoAdBar = document.getElementById('videoBottomAdBar');
  if (videoAdBar) videoAdBar.classList.remove('dismissed');
}

// Bookmarks Management
function toggleBookmark(article) {
  const index = state.savedArticles.findIndex(a => a.id === article.id);
  if (index > -1) {
    state.savedArticles.splice(index, 1);
    showToast('কনটেন্ট বুকমার্ক থেকে মুছে ফেলা হয়েছে');
  } else {
    state.savedArticles.unshift(article);
    showToast('কনটেন্ট বুকমার্কে সংরক্ষণ করা হয়েছে 🔖');
  }
  localStorage.setItem('bdvibe_saved_content', JSON.stringify(state.savedArticles));
  updateSavedCounter();
}

function updateSavedCounter() {
  const badge = document.getElementById('savedCounter');
  if (badge) badge.textContent = toBengaliNumber(state.savedArticles.length);
}

function openBookmarksModal() {
  const container = document.getElementById('savedArticlesContainer');
  if (!container) return;

  if (state.savedArticles.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--msn-text-muted);">
        <p style="font-size: 1.8rem; margin-bottom: 8px;">🔖</p>
        <p style="font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; color: var(--msn-text-primary);">কোনো সংরক্ষিত কনটেন্ট নেই</p>
        <p style="font-size: 0.88rem;">যেকোনো কার্ডের বুকমার্ক আইকনে ক্লিক করে অফলাইনে বা পরবর্তীতে পড়ার জন্য সংরক্ষণ করতে পারবেন।</p>
      </div>
    `;
  } else {
    container.innerHTML = state.savedArticles.map(a => `
      <div class="saved-item-row">
        <h5 onclick="openReaderModal(${JSON.stringify(a).replace(/"/g, '&quot;')})">${escapeHtml(a.title)}</h5>
        <button class="remove-saved-btn" onclick="removeBookmark(${a.id})" title="মুছে ফেলুন">✕</button>
      </div>
    `).join('');
  }

  document.getElementById('savedBookmarksModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function removeBookmark(id) {
  state.savedArticles = state.savedArticles.filter(a => a.id !== id);
  localStorage.setItem('bdvibe_saved_content', JSON.stringify(state.savedArticles));
  updateSavedCounter();
  openBookmarksModal();
}

function closeBookmarksModal() {
  document.getElementById('savedBookmarksModal').classList.remove('active');
  document.body.style.overflow = '';
}

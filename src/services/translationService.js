const TARGET_LANGS = ["en", "zh", "ru", "ko", "ja"];
const GOOGLE_LANG_MAP = {
  en: "en",
  zh: "zh-CN",
  ru: "ru",
  ko: "ko",
  ja: "ja"
};

const SEPARATOR = "\n<<<KIN_TR_SEP>>>\n";
const translationCache = new Map();
const MAX_CACHE_ENTRIES = 2000;

function isTestFixtureEnvironment() {
  return (
    process.env.KIN_DISABLE_LIVE_TRANSLATE === "1" ||
    process.env.NODE_ENV === "test" ||
    String(process.env.PUBLIC_SITE_URL || "").includes(".invalid") ||
    String(process.env.TELEGRAM_WEBHOOK_URL || "").includes(".invalid")
  );
}

function setCache(key, value) {
  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = translationCache.keys().next().value;
    if (oldest !== undefined) translationCache.delete(oldest);
  }
  translationCache.set(key, value);
}

const BUILTIN_GLOSSARY = {
  "Giá nhà nước (EVN ~2,800đ/kWh)": {
    en: "State EVN Rate (~2,800 VND/kWh)",
    zh: "国家电网标准电价 (~2,800越南盾/度)",
    ru: "Гос. тариф EVN (~2,800 донг/кВт·ч)",
    ko: "국가 전력 표준 요금 (EVN ~2,800동/kWh)",
    ja: "国営EVN標準料金（約2,800VND/kWh）"
  },
  "Giá nhà nước EVN (~2.800 ₫/kWh)": {
    en: "State EVN Rate (~2,800 VND/kWh)",
    zh: "国家电网标准电价 (~2,800越南盾/度)",
    ru: "Гос. тариф EVN (~2,800 донг/кВт·ч)",
    ko: "국가 전력 표준 요금 (EVN ~2,800동/kWh)",
    ja: "国営EVN標準料金（約2,800VND/kWh）"
  },
  "Giá nhà nước (EVN)": {
    en: "State EVN Rate",
    zh: "国家电网电价 (EVN)",
    ru: "Гос. тариф EVN",
    ko: "국가 전력 요금 (EVN)",
    ja: "国営EVN電気料金"
  },
  "Giá nhà nước": {
    en: "State Utility Rate",
    zh: "国家标准水电价",
    ru: "Государственный тариф",
    ko: "국가 표준 요금",
    ja: "公共標準料金"
  },
  "Giá nhà nước / miễn phí": {
    en: "State Rate / Included",
    zh: "国家标准 / 免费包含",
    ru: "Гос. тариф / Бесплатно",
    ko: "국가 표준 / 무료 포함",
    ja: "公共料金 / 無料"
  },
  "Thương lượng với chủ nhà": {
    en: "Negotiable with landlord",
    zh: "可与房东协商",
    ru: "По согласованию с владельцем",
    ko: "집주인과 협의 가능",
    ja: "オーナーと応相談"
  },
  "Thương lượng (Cho phép thú cưng nhỏ)": {
    en: "Negotiable (Small pets allowed)",
    zh: "可协商（允许小型宠物）",
    ru: "По согласованию (мелкие питомцы)",
    ko: "협의 가능 (소형 반려동물 허용)",
    ja: "応相談（小型ペット可）"
  },
  "Cho phép thú cưng nhỏ": {
    en: "Small pets allowed",
    zh: "允许小型宠物",
    ru: "Можно с небольшими питомцами",
    ko: "소형 반려동물 가능",
    ja: "小型ペット可"
  },
  "Bàn làm việc riêng + Cáp quang 300Mbps": {
    en: "Dedicated Work Desk + 300Mbps Fiber",
    zh: "独立办公桌 + 300Mbps 光纤网络",
    ru: "Рабочий стол + оптоволокно 300 Мбит/с",
    ko: "전용 업무 데스크 + 300Mbps 광랜",
    ja: "専用ワークデスク＋光回線300Mbps"
  },
  "Bàn làm việc cạnh kính lớn + Cáp quang 300Mbps": {
    en: "Window-side Work Desk + 300Mbps Fiber",
    zh: "落地窗景办公桌 + 300Mbps 光纤",
    ru: "Рабочий стол у окна + оптоволокно 300 Мбит/с",
    ko: "통창 뷰 업무 데스크 + 300Mbps 광랜",
    ja: "窓際ワークデスク＋光回線300Mbps"
  },
  "View sông Hàn": {
    en: "Han River View",
    zh: "韩江景观",
    ru: "Вид на реку Хан",
    ko: "한강 뷰",
    ja: "ハン川ビュー"
  },
  "Gần biển": {
    en: "Near Beach",
    zh: "靠近海滩",
    ru: "Рядом с пляжем",
    ko: "해변 근처",
    ja: "ビーチ近く"
  },
  "Hồ bơi vô cực": {
    en: "Infinity Pool",
    zh: "无边泳池",
    ru: "Инфинити-бассейн",
    ko: "인피니티 풀",
    ja: "インフィニティプール"
  },
  "Bàn làm việc": {
    en: "Work Desk",
    zh: "独立办公桌",
    ru: "Рабочий стол",
    ko: "업무용 데스크",
    ja: "ワークデスク"
  },
  "Điện EVN": {
    en: "State EVN Rate",
    zh: "国家电网电价",
    ru: "Гос. тариф EVN",
    ko: "국가 전력 요금",
    ja: "国営EVN電気料金"
  },
  "Chỗ đỗ ô tô": {
    en: "Car Parking",
    zh: "汽车停车位",
    ru: "Парковка для авто",
    ko: "자동차 주차 가능",
    ja: "駐車場あり"
  },
  "Máy giặt": {
    en: "Washing Machine",
    zh: "洗衣机",
    ru: "Стиральная машина",
    ko: "세탁기",
    ja: "洗濯機"
  },
  "Ban công": {
    en: "Private Balcony",
    zh: "独立阳台",
    ru: "Балкон",
    ko: "발코니",
    ja: "バルコニー"
  },
  "Gym": {
    en: "Fitness Gym",
    zh: "健身房",
    ru: "Тренажерный зал",
    ko: "피트니스 짐",
    ja: "フィットネスジム"
  },
  "Thú cưng": {
    en: "Pet Friendly",
    zh: "允许宠物",
    ru: "Можно с питомцами",
    ko: "반려동물 가능",
    ja: "ペット可"
  },
  "Biệt thự": {
    en: "Private Villa",
    zh: "独栋别墅",
    ru: "Вилла",
    ko: "풀빌라",
    ja: "ヴィラ"
  },
  "Penthouse": {
    en: "Penthouse",
    zh: "顶层豪宅",
    ru: "Пентхаус",
    ko: "펜트하우스",
    ja: "ペントハウス"
  }
};

function lookupGlossary(text, targetLang) {
  const clean = String(text || "").trim();
  if (!clean) return "";
  return BUILTIN_GLOSSARY[clean]?.[targetLang] || null;
}

async function fetchGoogleTranslate(text, targetLang) {
  const tl = GOOGLE_LANG_MAP[targetLang];
  if (!tl || !text || !text.trim()) return text;
  if (isTestFixtureEnvironment()) return null;

  const hasViChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
  const sl = hasViChars ? "vi" : "auto";

  // Provider 1: Google Translate gtx
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(4500)
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const translated = json[0].map((part) => (Array.isArray(part) ? part[0] : "")).join("").trim();
        if (translated) return translated;
      }
    }
  } catch {
    // Fall through to Provider 2
  }

  // Provider 2: Google Translate dict-chrome-ex endpoint
  try {
    const url2 = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
    const res2 = await fetch(url2, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4500)
    });
    if (res2.ok) {
      const json2 = await res2.json();
      const first = Array.isArray(json2) ? (Array.isArray(json2[0]) ? json2[0][0] : json2[0]) : null;
      if (typeof first === "string" && first.trim()) return first.trim();
    }
  } catch {
    // Fall through to Provider 3
  }

  // Provider 3: MyMemory free translation API fallback (works from all AWS/Vercel datacenter IPs)
  try {
    if (text.length <= 480) {
      const mmPair = `${sl === "auto" ? "vi" : sl}|${tl}`;
      const url3 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(mmPair)}`;
      const res3 = await fetch(url3, { signal: AbortSignal.timeout(4500) });
      if (res3.ok) {
        const json3 = await res3.json();
        const out = String(json3?.responseData?.translatedText || "").trim();
        if (out && out !== text && !/MYMEMORY WARNING/i.test(out)) return out;
      }
    }
  } catch {
    // Graceful fallback to original text
  }

  return null;
}

async function translateBatch(items, targetLang) {
  if (!TARGET_LANGS.includes(targetLang) || !Array.isArray(items) || items.length === 0) {
    return items || [];
  }

  const results = new Array(items.length);
  const toTranslate = [];

  for (let i = 0; i < items.length; i++) {
    const raw = String(items[i] ?? "").trim();
    if (!raw) {
      results[i] = "";
      continue;
    }
    const glossary = lookupGlossary(raw, targetLang);
    if (glossary) {
      results[i] = glossary;
      continue;
    }
    const cacheKey = `${targetLang}::${raw}`;
    if (translationCache.has(cacheKey)) {
      results[i] = translationCache.get(cacheKey);
      continue;
    }
    toTranslate.push({ index: i, text: raw, cacheKey });
  }

  if (toTranslate.length === 0 || isTestFixtureEnvironment()) {
    for (const item of toTranslate) {
      results[item.index] = item.text;
    }
    return results;
  }

  // Translate in small safe chunks (max ~1500 chars per request) to stay well within URL query limits
  const chunks = [];
  let currentChunk = [];
  let currentLen = 0;
  for (const item of toTranslate) {
    if (currentChunk.length > 0 && currentLen + item.text.length + SEPARATOR.length > 1400) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentLen = 0;
    }
    currentChunk.push(item);
    currentLen += item.text.length + SEPARATOR.length;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 1) {
        const translated = await fetchGoogleTranslate(chunk[0].text, targetLang);
        const finalVal = translated ?? chunk[0].text;
        if (translated !== null) setCache(chunk[0].cacheKey, finalVal);
        results[chunk[0].index] = finalVal;
        return;
      }

      const joined = chunk.map((c) => c.text).join(SEPARATOR);
      const translatedJoined = await fetchGoogleTranslate(joined, targetLang);
      const parts = translatedJoined ? translatedJoined.split(/\s*<<<\s*KIN_TR_SEP\s*>>>\s*/i) : null;

      if (parts && parts.length === chunk.length) {
        for (let j = 0; j < chunk.length; j++) {
          const val = parts[j].trim() || chunk[j].text;
          setCache(chunk[j].cacheKey, val);
          results[chunk[j].index] = val;
        }
      } else {
        // Fallback: translate individually in parallel if delimiter was altered
        await Promise.all(
          chunk.map(async (item) => {
            const single = await fetchGoogleTranslate(item.text, targetLang);
            const finalVal = single ?? item.text;
            if (single !== null) setCache(item.cacheKey, finalVal);
            results[item.index] = finalVal;
          })
        );
      }
    })
  );

  return results;
}

function needsTranslation(obj, lang) {
  if (!obj || typeof obj !== "object") return false;
  const vi = String(obj.vi || "").trim();
  const cur = String(obj[lang] || "").trim();
  if (!vi) return false;
  return !cur || cur === vi;
}

async function translateApartmentForLanguage(apartment, targetLang) {
  if (!apartment || !TARGET_LANGS.includes(targetLang) || isTestFixtureEnvironment()) {
    return apartment;
  }

  const viTitle = typeof apartment.title === "string" ? apartment.title : apartment.title?.vi || "";
  const viNotes =
    typeof apartment.architecturalNotes === "string"
      ? apartment.architecturalNotes
      : apartment.architecturalNotes?.vi || "";

  const existingTr = apartment.translations?.[targetLang] || {};
  const entries = [];
  const pushField = (key, value) => {
    const str = String(value || "").trim();
    if (str) entries.push({ key, value: str });
  };

  if (!existingTr.__done && (needsTranslation(apartment.title, targetLang) || typeof apartment.title === "string")) {
    pushField("title", viTitle);
  }
  if (!existingTr.__done && (needsTranslation(apartment.architecturalNotes, targetLang) || typeof apartment.architecturalNotes === "string")) {
    pushField("architecturalNotes", viNotes);
  }

  const scalarFields = ["orientation", "electricityRate", "waterRate", "petPolicy", "remoteWorkSetup", "address"];
  for (const field of scalarFields) {
    if (apartment[field] && !existingTr[field]) {
      pushField(field, apartment[field]);
    }
  }

  const tags = Array.isArray(apartment.tags) ? apartment.tags.filter(Boolean) : [];
  const needTags = tags.length > 0 && (!Array.isArray(existingTr.tags) || existingTr.tags.length !== tags.length);
  if (needTags) {
    tags.forEach((tag, idx) => pushField(`tag:${idx}`, tag));
  }

  if (entries.length === 0) return apartment;

  const translatedValues = await translateBatch(
    entries.map((e) => e.value),
    targetLang
  );

  const nextTitle =
    typeof apartment.title === "object" && apartment.title !== null
      ? { ...apartment.title }
      : { vi: viTitle };
  const nextNotes =
    typeof apartment.architecturalNotes === "object" && apartment.architecturalNotes !== null
      ? { ...apartment.architecturalNotes }
      : { vi: viNotes };
  const nextLangTr = { ...existingTr, __done: true };
  const nextTags = needTags ? [...tags] : existingTr.tags;

  entries.forEach((entry, idx) => {
    const val = translatedValues[idx] || entry.value;
    if (entry.key === "title") {
      nextTitle[targetLang] = val;
    } else if (entry.key === "architecturalNotes") {
      nextNotes[targetLang] = val;
    } else if (entry.key.startsWith("tag:")) {
      const tagIdx = Number(entry.key.slice(4));
      nextTags[tagIdx] = val;
    } else {
      nextLangTr[entry.key] = val;
    }
  });

  if (needTags) nextLangTr.tags = nextTags;

  return {
    ...apartment,
    title: nextTitle,
    architecturalNotes: nextNotes,
    translations: {
      ...(apartment.translations || {}),
      [targetLang]: nextLangTr
    }
  };
}

async function translateApartmentAllLanguages(apartment) {
  if (!apartment || isTestFixtureEnvironment()) return apartment;
  const results = await Promise.all(
    TARGET_LANGS.map((lang) => translateApartmentForLanguage(apartment, lang))
  );

  const mergedTitle =
    typeof apartment.title === "object" && apartment.title !== null ? { ...apartment.title } : { vi: String(apartment.title || "") };
  const mergedNotes =
    typeof apartment.architecturalNotes === "object" && apartment.architecturalNotes !== null
      ? { ...apartment.architecturalNotes }
      : { vi: String(apartment.architecturalNotes || "") };
  const mergedTranslations = { ...(apartment.translations || {}) };

  results.forEach((res, idx) => {
    const lang = TARGET_LANGS[idx];
    if (res?.title?.[lang]) mergedTitle[lang] = res.title[lang];
    if (res?.architecturalNotes?.[lang]) mergedNotes[lang] = res.architecturalNotes[lang];
    if (res?.translations?.[lang]) mergedTranslations[lang] = res.translations[lang];
  });

  return {
    ...apartment,
    title: mergedTitle,
    architecturalNotes: mergedNotes,
    translations: mergedTranslations
  };
}

module.exports = {
  TARGET_LANGS,
  translateBatch,
  translateApartmentForLanguage,
  translateApartmentAllLanguages
};

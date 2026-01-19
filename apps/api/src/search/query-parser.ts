/**
 * Query Parser - Deterministic rules-based parsing for search queries
 *
 * Extracts structured constraints from natural language queries without hallucination.
 * All parsing is based on explicit keyword matching, not inference.
 */

import type { ParsedQuery } from '@matcha/shared';

// Region keywords mapped to their canonical names
const REGION_KEYWORDS: Record<string, string> = {
  // Uji, Kyoto
  uji: 'Uji, Kyoto',
  kyoto: 'Uji, Kyoto',
  // Nishio, Aichi
  nishio: 'Nishio, Aichi',
  aichi: 'Nishio, Aichi',
  // Kagoshima
  kagoshima: 'Kagoshima',
  // Shizuoka
  shizuoka: 'Shizuoka',
  // Fukuoka/Yame
  fukuoka: 'Fukuoka',
  yame: 'Fukuoka',
  // Zhejiang (China)
  zhejiang: 'Zhejiang',
  china: 'Zhejiang',
  chinese: 'Zhejiang',
};

// Grade keywords mapped to grade type codes
const GRADE_KEYWORDS: Record<string, string> = {
  ceremonial: 'CEREMONIAL',
  ceremony: 'CEREMONIAL',
  premium: 'PREMIUM',
  cafe: 'CAFE',
  'cafe grade': 'CAFE',
  'cafe-grade': 'CAFE',
  barista: 'CAFE',
  culinary: 'CULINARY_A',
  'culinary a': 'CULINARY_A',
  'culinary b': 'CULINARY_B',
  cooking: 'CULINARY_A',
  baking: 'CULINARY_A',
  industrial: 'INDUSTRIAL',
  extract: 'INDUSTRIAL',
  bulk: 'INDUSTRIAL',
  daily: 'PREMIUM',
};

// Certification keywords
const CERTIFICATION_KEYWORDS: Record<string, string> = {
  organic: 'organic',
  jas: 'JAS Organic',
  'jas organic': 'JAS Organic',
  'jas certified': 'JAS Organic',
  usda: 'USDA Organic',
  'usda organic': 'USDA Organic',
  eu: 'EU Organic',
  'eu organic': 'EU Organic',
  'fair trade': 'Fair Trade',
  'fair-trade': 'Fair Trade',
  fairtrade: 'Fair Trade',
  kosher: 'Kosher',
  halal: 'Halal',
  vegan: 'Vegan',
};

// Country keywords for destination
const COUNTRY_KEYWORDS: Record<string, string> = {
  usa: 'US',
  us: 'US',
  'united states': 'US',
  america: 'US',
  american: 'US',
  singapore: 'SG',
  sg: 'SG',
  japan: 'JP',
  jp: 'JP',
  uk: 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  england: 'GB',
  germany: 'DE',
  de: 'DE',
  france: 'FR',
  fr: 'FR',
  australia: 'AU',
  au: 'AU',
  canada: 'CA',
  ca: 'CA',
  china: 'CN',
  cn: 'CN',
  korea: 'KR',
  kr: 'KR',
  taiwan: 'TW',
  tw: 'TW',
  'hong kong': 'HK',
  hk: 'HK',
  eu: 'EU',
  europe: 'EU',
  european: 'EU',
};

// MOQ extraction patterns
const MOQ_PATTERNS = [
  // "moq <20kg", "moq < 20 kg", "moq under 20kg"
  /moq\s*(?:<|under|below|less than|<=)\s*(\d+)\s*(?:kg|kilogram|kilo)?/i,
  // "moq >5kg", "moq above 5kg"
  /moq\s*(?:>|above|over|more than|>=)\s*(\d+)\s*(?:kg|kilogram|kilo)?/i,
  // "minimum 5kg", "min 5 kg"
  /(?:minimum|min)\s*(?:order\s*)?(\d+)\s*(?:kg|kilogram|kilo)?/i,
  // "at least 10kg"
  /at\s*least\s*(\d+)\s*(?:kg|kilogram|kilo)?/i,
  // "under 20kg moq", "less than 50kg"
  /(?:under|below|less than|<)\s*(\d+)\s*(?:kg|kilogram|kilo)?\s*(?:moq)?/i,
  // "5kg minimum"
  /(\d+)\s*(?:kg|kilogram|kilo)?\s*(?:minimum|min)/i,
  // Simple "20kg" when preceded by quantity context
  /(?:need|want|require|order|quantity|qty)\s*(?:of\s*)?(\d+)\s*(?:kg|kilogram|kilo)/i,
];

// Lead time extraction patterns
const LEAD_TIME_PATTERNS = [
  // "ship in 7 days", "delivery in 14 days"
  /(?:ship|deliver|arrival|lead\s*time)\s*(?:in|within)?\s*(\d+)\s*(?:day|days)/i,
  // "2 week lead", "3 weeks delivery"
  /(\d+)\s*(?:week|weeks)\s*(?:lead|delivery|shipping)?/i,
  // "lead time 14 days", "lead time: 7 days"
  /lead\s*time\s*:?\s*(\d+)\s*(?:day|days)/i,
  // "7 day delivery", "14-day lead"
  /(\d+)[\s-]*(?:day|days)\s*(?:lead|delivery|shipping)/i,
  // "quick ship", "fast delivery" → suggest short lead time
  /(?:quick|fast|urgent|express)\s*(?:ship|delivery|shipping)/i,
];

// Price extraction patterns
const PRICE_PATTERNS = [
  // "under $100", "below $50"
  /(?:under|below|less than|<)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  // "budget $200", "max $150"
  /(?:budget|max|maximum)\s*(?:of\s*)?\$?\s*(\d+(?:\.\d+)?)/i,
  // "$50-$100", "$50 to $100"
  /\$?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  // "around $80", "about $100"
  /(?:around|about|approximately|~)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  // "at least $30", "minimum $50"
  /(?:at least|minimum|min|above|over|>)\s*\$?\s*(\d+(?:\.\d+)?)/i,
];

/**
 * Parse a natural language search query into structured constraints
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const normalizedQuery = query.toLowerCase().trim();

  const result: ParsedQuery = {
    keywords: [],
    regions: [],
    grades: [],
    certifications: [],
    moqMax: null,
    moqMin: null,
    leadTimeMax: null,
    priceMax: null,
    priceMin: null,
    destinationCountry: null,
  };

  // Extract regions
  for (const [keyword, region] of Object.entries(REGION_KEYWORDS)) {
    if (normalizedQuery.includes(keyword) && !result.regions.includes(region)) {
      result.regions.push(region);
    }
  }

  // Extract grades
  for (const [keyword, grade] of Object.entries(GRADE_KEYWORDS)) {
    if (normalizedQuery.includes(keyword) && !result.grades.includes(grade)) {
      result.grades.push(grade);
    }
  }

  // Extract certifications
  for (const [keyword, cert] of Object.entries(CERTIFICATION_KEYWORDS)) {
    if (normalizedQuery.includes(keyword) && !result.certifications.includes(cert)) {
      result.certifications.push(cert);
    }
  }

  // Extract destination country
  // Check for "ship to X", "deliver to X", "to X" patterns first
  const destinationMatch = normalizedQuery.match(
    /(?:ship|deliver|shipping|to)\s+(?:to\s+)?(\w+(?:\s+\w+)?)/i,
  );
  if (destinationMatch) {
    const destKeyword = destinationMatch[1].toLowerCase();
    if (COUNTRY_KEYWORDS[destKeyword]) {
      result.destinationCountry = COUNTRY_KEYWORDS[destKeyword];
    }
  }

  // Fallback: check for country keywords anywhere
  if (!result.destinationCountry) {
    for (const [keyword, country] of Object.entries(COUNTRY_KEYWORDS)) {
      // Only match if keyword is a standalone word (not part of region names)
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (
        regex.test(normalizedQuery) &&
        !REGION_KEYWORDS[keyword] // Don't confuse region with country
      ) {
        result.destinationCountry = country;
        break;
      }
    }
  }

  // Extract MOQ constraints
  for (const pattern of MOQ_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value)) {
        // Determine if it's a max or min based on the pattern
        if (
          pattern.source.includes('under') ||
          pattern.source.includes('below') ||
          pattern.source.includes('less') ||
          pattern.source.includes('<')
        ) {
          result.moqMax = value;
        } else if (
          pattern.source.includes('above') ||
          pattern.source.includes('over') ||
          pattern.source.includes('more') ||
          pattern.source.includes('>')
        ) {
          result.moqMin = value;
        } else {
          // "minimum X" or "at least X" → this becomes the min MOQ buyer needs
          // But for search, we want products with MOQ <= buyer's quantity
          result.moqMax = value;
        }
        break;
      }
    }
  }

  // Extract lead time constraints
  for (const pattern of LEAD_TIME_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      if (match[1]) {
        let days = parseInt(match[1], 10);
        // Convert weeks to days
        if (pattern.source.includes('week')) {
          days *= 7;
        }
        if (!isNaN(days)) {
          result.leadTimeMax = days;
          break;
        }
      } else if (pattern.source.includes('quick|fast|urgent')) {
        // "quick ship" → assume 7 days
        result.leadTimeMax = 7;
        break;
      }
    }
  }

  // Extract price constraints
  for (const pattern of PRICE_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      if (match[2]) {
        // Range pattern: "$50-$100"
        result.priceMin = parseFloat(match[1]);
        result.priceMax = parseFloat(match[2]);
        break;
      } else if (match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          if (
            pattern.source.includes('under') ||
            pattern.source.includes('below') ||
            pattern.source.includes('less') ||
            pattern.source.includes('max') ||
            pattern.source.includes('budget')
          ) {
            result.priceMax = value;
          } else if (
            pattern.source.includes('above') ||
            pattern.source.includes('over') ||
            pattern.source.includes('min') ||
            pattern.source.includes('at least')
          ) {
            result.priceMin = value;
          } else {
            // "around $X" → set as approximate max
            result.priceMax = value * 1.2; // 20% buffer
            result.priceMin = value * 0.8;
          }
          break;
        }
      }
    }
  }

  // Extract general keywords (words not matching specific patterns)
  const words = normalizedQuery.split(/\s+/);
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'want',
    'looking',
    'find',
    'search',
    'get',
    'buy',
    'purchase',
    'order',
    'ship',
    'deliver',
    'delivery',
    'shipping',
    'moq',
    'minimum',
    'min',
    'max',
    'maximum',
    'under',
    'over',
    'below',
    'above',
    'less',
    'more',
    'than',
    'kg',
    'kilogram',
    'kilo',
    'day',
    'days',
    'week',
    'weeks',
    'lead',
    'time',
    'quick',
    'fast',
    'urgent',
    'express',
    'budget',
    'price',
    'cost',
    'around',
    'about',
    'approximately',
  ]);

  for (const word of words) {
    // Skip stop words, numbers, and already-matched keywords
    if (
      stopWords.has(word) ||
      /^\d+$/.test(word) ||
      /^\$/.test(word) ||
      word.length < 2
    ) {
      continue;
    }

    // Skip if word is part of region/grade/cert keywords
    const isKeyword =
      Object.keys(REGION_KEYWORDS).includes(word) ||
      Object.keys(GRADE_KEYWORDS).includes(word) ||
      Object.keys(CERTIFICATION_KEYWORDS).includes(word) ||
      Object.keys(COUNTRY_KEYWORDS).includes(word);

    if (!isKeyword && !result.keywords.includes(word)) {
      result.keywords.push(word);
    }
  }

  return result;
}

/**
 * Check if a parsed query has any constraints
 */
export function hasConstraints(parsed: ParsedQuery): boolean {
  return (
    parsed.keywords.length > 0 ||
    parsed.regions.length > 0 ||
    parsed.grades.length > 0 ||
    parsed.certifications.length > 0 ||
    parsed.moqMax !== null ||
    parsed.moqMin !== null ||
    parsed.leadTimeMax !== null ||
    parsed.priceMax !== null ||
    parsed.priceMin !== null ||
    parsed.destinationCountry !== null
  );
}

/**
 * Generate a human-readable summary of parsed constraints
 */
export function summarizeParsedQuery(parsed: ParsedQuery): string {
  const parts: string[] = [];

  if (parsed.regions.length > 0) {
    parts.push(`region: ${parsed.regions.join(', ')}`);
  }
  if (parsed.grades.length > 0) {
    parts.push(`grade: ${parsed.grades.join(', ')}`);
  }
  if (parsed.certifications.length > 0) {
    parts.push(`certification: ${parsed.certifications.join(', ')}`);
  }
  if (parsed.moqMax !== null) {
    parts.push(`MOQ ≤ ${parsed.moqMax}kg`);
  }
  if (parsed.moqMin !== null) {
    parts.push(`MOQ ≥ ${parsed.moqMin}kg`);
  }
  if (parsed.leadTimeMax !== null) {
    parts.push(`lead time ≤ ${parsed.leadTimeMax} days`);
  }
  if (parsed.priceMin !== null && parsed.priceMax !== null) {
    parts.push(`price: $${parsed.priceMin} - $${parsed.priceMax}`);
  } else if (parsed.priceMax !== null) {
    parts.push(`price ≤ $${parsed.priceMax}`);
  } else if (parsed.priceMin !== null) {
    parts.push(`price ≥ $${parsed.priceMin}`);
  }
  if (parsed.destinationCountry) {
    parts.push(`destination: ${parsed.destinationCountry}`);
  }
  if (parsed.keywords.length > 0) {
    parts.push(`keywords: ${parsed.keywords.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'no constraints';
}

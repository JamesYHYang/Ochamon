import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProductStatus } from '@prisma/client';
import type {
  SearchInput,
  SearchResponse,
  SearchResult,
  ParsedQuery,
  Reason,
} from '@matcha/shared';
import { parseSearchQuery, hasConstraints } from './query-parser';

// Scoring weights for ranking
const SCORING_WEIGHTS = {
  EXACT_REGION_MATCH: 30,
  EXACT_GRADE_MATCH: 25,
  CERTIFICATION_MATCH: 20,
  MOQ_WITHIN_RANGE: 15,
  LEAD_TIME_MATCH: 15,
  PRICE_IN_RANGE: 10,
  KEYWORD_MATCH: 5,
  SELLER_VERIFIED: 10,
  RECENT_PRODUCT: 5,
};

interface ScoredResult {
  result: SearchResult;
  score: number;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(input: SearchInput): Promise<SearchResponse> {
    const startTime = Date.now();

    // Validate query
    if (!input.query || input.query.trim().length === 0) {
      throw new BadRequestException('Query cannot be empty');
    }

    // Sanitize input
    const sanitizedQuery = this.sanitizeInput(input.query);

    // Parse the natural language query
    const parsedQuery = parseSearchQuery(sanitizedQuery);

    // Merge with explicit filters if provided
    if (input.filters) {
      if (input.filters.grades?.length) {
        parsedQuery.grades = [
          ...new Set([...parsedQuery.grades, ...input.filters.grades]),
        ];
      }
      if (input.filters.origins?.length) {
        parsedQuery.regions = [
          ...new Set([...parsedQuery.regions, ...input.filters.origins]),
        ];
      }
      if (input.filters.certifications?.length) {
        parsedQuery.certifications = [
          ...new Set([
            ...parsedQuery.certifications,
            ...input.filters.certifications,
          ]),
        ];
      }
      if (input.filters.moqMax !== undefined) {
        parsedQuery.moqMax = input.filters.moqMax;
      }
      if (input.filters.moqMin !== undefined) {
        parsedQuery.moqMin = input.filters.moqMin;
      }
      if (input.filters.leadTimeMax !== undefined) {
        parsedQuery.leadTimeMax = input.filters.leadTimeMax;
      }
      if (input.filters.priceMax !== undefined) {
        parsedQuery.priceMax = input.filters.priceMax;
      }
      if (input.filters.priceMin !== undefined) {
        parsedQuery.priceMin = input.filters.priceMin;
      }
    }

    // Override destination country if provided
    if (input.destinationCountry) {
      parsedQuery.destinationCountry = input.destinationCountry;
    }

    // Build database query
    const whereClause = this.buildWhereClause(parsedQuery);

    // Calculate pagination
    const skip = (input.page - 1) * input.limit;
    const take = input.limit;

    // Execute database query with proper select for performance
    const [skus, total] = await Promise.all([
      this.prisma.sku.findMany({
        where: whereClause,
        skip,
        take: take + 10, // Fetch a few extra for scoring/filtering
        select: {
          id: true,
          sku: true,
          name: true,
          isActive: true,
          priceTiers: {
            select: {
              minQty: true,
              pricePerUnit: true,
            },
            orderBy: { minQty: 'asc' },
            take: 1,
          },
          product: {
            select: {
              id: true,
              name: true,
              moqKg: true,
              leadTimeDays: true,
              certifications: true,
              status: true,
              createdAt: true,
              region: {
                select: {
                  name: true,
                },
              },
              gradeType: {
                select: {
                  name: true,
                  code: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  verificationStatus: true,
                  company: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ product: { createdAt: 'desc' } }, { sku: 'asc' }],
      }),
      this.prisma.sku.count({ where: whereClause }),
    ]);

    // Transform and score results
    const scoredResults: ScoredResult[] = [];

    for (const sku of skus) {
      // Skip inactive SKUs or products
      if (!sku.isActive || sku.product.status !== ProductStatus.ACTIVE) {
        continue;
      }

      // Get the lowest price tier
      const lowestPrice =
        sku.priceTiers.length > 0
          ? Number(sku.priceTiers[0].pricePerUnit)
          : null;

      // Build result object with only real data
      const result: SearchResult = {
        skuId: sku.id,
        productName: sku.product.name,
        sellerName: sku.product.seller.company.name,
        grade: sku.product.gradeType.name,
        origin: sku.product.region.name,
        moq: Number(sku.product.moqKg),
        leadTimeDays: sku.product.leadTimeDays,
        price: lowestPrice,
        certifications: sku.product.certifications,
        reasons: [],
      };

      // Calculate score and generate reasons
      const { score, reasons } = this.scoreAndExplain(
        result,
        parsedQuery,
        sku.product.seller.verificationStatus === 'APPROVED',
        sku.product.createdAt,
      );

      result.reasons = reasons;
      result.score = score;

      scoredResults.push({ result, score });
    }

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // Take only the requested number of results
    const finalResults = scoredResults.slice(0, input.limit).map((sr) => sr.result);

    // Generate suggestion if no results
    let suggestion: string | null = null;
    if (finalResults.length === 0) {
      suggestion = this.generateSuggestion(parsedQuery);
    }

    const executionTime = Date.now() - startTime;

    return {
      results: finalResults,
      total,
      page: input.page,
      limit: input.limit,
      executionTime,
      parsedQuery,
      suggestion,
    };
  }

  /**
   * Sanitize user input to prevent injection
   */
  private sanitizeInput(input: string): string {
    return (
      input
        // Convert comparison operators to word equivalents before stripping
        // This preserves MOQ/price semantics like "moq <20kg" -> "moq under 20kg"
        .replace(/<\s*(\d)/g, 'under $1')
        .replace(/>\s*(\d)/g, 'over $1')
        .replace(/<=\s*(\d)/g, 'under $1')
        .replace(/>=\s*(\d)/g, 'over $1')
        // Remove potentially dangerous chars
        .replace(/[<>{}|\\^~[\]`]/g, '')
        .trim()
        .slice(0, 500)
    ); // Limit length
  }

  /**
   * Build Prisma where clause from parsed query
   */
  private buildWhereClause(parsed: ParsedQuery): Prisma.SkuWhereInput {
    const conditions: Prisma.SkuWhereInput[] = [];

    // Base condition: only active SKUs with active products
    conditions.push({
      isActive: true,
      product: {
        status: ProductStatus.ACTIVE,
      },
    });

    // Region filter
    if (parsed.regions.length > 0) {
      conditions.push({
        product: {
          region: {
            name: { in: parsed.regions },
          },
        },
      });
    }

    // Grade filter
    if (parsed.grades.length > 0) {
      conditions.push({
        product: {
          gradeType: {
            code: { in: parsed.grades },
          },
        },
      });
    }

    // Certification filter (array contains any of the requested certs)
    if (parsed.certifications.length > 0) {
      conditions.push({
        product: {
          certifications: {
            hasSome: parsed.certifications,
          },
        },
      });
    }

    // MOQ filter - buyer wants products with MOQ <= their quantity needs
    if (parsed.moqMax !== null) {
      conditions.push({
        product: {
          moqKg: { lte: parsed.moqMax },
        },
      });
    }

    // MOQ minimum - buyer needs at least this much
    if (parsed.moqMin !== null) {
      conditions.push({
        product: {
          moqKg: { gte: parsed.moqMin },
        },
      });
    }

    // Lead time filter
    if (parsed.leadTimeMax !== null) {
      conditions.push({
        product: {
          leadTimeDays: { lte: parsed.leadTimeMax },
        },
      });
    }

    // Price filter (on lowest price tier)
    if (parsed.priceMax !== null || parsed.priceMin !== null) {
      const priceCondition: { lte?: number; gte?: number } = {};
      if (parsed.priceMax !== null) {
        priceCondition.lte = parsed.priceMax;
      }
      if (parsed.priceMin !== null) {
        priceCondition.gte = parsed.priceMin;
      }
      conditions.push({
        priceTiers: {
          some: { pricePerUnit: priceCondition },
        },
      });
    }

    // Keyword search using full-text on product name and seller name
    if (parsed.keywords.length > 0) {
      const keywordConditions: Prisma.SkuWhereInput[] = parsed.keywords.map(
        (keyword) => ({
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            {
              product: {
                name: { contains: keyword, mode: 'insensitive' as const },
              },
            },
            {
              product: {
                seller: {
                  company: {
                    name: { contains: keyword, mode: 'insensitive' as const },
                  },
                },
              },
            },
          ],
        }),
      );
      conditions.push({ AND: keywordConditions });
    }

    return { AND: conditions };
  }

  /**
   * Score a result and generate explanation reasons
   * Only generates reasons for attributes that ACTUALLY exist and match
   */
  private scoreAndExplain(
    result: SearchResult,
    parsed: ParsedQuery,
    isVerifiedSeller: boolean,
    productCreatedAt: Date,
  ): { score: number; reasons: Reason[] } {
    let score = 0;
    const reasons: Reason[] = [];

    // Region match
    if (parsed.regions.length > 0) {
      const regionMatch = parsed.regions.find(
        (r) => r.toLowerCase() === result.origin.toLowerCase(),
      );
      if (regionMatch) {
        score += SCORING_WEIGHTS.EXACT_REGION_MATCH;
        reasons.push({
          field: 'origin',
          matchedValue: result.origin,
          matchRule: 'exact_match',
        });
      }
    }

    // Grade match
    if (parsed.grades.length > 0) {
      // Map grade name to code for comparison
      const gradeCodeMap: Record<string, string> = {
        Ceremonial: 'CEREMONIAL',
        Premium: 'PREMIUM',
        'Cafe Grade': 'CAFE',
        'Culinary A': 'CULINARY_A',
        'Culinary B': 'CULINARY_B',
        Industrial: 'INDUSTRIAL',
      };
      const resultGradeCode = gradeCodeMap[result.grade] || result.grade;
      if (parsed.grades.includes(resultGradeCode)) {
        score += SCORING_WEIGHTS.EXACT_GRADE_MATCH;
        reasons.push({
          field: 'grade',
          matchedValue: result.grade,
          matchRule: 'exact_match',
        });
      }
    }

    // Certification match
    if (parsed.certifications.length > 0 && result.certifications.length > 0) {
      const matchedCerts = result.certifications.filter((cert) =>
        parsed.certifications.some(
          (pc) =>
            cert.toLowerCase().includes(pc.toLowerCase()) ||
            pc.toLowerCase().includes(cert.toLowerCase()),
        ),
      );
      if (matchedCerts.length > 0) {
        score += SCORING_WEIGHTS.CERTIFICATION_MATCH * matchedCerts.length;
        for (const cert of matchedCerts) {
          reasons.push({
            field: 'certification',
            matchedValue: cert,
            matchRule: 'array_contains',
          });
        }
      }
    }

    // MOQ match - only if MOQ constraint was specified AND result meets it
    if (parsed.moqMax !== null && result.moq <= parsed.moqMax) {
      score += SCORING_WEIGHTS.MOQ_WITHIN_RANGE;
      reasons.push({
        field: 'moq',
        matchedValue: result.moq,
        matchRule: 'less_than_or_equal',
      });
    }

    // Lead time match - only if constraint was specified AND result meets it
    if (parsed.leadTimeMax !== null && result.leadTimeDays <= parsed.leadTimeMax) {
      score += SCORING_WEIGHTS.LEAD_TIME_MATCH;
      reasons.push({
        field: 'leadTimeDays',
        matchedValue: result.leadTimeDays,
        matchRule: 'less_than_or_equal',
      });
    }

    // Price match - only if constraint was specified AND result has price AND meets it
    if (result.price !== null) {
      let priceMatches = false;
      if (parsed.priceMax !== null && result.price <= parsed.priceMax) {
        priceMatches = true;
      }
      if (parsed.priceMin !== null && result.price >= parsed.priceMin) {
        priceMatches = true;
      }
      if (priceMatches) {
        score += SCORING_WEIGHTS.PRICE_IN_RANGE;
        reasons.push({
          field: 'price',
          matchedValue: result.price,
          matchRule: 'range_contains',
        });
      }
    }

    // Keyword match in product/seller name
    if (parsed.keywords.length > 0) {
      const combinedText =
        `${result.productName} ${result.sellerName}`.toLowerCase();
      for (const keyword of parsed.keywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
          score += SCORING_WEIGHTS.KEYWORD_MATCH;
          reasons.push({
            field: 'productName',
            matchedValue: keyword,
            matchRule: 'substring_match',
          });
        }
      }
    }

    // Verified seller bonus
    if (isVerifiedSeller) {
      score += SCORING_WEIGHTS.SELLER_VERIFIED;
    }

    // Recent product bonus (created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (productCreatedAt > thirtyDaysAgo) {
      score += SCORING_WEIGHTS.RECENT_PRODUCT;
    }

    return { score, reasons };
  }

  /**
   * Generate helpful suggestion when no results found
   */
  private generateSuggestion(parsed: ParsedQuery): string {
    const suggestions: string[] = [];

    if (parsed.regions.length > 0) {
      suggestions.push('Try removing the region filter');
    }
    if (parsed.grades.length > 0) {
      suggestions.push('Try a different grade (e.g., Premium instead of Ceremonial)');
    }
    if (parsed.certifications.length > 0) {
      suggestions.push('Not all products have certifications - try removing this filter');
    }
    if (parsed.moqMax !== null && parsed.moqMax < 10) {
      suggestions.push('Most products have MOQ of 5-10kg minimum');
    }
    if (parsed.leadTimeMax !== null && parsed.leadTimeMax < 7) {
      suggestions.push('Lead times are typically 7-21 days - try a longer timeframe');
    }
    if (parsed.priceMax !== null && parsed.priceMax < 30) {
      suggestions.push('Prices typically start at $30+/kg for quality matcha');
    }

    if (suggestions.length === 0) {
      return 'Try broader search terms or remove some filters';
    }

    return suggestions.slice(0, 2).join('. ');
  }

  /**
   * Get available filter options for the UI
   */
  async getFilterOptions(): Promise<{
    grades: Array<{ code: string; name: string }>;
    regions: Array<{ name: string; country: string }>;
    certifications: string[];
    moqRange: { min: number; max: number };
    leadTimeRange: { min: number; max: number };
    priceRange: { min: number; max: number };
  }> {
    const [grades, regions, products, priceTiers] = await Promise.all([
      this.prisma.gradeType.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.region.findMany({
        where: { isActive: true },
        select: { name: true, country: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        select: {
          moqKg: true,
          leadTimeDays: true,
          certifications: true,
        },
      }),
      this.prisma.priceTier.findMany({
        select: { pricePerUnit: true },
      }),
    ]);

    // Extract unique certifications
    const allCerts = new Set<string>();
    for (const product of products) {
      for (const cert of product.certifications) {
        allCerts.add(cert);
      }
    }

    // Calculate ranges
    const moqs = products.map((p) => Number(p.moqKg));
    const leadTimes = products.map((p) => p.leadTimeDays);
    const prices = priceTiers.map((p) => Number(p.pricePerUnit));

    return {
      grades,
      regions,
      certifications: Array.from(allCerts).sort(),
      moqRange: {
        min: moqs.length > 0 ? Math.min(...moqs) : 0,
        max: moqs.length > 0 ? Math.max(...moqs) : 100,
      },
      leadTimeRange: {
        min: leadTimes.length > 0 ? Math.min(...leadTimes) : 0,
        max: leadTimes.length > 0 ? Math.max(...leadTimes) : 30,
      },
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 500,
      },
    };
  }
}

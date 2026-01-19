import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ComplianceRule as PrismaComplianceRule } from '@prisma/client';
import type {
  CreateComplianceRuleInput,
  UpdateComplianceRuleInput,
  ComplianceRuleQueryInput,
  EvaluateComplianceInput,
  ComplianceEvaluationResult,
  ComplianceLevel,
} from '@matcha/shared';
import {
  COMPLIANCE_LEVELS,
  DEFAULT_DISCLAIMER_TEXT,
  ISO_COUNTRY_CODES,
  type ISOCountryCode,
} from '@matcha/shared';

/**
 * Compliance Service
 *
 * Handles all compliance-related business logic including:
 * - Rule CRUD operations (admin only)
 * - Compliance evaluation for shipments
 * - Audit trail management
 */
@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== EVALUATION ====================

  /**
   * Evaluate compliance requirements for a shipment
   *
   * @param params - Evaluation parameters including destination, product category, value, weight
   * @returns Compliance evaluation result with required docs, warnings, and compliance level
   */
  async evaluate(params: EvaluateComplianceInput): Promise<ComplianceEvaluationResult> {
    // Validate country code
    if (!this.isValidCountryCode(params.destinationCountry)) {
      throw new NotFoundException(`Invalid country code: ${params.destinationCountry}`);
    }

    // Query matching rules
    const matchingRules = await this.findMatchingRules(
      params.destinationCountry,
      params.productCategory,
      params.declaredValueUsd,
      params.weightKg
    );

    // If no rules match, return empty result with default disclaimer
    if (matchingRules.length === 0) {
      return {
        requiredDocs: [],
        warnings: [],
        flags: [],
        disclaimerText: DEFAULT_DISCLAIMER_TEXT,
        appliedRuleIds: [],
        complianceLevel: COMPLIANCE_LEVELS.LOW,
        missingCertifications: [],
      };
    }

    // Aggregate results from all matching rules
    const requiredDocs = this.deduplicateArray(
      matchingRules.flatMap((rule) => rule.requiredDocs)
    );
    const warnings = this.deduplicateArray(
      matchingRules.flatMap((rule) => rule.warnings)
    );
    const appliedRuleIds = matchingRules.map((rule) => rule.id);

    // Check for missing certifications
    const requiredCertifications = this.deduplicateArray(
      matchingRules.flatMap((rule) => rule.requiredCertifications)
    );
    const missingCertifications = requiredCertifications.filter(
      (cert) => !params.certifications?.includes(cert)
    );

    // Generate flags based on missing certifications
    const flags: string[] = [];
    if (missingCertifications.length > 0) {
      flags.push(`Missing certifications: ${missingCertifications.join(', ')}`);
    }

    // Determine compliance level based on number of rules and flags
    const complianceLevel = this.determineComplianceLevel(
      matchingRules.length,
      flags.length
    );

    // Use disclaimer from first matching rule
    const disclaimerText = matchingRules[0]?.disclaimerText || DEFAULT_DISCLAIMER_TEXT;

    return {
      requiredDocs,
      warnings,
      flags,
      disclaimerText,
      appliedRuleIds,
      complianceLevel,
      missingCertifications,
    };
  }

  /**
   * Evaluate compliance and save the result for audit trail
   *
   * @param params - Evaluation parameters
   * @returns Saved compliance evaluation with result
   */
  async evaluateAndSave(params: EvaluateComplianceInput): Promise<{
    evaluation: Awaited<ReturnType<typeof this.prisma.complianceEvaluation.create>>;
    result: ComplianceEvaluationResult;
  }> {
    const result = await this.evaluate(params);

    const evaluation = await this.prisma.complianceEvaluation.create({
      data: {
        rfqId: params.rfqId || null,
        quoteId: params.quoteId || null,
        orderId: params.orderId || null,
        destinationCountry: params.destinationCountry,
        productCategory: params.productCategory,
        declaredValueUsd: params.declaredValueUsd,
        weightKg: params.weightKg,
        appliedRuleIds: result.appliedRuleIds,
        requiredDocs: result.requiredDocs,
        warnings: result.warnings,
        flags: result.flags,
        disclaimerText: result.disclaimerText,
        complianceLevel: result.complianceLevel,
      },
    });

    return { evaluation, result };
  }

  // ==================== RULE CRUD ====================

  /**
   * Create a new compliance rule
   *
   * @param dto - Rule creation data
   * @param adminId - ID of the admin creating the rule
   * @returns Created compliance rule
   */
  async createRule(
    dto: CreateComplianceRuleInput,
    adminId: string
  ): Promise<PrismaComplianceRule> {
    // Validate country code
    if (!this.isValidCountryCode(dto.destinationCountry)) {
      throw new BadRequestException(`Invalid country code: ${dto.destinationCountry}`);
    }

    // Sanitize disclaimer text (remove potential script tags)
    const sanitizedDisclaimerText = this.sanitizeHtml(dto.disclaimerText);

    return this.prisma.complianceRule.create({
      data: {
        destinationCountry: dto.destinationCountry.toUpperCase(),
        productCategory: dto.productCategory,
        minDeclaredValueUsd: dto.minDeclaredValueUsd ?? null,
        minWeightKg: dto.minWeightKg ?? null,
        maxWeightKg: dto.maxWeightKg ?? null,
        requiredCertifications: dto.requiredCertifications ?? [],
        requiredDocs: dto.requiredDocs,
        warnings: dto.warnings ?? [],
        disclaimerText: sanitizedDisclaimerText,
        isActive: dto.isActive ?? true,
        createdByAdminId: adminId,
      },
    });
  }

  /**
   * Update an existing compliance rule
   *
   * @param ruleId - ID of the rule to update
   * @param dto - Update data
   * @param adminId - ID of the admin updating the rule (for audit)
   * @returns Updated compliance rule
   */
  async updateRule(
    ruleId: string,
    dto: UpdateComplianceRuleInput,
    adminId: string
  ): Promise<PrismaComplianceRule> {
    const existing = await this.prisma.complianceRule.findUnique({
      where: { id: ruleId },
    });

    if (!existing) {
      throw new NotFoundException(`Compliance rule not found: ${ruleId}`);
    }

    // Validate country code if provided
    if (dto.destinationCountry && !this.isValidCountryCode(dto.destinationCountry)) {
      throw new BadRequestException(`Invalid country code: ${dto.destinationCountry}`);
    }

    // Sanitize disclaimer text if provided
    const sanitizedDisclaimerText = dto.disclaimerText
      ? this.sanitizeHtml(dto.disclaimerText)
      : undefined;

    return this.prisma.complianceRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.destinationCountry && {
          destinationCountry: dto.destinationCountry.toUpperCase(),
        }),
        ...(dto.productCategory !== undefined && {
          productCategory: dto.productCategory,
        }),
        ...(dto.minDeclaredValueUsd !== undefined && {
          minDeclaredValueUsd: dto.minDeclaredValueUsd,
        }),
        ...(dto.minWeightKg !== undefined && { minWeightKg: dto.minWeightKg }),
        ...(dto.maxWeightKg !== undefined && { maxWeightKg: dto.maxWeightKg }),
        ...(dto.requiredCertifications !== undefined && {
          requiredCertifications: dto.requiredCertifications,
        }),
        ...(dto.requiredDocs !== undefined && { requiredDocs: dto.requiredDocs }),
        ...(dto.warnings !== undefined && { warnings: dto.warnings }),
        ...(sanitizedDisclaimerText !== undefined && {
          disclaimerText: sanitizedDisclaimerText,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete (soft delete) a compliance rule
   *
   * @param ruleId - ID of the rule to delete
   */
  async deleteRule(ruleId: string): Promise<void> {
    const existing = await this.prisma.complianceRule.findUnique({
      where: { id: ruleId },
    });

    if (!existing) {
      throw new NotFoundException(`Compliance rule not found: ${ruleId}`);
    }

    // Soft delete by setting isActive to false
    await this.prisma.complianceRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  }

  /**
   * Get a single compliance rule by ID
   *
   * @param ruleId - ID of the rule to retrieve
   * @returns Compliance rule or throws NotFoundException
   */
  async getRule(ruleId: string): Promise<PrismaComplianceRule> {
    const rule = await this.prisma.complianceRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Compliance rule not found: ${ruleId}`);
    }

    return rule;
  }

  /**
   * List compliance rules with optional filters and pagination
   *
   * @param query - Query parameters including filters and pagination
   * @returns Paginated list of compliance rules
   */
  async listRules(query: ComplianceRuleQueryInput): Promise<{
    data: PrismaComplianceRule[];
    meta: {
      total: number;
      skip: number;
      take: number;
      totalPages: number;
    };
  }> {
    const { destinationCountry, productCategory, activeOnly, skip, take } = query;

    const where: Prisma.ComplianceRuleWhereInput = {};

    if (destinationCountry) {
      where.destinationCountry = destinationCountry.toUpperCase();
    }

    if (productCategory) {
      where.productCategory = {
        contains: productCategory,
        mode: 'insensitive',
      };
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.complianceRule.findMany({
        where,
        skip,
        take,
        orderBy: [
          { destinationCountry: 'asc' },
          { productCategory: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.complianceRule.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        skip,
        take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // ==================== AUDIT TRAIL ====================

  /**
   * Save a compliance evaluation for audit purposes
   *
   * @param evaluation - Evaluation data to save
   * @returns Created compliance evaluation record
   */
  async saveEvaluation(evaluation: {
    rfqId?: string;
    quoteId?: string;
    orderId?: string;
    destinationCountry: string;
    productCategory: string;
    declaredValueUsd: number;
    weightKg: number;
    result: ComplianceEvaluationResult;
  }) {
    return this.prisma.complianceEvaluation.create({
      data: {
        rfqId: evaluation.rfqId || null,
        quoteId: evaluation.quoteId || null,
        orderId: evaluation.orderId || null,
        destinationCountry: evaluation.destinationCountry,
        productCategory: evaluation.productCategory,
        declaredValueUsd: evaluation.declaredValueUsd,
        weightKg: evaluation.weightKg,
        appliedRuleIds: evaluation.result.appliedRuleIds,
        requiredDocs: evaluation.result.requiredDocs,
        warnings: evaluation.result.warnings,
        flags: evaluation.result.flags,
        disclaimerText: evaluation.result.disclaimerText,
        complianceLevel: evaluation.result.complianceLevel,
      },
    });
  }

  /**
   * Get compliance evaluations for a specific RFQ
   *
   * @param rfqId - RFQ ID
   * @returns List of compliance evaluations
   */
  async getEvaluationsByRfq(rfqId: string) {
    return this.prisma.complianceEvaluation.findMany({
      where: { rfqId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  /**
   * Get compliance evaluations for a specific Quote
   *
   * @param quoteId - Quote ID
   * @returns List of compliance evaluations
   */
  async getEvaluationsByQuote(quoteId: string) {
    return this.prisma.complianceEvaluation.findMany({
      where: { quoteId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  /**
   * Get compliance evaluations for a specific Order
   *
   * @param orderId - Order ID
   * @returns List of compliance evaluations
   */
  async getEvaluationsByOrder(orderId: string) {
    return this.prisma.complianceEvaluation.findMany({
      where: { orderId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Find all matching compliance rules based on criteria
   */
  private async findMatchingRules(
    destinationCountry: string,
    productCategory: string,
    declaredValueUsd: number,
    weightKg: number
  ): Promise<PrismaComplianceRule[]> {
    // Get all potentially matching rules (active, matching country and category)
    const candidates = await this.prisma.complianceRule.findMany({
      where: {
        destinationCountry: destinationCountry.toUpperCase(),
        productCategory: productCategory,
        isActive: true,
      },
    });

    // Filter by threshold criteria
    return candidates.filter((rule) => {
      // Check minDeclaredValueUsd threshold
      if (rule.minDeclaredValueUsd !== null) {
        const minValue = Number(rule.minDeclaredValueUsd);
        if (declaredValueUsd < minValue) {
          return false;
        }
      }

      // Check minWeightKg threshold
      if (rule.minWeightKg !== null) {
        const minWeight = Number(rule.minWeightKg);
        if (weightKg < minWeight) {
          return false;
        }
      }

      // Check maxWeightKg threshold
      if (rule.maxWeightKg !== null) {
        const maxWeight = Number(rule.maxWeightKg);
        if (weightKg > maxWeight) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Remove duplicate values from an array while preserving order
   */
  private deduplicateArray<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  /**
   * Determine compliance level based on rule count and flags
   */
  private determineComplianceLevel(
    ruleCount: number,
    flagCount: number
  ): ComplianceLevel {
    // High compliance: 3+ rules or any flags
    if (ruleCount >= 3 || flagCount > 0) {
      return COMPLIANCE_LEVELS.HIGH;
    }

    // Medium compliance: 2 rules
    if (ruleCount === 2) {
      return COMPLIANCE_LEVELS.MEDIUM;
    }

    // Low compliance: 0-1 rules
    return COMPLIANCE_LEVELS.LOW;
  }

  /**
   * Validate ISO country code
   */
  private isValidCountryCode(code: string): boolean {
    return ISO_COUNTRY_CODES.includes(code.toUpperCase() as ISOCountryCode);
  }

  /**
   * Sanitize HTML to prevent XSS attacks
   * Removes script tags and event handlers
   */
  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }
}

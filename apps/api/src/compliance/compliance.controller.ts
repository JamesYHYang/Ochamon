import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ComplianceService } from './compliance.service';
import { AuditService } from '../audit/audit.service';
import {
  EvaluateComplianceSchema,
  CreateComplianceRuleSchema,
  UpdateComplianceRuleSchema,
  ComplianceRuleQuerySchema,
  type EvaluateComplianceInput,
  type CreateComplianceRuleInput,
  type UpdateComplianceRuleInput,
  type ComplianceRuleQueryInput,
} from '@matcha/shared';

/**
 * Compliance Controller
 *
 * Endpoints for:
 * - Public compliance evaluation (authenticated users)
 * - Admin compliance rule management (ADMIN only)
 */
@ApiTags('compliance')
@Controller()
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService,
  ) {}

  // ==================== PUBLIC EVALUATION ENDPOINTS ====================

  /**
   * Evaluate compliance requirements for a shipment
   * Available to any authenticated user (BUYER, SELLER, ADMIN)
   */
  @Post('compliance/evaluate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Evaluate compliance requirements for a shipment' })
  @ApiResponse({ status: 200, description: 'Compliance evaluation result' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Invalid country code' })
  async evaluateCompliance(
    @Body(new ZodValidationPipe(EvaluateComplianceSchema))
    dto: EvaluateComplianceInput,
  ) {
    // Evaluate and save for audit trail
    const { result, evaluation } = await this.complianceService.evaluateAndSave(dto);
    return {
      ...result,
      evaluationId: evaluation.id,
    };
  }

  /**
   * Get compliance evaluations for a specific RFQ
   */
  @Get('compliance/rfq/:rfqId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get compliance evaluations for an RFQ' })
  async getComplianceByRfq(@Param('rfqId') rfqId: string) {
    return this.complianceService.getEvaluationsByRfq(rfqId);
  }

  /**
   * Get compliance evaluations for a specific Quote
   */
  @Get('compliance/quote/:quoteId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get compliance evaluations for a Quote' })
  async getComplianceByQuote(@Param('quoteId') quoteId: string) {
    return this.complianceService.getEvaluationsByQuote(quoteId);
  }

  /**
   * Get compliance evaluations for a specific Order
   */
  @Get('compliance/order/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get compliance evaluations for an Order' })
  async getComplianceByOrder(@Param('orderId') orderId: string) {
    return this.complianceService.getEvaluationsByOrder(orderId);
  }

  // ==================== ADMIN RULE MANAGEMENT ENDPOINTS ====================

  /**
   * Create a new compliance rule (ADMIN only)
   */
  @Post('admin/compliance-rules')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new compliance rule (Admin only)' })
  @ApiResponse({ status: 201, description: 'Compliance rule created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createRule(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateComplianceRuleSchema))
    dto: CreateComplianceRuleInput,
    @Req() req: Request,
  ) {
    const rule = await this.complianceService.createRule(dto, user.id);

    await this.auditService.logCreate(
      'ComplianceRule',
      rule.id,
      `Created compliance rule for ${dto.destinationCountry} - ${dto.productCategory}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { destinationCountry: dto.destinationCountry, productCategory: dto.productCategory },
    );

    return rule;
  }

  /**
   * List compliance rules with optional filters (ADMIN only)
   */
  @Get('admin/compliance-rules')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List compliance rules (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of compliance rules' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async listRules(
    @Query(new ZodValidationPipe(ComplianceRuleQuerySchema))
    query: ComplianceRuleQueryInput,
  ) {
    return this.complianceService.listRules(query);
  }

  /**
   * Get a single compliance rule by ID (ADMIN only)
   */
  @Get('admin/compliance-rules/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get compliance rule by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Compliance rule details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Param('id') id: string) {
    return this.complianceService.getRule(id);
  }

  /**
   * Update a compliance rule (ADMIN only)
   */
  @Put('admin/compliance-rules/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a compliance rule (Admin only)' })
  @ApiResponse({ status: 200, description: 'Compliance rule updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateComplianceRuleSchema))
    dto: UpdateComplianceRuleInput,
    @Req() req: Request,
  ) {
    const rule = await this.complianceService.updateRule(id, dto, user.id);

    await this.auditService.logUpdate(
      'ComplianceRule',
      id,
      `Updated compliance rule ${id}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { changes: dto },
    );

    return rule;
  }

  /**
   * Delete (soft delete) a compliance rule (ADMIN only)
   */
  @Delete('admin/compliance-rules/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a compliance rule (Admin only)' })
  @ApiResponse({ status: 200, description: 'Compliance rule deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRule(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    await this.complianceService.deleteRule(id);

    await this.auditService.logDelete(
      'ComplianceRule',
      id,
      `Deleted (deactivated) compliance rule ${id}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return { success: true, message: 'Compliance rule deleted' };
  }
}

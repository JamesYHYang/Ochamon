import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import {
  ListAuditLogsQueryDto,
  PaginatedAuditLogsResponseDto,
  AuditLogResponseDto,
  AuditAction,
} from './dto';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs',
    description: 'Retrieve paginated audit logs with optional filtering',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit logs',
    type: PaginatedAuditLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async listAuditLogs(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    return this.auditService.listAuditLogs(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log entry',
  })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log entry',
    type: AuditLogResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLog(@Param('id') id: string): Promise<AuditLogResponseDto> {
    const log = await this.auditService.getAuditLogById(id);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return log as AuditLogResponseDto;
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get entity history',
    description: 'Retrieve audit history for a specific entity',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type (e.g., ComplianceRule)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs for the entity',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getEntityHistory(
      entityType,
      entityId,
    ) as Promise<AuditLogResponseDto[]>;
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user activity',
    description: 'Retrieve recent audit activity for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of recent audit logs for the user',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getUserActivity(
      userId,
      limit,
    ) as Promise<AuditLogResponseDto[]>;
  }
}

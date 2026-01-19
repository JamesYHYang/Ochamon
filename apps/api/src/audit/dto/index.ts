import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  PUBLISH = 'PUBLISH',
  UNPUBLISH = 'UNPUBLISH',
  TOGGLE = 'TOGGLE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export class CreateAuditLogDto {
  @ApiProperty({ enum: AuditAction })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ example: 'ComplianceRule' })
  @IsString()
  entityType: string;

  @ApiPropertyOptional({ example: 'abc123' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ example: 'Created new compliance rule for US market' })
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ example: 'ComplianceRule' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AuditAction })
  action: string;

  @ApiProperty()
  entityType: string;

  @ApiPropertyOptional({ nullable: true })
  entityId: string | null;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ nullable: true })
  metadata: unknown;

  @ApiPropertyOptional({ nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data: AuditLogResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
}

import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { JwtAuthGuard } from '../auth/guards';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  EstimateRequestSchema,
  EstimateRfqRequestSchema,
  type EstimateRequestInput,
  type EstimateRfqRequestInput,
} from '@matcha/shared';

@ApiTags('Logistics')
@ApiBearerAuth()
@Controller('logistics')
@UseGuards(JwtAuthGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  /**
   * Calculate shipping estimates for a shipment
   */
  @Post('estimate')
  @ApiOperation({
    summary: 'Get shipping estimates',
    description: 'Calculate shipping estimates from multiple providers based on shipment parameters',
  })
  @ApiBody({
    description: 'Shipment parameters for estimate calculation',
    schema: {
      type: 'object',
      required: ['originCountry', 'destinationCountry', 'weightKg', 'dimensionsCm', 'declaredValue'],
      properties: {
        originCountry: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code',
          example: 'JP',
        },
        originPostal: {
          type: 'string',
          description: 'Origin postal/zip code (optional)',
          example: '611-0011',
        },
        destinationCountry: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code',
          example: 'SG',
        },
        destinationPostal: {
          type: 'string',
          description: 'Destination postal/zip code (optional)',
          example: '018956',
        },
        weightKg: {
          type: 'number',
          description: 'Total shipment weight in kilograms',
          example: 5.5,
        },
        dimensionsCm: {
          type: 'object',
          required: ['length', 'width', 'height'],
          properties: {
            length: { type: 'number', example: 40 },
            width: { type: 'number', example: 30 },
            height: { type: 'number', example: 20 },
          },
        },
        declaredValue: {
          type: 'number',
          description: 'Declared value in USD',
          example: 500,
        },
        serviceLevel: {
          type: 'string',
          enum: ['economy', 'standard', 'express', 'overnight'],
          default: 'standard',
          description: 'Desired service level',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shipping estimates calculated successfully',
    schema: {
      type: 'object',
      properties: {
        estimates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              providerId: { type: 'string', example: 'ups' },
              providerName: { type: 'string', example: 'UPS' },
              service: { type: 'string', example: 'UPS Worldwide Expedited' },
              costMin: { type: 'number', example: 45.50 },
              costMax: { type: 'number', example: 65.00 },
              currency: { type: 'string', example: 'USD' },
              etaDaysMin: { type: 'number', example: 5 },
              etaDaysMax: { type: 'number', example: 10 },
              notes: { type: 'string', example: 'High value item handling surcharge applied' },
            },
          },
        },
        calculatedWeightKg: { type: 'number', example: 5.5 },
        calculationDetails: {
          type: 'object',
          properties: {
            originCountry: { type: 'string', example: 'JP' },
            destinationCountry: { type: 'string', example: 'SG' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async estimate(
    @Body(new ZodValidationPipe(EstimateRequestSchema)) input: EstimateRequestInput,
  ) {
    return this.logisticsService.estimate(input);
  }

  /**
   * Calculate shipping estimates for an RFQ
   * Automatically calculates weight from RFQ line items
   */
  @Post('estimate-rfq')
  @ApiOperation({
    summary: 'Get shipping estimates for an RFQ',
    description: 'Calculate shipping estimates based on RFQ line items. Weight is automatically calculated from SKU data.',
  })
  @ApiBody({
    description: 'RFQ shipping estimate request',
    schema: {
      type: 'object',
      required: ['rfqId', 'dimensionsCm'],
      properties: {
        rfqId: {
          type: 'string',
          description: 'RFQ ID to calculate shipping for',
          example: 'clxxx...',
        },
        originCountry: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code (default: JP)',
          example: 'JP',
        },
        originPostal: {
          type: 'string',
          description: 'Origin postal/zip code (optional)',
          example: '611-0011',
        },
        destinationPostal: {
          type: 'string',
          description: 'Destination postal/zip code (optional)',
          example: '018956',
        },
        dimensionsCm: {
          type: 'object',
          required: ['length', 'width', 'height'],
          properties: {
            length: { type: 'number', example: 40 },
            width: { type: 'number', example: 30 },
            height: { type: 'number', example: 20 },
          },
        },
        serviceLevel: {
          type: 'string',
          enum: ['economy', 'standard', 'express', 'overnight'],
          default: 'standard',
          description: 'Desired service level',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shipping estimates calculated successfully',
    schema: {
      type: 'object',
      properties: {
        estimates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              providerId: { type: 'string' },
              providerName: { type: 'string' },
              service: { type: 'string' },
              costMin: { type: 'number' },
              costMax: { type: 'number' },
              currency: { type: 'string' },
              etaDaysMin: { type: 'number' },
              etaDaysMax: { type: 'number' },
              notes: { type: 'string' },
            },
          },
        },
        calculatedWeightKg: { type: 'number' },
        calculationDetails: {
          type: 'object',
          properties: {
            originCountry: { type: 'string' },
            destinationCountry: { type: 'string' },
            weightBreakdown: {
              type: 'object',
              properties: {
                itemsWeightKg: { type: 'number' },
                packingAllowanceKg: { type: 'number' },
                totalWeightKg: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async estimateFromRfq(
    @Body(new ZodValidationPipe(EstimateRfqRequestSchema)) input: EstimateRfqRequestInput,
  ) {
    return this.logisticsService.estimateFromRfq(input);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TrendSeries, TrendPoint } from '@prisma/client';
import type {
  CreateTrendSeriesInput,
  UpdateTrendSeriesInput,
  CreateTrendPointInput,
  UpdateTrendPointInput,
  TrendsQueryInput,
} from '@matcha/shared';

/**
 * Trends Service
 *
 * Handles all trend series and data point related business logic including:
 * - Public trends listing and data retrieval
 * - Admin CRUD operations for series and data points
 * - Time-series data aggregation
 */
@Injectable()
export class TrendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== PUBLIC METHODS ====================

  /**
   * Get active trend series for public display
   *
   * @param query - Query parameters including filters
   * @returns Paginated list of active trend series
   */
  async getTrendSeries(query: TrendsQueryInput): Promise<{
    data: TrendSeries[];
    meta: { total: number; skip: number; take: number; totalPages: number };
  }> {
    const { type, regionId, skip, take } = query;

    const where: Prisma.TrendSeriesWhereInput = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    if (regionId) {
      where.regionId = regionId;
    }

    const [data, total] = await Promise.all([
      this.prisma.trendSeries.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          region: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
      }),
      this.prisma.trendSeries.count({ where }),
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

  /**
   * Get a single trend series with its data points
   *
   * @param id - Trend series ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Trend series with data points
   */
  async getTrendSeriesById(
    id: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendSeries & { dataPoints: TrendPoint[] }> {
    const dateFilter: Prisma.TrendPointWhereInput = {};

    if (startDate && endDate) {
      dateFilter.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      dateFilter.date = { gte: startDate };
    } else if (endDate) {
      dateFilter.date = { lte: endDate };
    }

    const series = await this.prisma.trendSeries.findUnique({
      where: { id },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        dataPoints: {
          where: dateFilter,
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!series) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    if (!series.isActive) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    return series;
  }

  /**
   * Get latest data points for all active series (dashboard view)
   *
   * @param limit - Number of latest points per series
   * @returns Series with latest data points
   */
  async getLatestTrends(limit: number = 10): Promise<TrendSeries[]> {
    const series = await this.prisma.trendSeries.findMany({
      where: { isActive: true },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        dataPoints: {
          orderBy: { date: 'desc' },
          take: limit,
        },
      },
    });

    // Reverse data points to chronological order
    return series.map((s) => ({
      ...s,
      dataPoints: s.dataPoints.reverse(),
    }));
  }

  /**
   * Get available trend types for filtering
   */
  async getTrendTypes(): Promise<string[]> {
    const types = await this.prisma.trendSeries.findMany({
      where: { isActive: true },
      select: { type: true },
      distinct: ['type'],
    });

    return types.map((t) => t.type);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * List all trend series for admin (including inactive)
   *
   * @param query - Query parameters
   * @returns Paginated list of all trend series
   */
  async listAdminTrendSeries(query: TrendsQueryInput): Promise<{
    data: TrendSeries[];
    meta: { total: number; skip: number; take: number; totalPages: number };
  }> {
    const { type, regionId, isPublic, skip, take } = query;

    const where: Prisma.TrendSeriesWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (regionId) {
      where.regionId = regionId;
    }

    if (isPublic !== undefined) {
      where.isActive = isPublic;
    }

    const [data, total] = await Promise.all([
      this.prisma.trendSeries.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          region: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
          _count: {
            select: { dataPoints: true },
          },
        },
      }),
      this.prisma.trendSeries.count({ where }),
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

  /**
   * Get a single trend series by ID (admin)
   *
   * @param id - Trend series ID
   * @returns Full trend series with data points
   */
  async getAdminTrendSeriesById(
    id: string
  ): Promise<TrendSeries & { dataPoints: TrendPoint[] }> {
    const series = await this.prisma.trendSeries.findUnique({
      where: { id },
      include: {
        region: true,
        dataPoints: {
          orderBy: { date: 'desc' },
          take: 100, // Limit for admin view
        },
      },
    });

    if (!series) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    return series;
  }

  /**
   * Create a new trend series (admin only)
   *
   * @param dto - Trend series creation data
   * @returns Created trend series
   */
  async createTrendSeries(dto: CreateTrendSeriesInput): Promise<TrendSeries> {
    // Validate region if provided
    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) {
        throw new BadRequestException(`Region not found: ${dto.regionId}`);
      }
    }

    return this.prisma.trendSeries.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        type: dto.type,
        unit: dto.unit,
        isActive: dto.isActive ?? true,
        regionId: dto.regionId || null,
      },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing trend series (admin only)
   *
   * @param id - Trend series ID
   * @param dto - Update data
   * @returns Updated trend series
   */
  async updateTrendSeries(
    id: string,
    dto: UpdateTrendSeriesInput
  ): Promise<TrendSeries> {
    const existing = await this.prisma.trendSeries.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    // Validate region if being updated
    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) {
        throw new BadRequestException(`Region not found: ${dto.regionId}`);
      }
    }

    return this.prisma.trendSeries.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type && { type: dto.type }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.regionId !== undefined && { regionId: dto.regionId }),
      },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });
  }

  /**
   * Delete a trend series (admin only)
   *
   * @param id - Trend series ID
   */
  async deleteTrendSeries(id: string): Promise<void> {
    const existing = await this.prisma.trendSeries.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    await this.prisma.trendSeries.delete({
      where: { id },
    });
  }

  /**
   * Toggle trend series active status
   *
   * @param id - Trend series ID
   * @returns Updated trend series
   */
  async toggleTrendSeriesActive(id: string): Promise<TrendSeries> {
    const existing = await this.prisma.trendSeries.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Trend series not found: ${id}`);
    }

    return this.prisma.trendSeries.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });
  }

  // ==================== DATA POINT METHODS ====================

  /**
   * Add a data point to a trend series
   *
   * @param seriesId - Trend series ID
   * @param dto - Data point creation data
   * @returns Created data point
   */
  async addTrendPoint(
    seriesId: string,
    dto: CreateTrendPointInput
  ): Promise<TrendPoint> {
    const series = await this.prisma.trendSeries.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException(`Trend series not found: ${seriesId}`);
    }

    return this.prisma.trendPoint.create({
      data: {
        date: new Date(dto.date),
        value: dto.value,
        unit: dto.unit,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        seriesId,
      },
    });
  }

  /**
   * Bulk add data points to a trend series
   *
   * @param seriesId - Trend series ID
   * @param points - Array of data points to add
   * @returns Count of created points
   */
  async bulkAddTrendPoints(
    seriesId: string,
    points: CreateTrendPointInput[]
  ): Promise<{ count: number }> {
    const series = await this.prisma.trendSeries.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException(`Trend series not found: ${seriesId}`);
    }

    const result = await this.prisma.trendPoint.createMany({
      data: points.map((p) => ({
        date: new Date(p.date),
        value: p.value,
        unit: p.unit,
        metadata: p.metadata ? (p.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        seriesId,
      })),
    });

    return { count: result.count };
  }

  /**
   * Update a data point
   *
   * @param pointId - Data point ID
   * @param dto - Update data
   * @returns Updated data point
   */
  async updateTrendPoint(
    pointId: string,
    dto: UpdateTrendPointInput
  ): Promise<TrendPoint> {
    const existing = await this.prisma.trendPoint.findUnique({
      where: { id: pointId },
    });

    if (!existing) {
      throw new NotFoundException(`Trend point not found: ${pointId}`);
    }

    const updateData: Prisma.TrendPointUpdateInput = {};

    if (dto.date) {
      updateData.date = new Date(dto.date);
    }
    if (dto.value !== undefined) {
      updateData.value = dto.value;
    }
    if (dto.unit) {
      updateData.unit = dto.unit;
    }
    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull;
    }

    return this.prisma.trendPoint.update({
      where: { id: pointId },
      data: updateData,
    });
  }

  /**
   * Delete a data point
   *
   * @param pointId - Data point ID
   */
  async deleteTrendPoint(pointId: string): Promise<void> {
    const existing = await this.prisma.trendPoint.findUnique({
      where: { id: pointId },
    });

    if (!existing) {
      throw new NotFoundException(`Trend point not found: ${pointId}`);
    }

    await this.prisma.trendPoint.delete({
      where: { id: pointId },
    });
  }

  /**
   * Get data points for a series within a date range
   *
   * @param seriesId - Trend series ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of data points
   */
  async getDataPoints(
    seriesId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TrendPoint[]> {
    const where: Prisma.TrendPointWhereInput = {
      seriesId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    return this.prisma.trendPoint.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }
}

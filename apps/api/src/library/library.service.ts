import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Region, GradeType } from '@prisma/client';

/**
 * Library Service
 *
 * Handles reference data for regions and grade types.
 * Provides read-only access to lookup data for the public site.
 */
@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== REGIONS ====================

  /**
   * Get all active regions
   *
   * @returns List of active regions
   */
  async getRegions(): Promise<Region[]> {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single region by ID with associated products count
   *
   * @param id - Region ID
   * @returns Region with product count
   */
  async getRegionById(id: string): Promise<Region & { _count: { products: number } }> {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!region) {
      throw new NotFoundException(`Region not found: ${id}`);
    }

    if (!region.isActive) {
      throw new NotFoundException(`Region not found: ${id}`);
    }

    return region;
  }

  /**
   * Get regions with product counts for display
   *
   * @returns Regions with their product counts
   */
  async getRegionsWithCounts(): Promise<(Region & { _count: { products: number } })[]> {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Get distinct countries from regions
   *
   * @returns List of unique countries
   */
  async getCountries(): Promise<string[]> {
    const regions = await this.prisma.region.findMany({
      where: { isActive: true },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' },
    });

    return regions.map((r) => r.country);
  }

  /**
   * Get regions by country
   *
   * @param country - Country name
   * @returns Regions in the specified country
   */
  async getRegionsByCountry(country: string): Promise<Region[]> {
    return this.prisma.region.findMany({
      where: {
        isActive: true,
        country: {
          equals: country,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ==================== GRADE TYPES ====================

  /**
   * Get all active grade types
   *
   * @returns List of active grade types sorted by sort order
   */
  async getGradeTypes(): Promise<GradeType[]> {
    return this.prisma.gradeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get a single grade type by ID
   *
   * @param id - Grade type ID
   * @returns Grade type with product count
   */
  async getGradeTypeById(id: string): Promise<GradeType & { _count: { products: number } }> {
    const gradeType = await this.prisma.gradeType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!gradeType) {
      throw new NotFoundException(`Grade type not found: ${id}`);
    }

    if (!gradeType.isActive) {
      throw new NotFoundException(`Grade type not found: ${id}`);
    }

    return gradeType;
  }

  /**
   * Get a grade type by code
   *
   * @param code - Grade type code
   * @returns Grade type
   */
  async getGradeTypeByCode(code: string): Promise<GradeType> {
    const gradeType = await this.prisma.gradeType.findUnique({
      where: { code },
    });

    if (!gradeType) {
      throw new NotFoundException(`Grade type not found: ${code}`);
    }

    if (!gradeType.isActive) {
      throw new NotFoundException(`Grade type not found: ${code}`);
    }

    return gradeType;
  }

  /**
   * Get grade types with product counts for display
   *
   * @returns Grade types with their product counts
   */
  async getGradeTypesWithCounts(): Promise<(GradeType & { _count: { products: number } })[]> {
    return this.prisma.gradeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get all regions for admin (including inactive)
   */
  async getAdminRegions(): Promise<(Region & { _count: { products: number; trendSeries: number } })[]> {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: true,
            trendSeries: true,
          },
        },
      },
    });
  }

  /**
   * Get all grade types for admin (including inactive)
   */
  async getAdminGradeTypes(): Promise<(GradeType & { _count: { products: number } })[]> {
    return this.prisma.gradeType.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active regions
   */
  async getRegions() {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        country: true,
        description: true,
      },
    });
  }

  /**
   * Get all active grade types
   */
  async getGrades() {
    return this.prisma.gradeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
    });
  }

  /**
   * Get available certifications (extracted from products)
   */
  async getCertifications() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { certifications: true },
    });

    const certSet = new Set<string>();
    products.forEach((p) => p.certifications.forEach((c) => certSet.add(c)));

    return Array.from(certSet).sort().map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }));
  }
}

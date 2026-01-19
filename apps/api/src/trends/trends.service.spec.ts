import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrendsService', () => {
  let service: TrendsService;
  let prismaService: PrismaService;

  // Mock data
  const mockRegion = {
    id: 'region-1',
    name: 'Uji',
    country: 'Japan',
    description: 'Famous tea region',
  };

  const mockTrendSeries = {
    id: 'series-1',
    name: 'Uji Matcha Pricing Index',
    description: 'Monthly pricing trends for Uji matcha',
    type: 'PRICING',
    unit: 'USD/kg',
    isActive: true,
    regionId: 'region-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    region: mockRegion,
    dataPoints: [],
  };

  const mockInactiveSeries = {
    ...mockTrendSeries,
    id: 'series-2',
    name: 'Inactive Series',
    isActive: false,
  };

  const mockTrendPoint = {
    id: 'point-1',
    date: new Date('2024-01-15'),
    value: 150.5,
    unit: 'USD/kg',
    metadata: null,
    seriesId: 'series-1',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    trendSeries: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    trendPoint: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    region: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TrendsService>(TrendsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getTrendSeries', () => {
    it('should return paginated active trend series', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([mockTrendSeries]);
      mockPrismaService.trendSeries.count.mockResolvedValue(1);

      const result = await service.getTrendSeries({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.trendSeries.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should filter by type', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([mockTrendSeries]);
      mockPrismaService.trendSeries.count.mockResolvedValue(1);

      await service.getTrendSeries({
        skip: 0,
        take: 20,
        type: 'PRICING',
      });

      expect(mockPrismaService.trendSeries.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'PRICING',
          }),
        })
      );
    });

    it('should filter by region', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([mockTrendSeries]);
      mockPrismaService.trendSeries.count.mockResolvedValue(1);

      await service.getTrendSeries({
        skip: 0,
        take: 20,
        regionId: 'region-1',
      });

      expect(mockPrismaService.trendSeries.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            regionId: 'region-1',
          }),
        })
      );
    });
  });

  describe('getTrendSeriesById', () => {
    it('should return a trend series with data points', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue({
        ...mockTrendSeries,
        dataPoints: [mockTrendPoint],
      });

      const result = await service.getTrendSeriesById('series-1');

      expect(result.id).toBe('series-1');
      expect(result.dataPoints).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(null);

      await expect(service.getTrendSeriesById('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for inactive series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockInactiveSeries);

      await expect(service.getTrendSeriesById('series-2')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should filter data points by date range', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue({
        ...mockTrendSeries,
        dataPoints: [mockTrendPoint],
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getTrendSeriesById('series-1', startDate, endDate);

      expect(mockPrismaService.trendSeries.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            dataPoints: expect.objectContaining({
              where: expect.objectContaining({
                date: { gte: startDate, lte: endDate },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('getLatestTrends', () => {
    it('should return latest data points for all active series', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([
        {
          ...mockTrendSeries,
          dataPoints: [mockTrendPoint],
        },
      ]);

      const result = await service.getLatestTrends(10);

      expect(result).toHaveLength(1);
      expect((result[0] as any).dataPoints).toBeDefined();
    });
  });

  describe('getTrendTypes', () => {
    it('should return distinct trend types', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([
        { type: 'PRICING' },
        { type: 'WEATHER' },
      ]);

      const result = await service.getTrendTypes();

      expect(result).toContain('PRICING');
      expect(result).toContain('WEATHER');
    });
  });

  describe('listAdminTrendSeries', () => {
    it('should return all series including inactive for admin', async () => {
      mockPrismaService.trendSeries.findMany.mockResolvedValue([
        mockTrendSeries,
        mockInactiveSeries,
      ]);
      mockPrismaService.trendSeries.count.mockResolvedValue(2);

      const result = await service.listAdminTrendSeries({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('createTrendSeries', () => {
    it('should create a new trend series', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(mockRegion);
      mockPrismaService.trendSeries.create.mockResolvedValue(mockTrendSeries);

      const result = await service.createTrendSeries({
        name: 'Uji Matcha Pricing Index',
        type: 'PRICING',
        unit: 'USD/kg',
        regionId: 'region-1',
        isActive: true,
      });

      expect(result.id).toBe('series-1');
      expect(mockPrismaService.trendSeries.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-existent region', async () => {
      mockPrismaService.region.findUnique.mockResolvedValue(null);

      await expect(
        service.createTrendSeries({
          name: 'Test Series',
          type: 'PRICING',
          unit: 'USD/kg',
          regionId: 'non-existent',
          isActive: true,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create series without region', async () => {
      mockPrismaService.trendSeries.create.mockResolvedValue({
        ...mockTrendSeries,
        regionId: null,
      });

      const result = await service.createTrendSeries({
        name: 'Global Index',
        type: 'DEMAND',
        unit: '%',
        isActive: true,
      });

      expect(mockPrismaService.trendSeries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            regionId: null,
          }),
        })
      );
    });
  });

  describe('updateTrendSeries', () => {
    it('should update an existing series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockTrendSeries);
      mockPrismaService.trendSeries.update.mockResolvedValue({
        ...mockTrendSeries,
        name: 'Updated Name',
      });

      const result = await service.updateTrendSeries('series-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTrendSeries('non-existent', { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTrendSeries', () => {
    it('should delete a series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockTrendSeries);
      mockPrismaService.trendSeries.delete.mockResolvedValue(mockTrendSeries);

      await service.deleteTrendSeries('series-1');

      expect(mockPrismaService.trendSeries.delete).toHaveBeenCalledWith({
        where: { id: 'series-1' },
      });
    });

    it('should throw NotFoundException for non-existent series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(null);

      await expect(service.deleteTrendSeries('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('toggleTrendSeriesActive', () => {
    it('should toggle active status from true to false', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockTrendSeries);
      mockPrismaService.trendSeries.update.mockResolvedValue({
        ...mockTrendSeries,
        isActive: false,
      });

      const result = await service.toggleTrendSeriesActive('series-1');

      expect(result.isActive).toBe(false);
    });

    it('should toggle active status from false to true', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockInactiveSeries);
      mockPrismaService.trendSeries.update.mockResolvedValue({
        ...mockInactiveSeries,
        isActive: true,
      });

      const result = await service.toggleTrendSeriesActive('series-2');

      expect(result.isActive).toBe(true);
    });
  });

  describe('addTrendPoint', () => {
    it('should add a data point to a series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockTrendSeries);
      mockPrismaService.trendPoint.create.mockResolvedValue(mockTrendPoint);

      const result = await service.addTrendPoint('series-1', {
        date: '2024-01-15',
        value: 150.5,
        unit: 'USD/kg',
      });

      expect(result.id).toBe('point-1');
      expect(result.value).toBe(150.5);
    });

    it('should throw NotFoundException for non-existent series', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(null);

      await expect(
        service.addTrendPoint('non-existent', {
          date: '2024-01-15',
          value: 100,
          unit: 'USD/kg',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkAddTrendPoints', () => {
    it('should add multiple data points at once', async () => {
      mockPrismaService.trendSeries.findUnique.mockResolvedValue(mockTrendSeries);
      mockPrismaService.trendPoint.createMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkAddTrendPoints('series-1', [
        { date: '2024-01-15', value: 150, unit: 'USD/kg' },
        { date: '2024-01-16', value: 152, unit: 'USD/kg' },
        { date: '2024-01-17', value: 148, unit: 'USD/kg' },
      ]);

      expect(result.count).toBe(3);
    });
  });

  describe('updateTrendPoint', () => {
    it('should update a data point', async () => {
      mockPrismaService.trendPoint.findUnique.mockResolvedValue(mockTrendPoint);
      mockPrismaService.trendPoint.update.mockResolvedValue({
        ...mockTrendPoint,
        value: 160,
      });

      const result = await service.updateTrendPoint('point-1', { value: 160 });

      expect(result.value).toBe(160);
    });

    it('should throw NotFoundException for non-existent point', async () => {
      mockPrismaService.trendPoint.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTrendPoint('non-existent', { value: 100 })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTrendPoint', () => {
    it('should delete a data point', async () => {
      mockPrismaService.trendPoint.findUnique.mockResolvedValue(mockTrendPoint);
      mockPrismaService.trendPoint.delete.mockResolvedValue(mockTrendPoint);

      await service.deleteTrendPoint('point-1');

      expect(mockPrismaService.trendPoint.delete).toHaveBeenCalledWith({
        where: { id: 'point-1' },
      });
    });

    it('should throw NotFoundException for non-existent point', async () => {
      mockPrismaService.trendPoint.findUnique.mockResolvedValue(null);

      await expect(service.deleteTrendPoint('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getDataPoints', () => {
    it('should return data points for a series', async () => {
      mockPrismaService.trendPoint.findMany.mockResolvedValue([mockTrendPoint]);

      const result = await service.getDataPoints('series-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('point-1');
    });

    it('should filter by date range', async () => {
      mockPrismaService.trendPoint.findMany.mockResolvedValue([mockTrendPoint]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getDataPoints('series-1', startDate, endDate);

      expect(mockPrismaService.trendPoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            seriesId: 'series-1',
            date: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });
});

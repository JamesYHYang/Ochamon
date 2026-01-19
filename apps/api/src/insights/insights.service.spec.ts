import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InsightsService', () => {
  let service: InsightsService;
  let prismaService: PrismaService;

  // Mock data
  const mockCategory = {
    id: 'category-1',
    name: 'Industry News',
    slug: 'industry-news',
    description: 'Latest industry news',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTag = {
    id: 'tag-1',
    name: 'Sustainability',
    slug: 'sustainability',
    createdAt: new Date(),
  };

  const mockAuthor = {
    id: 'author-1',
    name: 'Admin User',
  };

  const mockInsight = {
    id: 'insight-1',
    title: 'Test Insight Article',
    slug: 'test-insight-article',
    excerpt: 'This is a test excerpt',
    content: '<p>This is the content</p>',
    featuredImage: 'https://example.com/image.jpg',
    isPublished: true,
    publishedAt: new Date(),
    metaTitle: 'SEO Title',
    metaDescription: 'SEO Description',
    viewCount: 100,
    authorId: 'author-1',
    categoryId: 'category-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockAuthor,
    category: mockCategory,
    tags: [mockTag],
  };

  const mockDraftInsight = {
    ...mockInsight,
    id: 'insight-2',
    slug: 'draft-insight',
    isPublished: false,
    publishedAt: null,
  };

  const mockPrismaService = {
    insightsPost: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPublicInsights', () => {
    it('should return paginated published insights', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      const result = await service.getPublicInsights({ skip: 0, take: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
        })
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      await service.getPublicInsights({
        skip: 0,
        take: 10,
        categoryId: 'category-1',
      });

      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-1',
          }),
        })
      );
    });

    it('should filter by tag slug', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      await service.getPublicInsights({
        skip: 0,
        take: 10,
        tag: 'sustainability',
      });

      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { slug: 'sustainability' } },
          }),
        })
      );
    });

    it('should search in title, excerpt, and content', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      await service.getPublicInsights({
        skip: 0,
        take: 10,
        search: 'test',
      });

      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: expect.objectContaining({ contains: 'test' }) },
            ]),
          }),
        })
      );
    });
  });

  describe('getInsightBySlug', () => {
    it('should return a published insight by slug', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);
      mockPrismaService.insightsPost.update.mockResolvedValue(mockInsight);

      const result = await service.getInsightBySlug('test-insight-article');

      expect(result.id).toBe('insight-1');
      expect(result.title).toBe('Test Insight Article');
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);

      await expect(service.getInsightBySlug('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for unpublished insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockDraftInsight);

      await expect(service.getInsightBySlug('draft-insight')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getRelatedInsights', () => {
    it('should return related insights based on tags', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);

      const result = await service.getRelatedInsights('insight-2', ['tag-1'], 3);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            id: { not: 'insight-2' },
            tags: { some: { id: { in: ['tag-1'] } } },
          }),
          take: 3,
        })
      );
    });

    it('should return empty array when no tags provided', async () => {
      const result = await service.getRelatedInsights('insight-1', [], 3);

      expect(result).toEqual([]);
      expect(mockPrismaService.insightsPost.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return all categories sorted by sortOrder', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getTags', () => {
    it('should return all tags sorted by name', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);

      const result = await service.getTags();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('listAdminInsights', () => {
    it('should return all insights including drafts for admin', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([
        mockInsight,
        mockDraftInsight,
      ]);
      mockPrismaService.insightsPost.count.mockResolvedValue(2);

      const result = await service.listAdminInsights({ skip: 0, take: 20, status: 'ALL' });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by status PUBLISHED', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      await service.listAdminInsights({
        skip: 0,
        take: 20,
        status: 'PUBLISHED',
      });

      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
          }),
        })
      );
    });

    it('should filter by status DRAFT', async () => {
      mockPrismaService.insightsPost.findMany.mockResolvedValue([mockDraftInsight]);
      mockPrismaService.insightsPost.count.mockResolvedValue(1);

      await service.listAdminInsights({
        skip: 0,
        take: 20,
        status: 'DRAFT',
      });

      expect(mockPrismaService.insightsPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: false,
          }),
        })
      );
    });
  });

  describe('createInsight', () => {
    it('should create a new insight as draft', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.insightsPost.create.mockResolvedValue({
        ...mockInsight,
        isPublished: false,
      });

      const result = await service.createInsight(
        {
          title: 'Test Insight Article',
          content: '<p>This is the content</p>',
          categoryId: 'category-1',
          isPublished: false,
          tagIds: [],
        },
        'author-1'
      );

      expect(result.isPublished).toBe(false);
      expect(mockPrismaService.insightsPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Insight Article',
            slug: 'test-insight-article',
            isPublished: false,
          }),
        })
      );
    });

    it('should throw BadRequestException for duplicate slug', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);

      await expect(
        service.createInsight(
          {
            title: 'Test Insight Article',
            content: 'Content',
            categoryId: 'category-1',
            isPublished: false,
            tagIds: [],
          },
          'author-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-existent category', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.createInsight(
          {
            title: 'New Article',
            content: 'Content',
            categoryId: 'non-existent',
            isPublished: false,
            tagIds: [],
          },
          'author-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize HTML content to remove script tags', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.insightsPost.create.mockImplementation((args) => ({
        ...mockInsight,
        content: args.data.content,
      }));

      await service.createInsight(
        {
          title: 'New Article',
          content: '<p>Safe</p><script>alert("xss")</script><p>More</p>',
          categoryId: 'category-1',
          isPublished: false,
          tagIds: [],
        },
        'author-1'
      );

      const createCall = mockPrismaService.insightsPost.create.mock.calls[0][0];
      expect(createCall.data.content).not.toContain('<script>');
      expect(createCall.data.content).toContain('<p>Safe</p>');
    });
  });

  describe('updateInsight', () => {
    it('should update an existing insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);
      mockPrismaService.insightsPost.findFirst.mockResolvedValue(null);
      mockPrismaService.insightsPost.update.mockResolvedValue({
        ...mockInsight,
        title: 'Updated Title',
      });

      const result = await service.updateInsight(
        'insight-1',
        { title: 'Updated Title' },
        'author-1'
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for non-existent insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);

      await expect(
        service.updateInsight('non-existent', { title: 'New Title' }, 'author-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should regenerate slug when title changes', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);
      mockPrismaService.insightsPost.findFirst.mockResolvedValue(null);
      mockPrismaService.insightsPost.update.mockImplementation((args) => ({
        ...mockInsight,
        ...args.data,
      }));

      await service.updateInsight(
        'insight-1',
        { title: 'Brand New Title' },
        'author-1'
      );

      const updateCall = mockPrismaService.insightsPost.update.mock.calls[0][0];
      expect(updateCall.data.slug).toBe('brand-new-title');
    });
  });

  describe('publishInsight', () => {
    it('should publish an insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockDraftInsight);
      mockPrismaService.insightsPost.update.mockResolvedValue({
        ...mockDraftInsight,
        isPublished: true,
        publishedAt: expect.any(Date),
      });

      const result = await service.publishInsight('insight-2');

      expect(result.isPublished).toBe(true);
      expect(mockPrismaService.insightsPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: true,
          }),
        })
      );
    });

    it('should throw NotFoundException for non-existent insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);

      await expect(service.publishInsight('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('unpublishInsight', () => {
    it('should unpublish an insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);
      mockPrismaService.insightsPost.update.mockResolvedValue({
        ...mockInsight,
        isPublished: false,
      });

      const result = await service.unpublishInsight('insight-1');

      expect(result.isPublished).toBe(false);
    });
  });

  describe('deleteInsight', () => {
    it('should delete an insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(mockInsight);
      mockPrismaService.insightsPost.delete.mockResolvedValue(mockInsight);

      await service.deleteInsight('insight-1');

      expect(mockPrismaService.insightsPost.delete).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
      });
    });

    it('should throw NotFoundException for non-existent insight', async () => {
      mockPrismaService.insightsPost.findUnique.mockResolvedValue(null);

      await expect(service.deleteInsight('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

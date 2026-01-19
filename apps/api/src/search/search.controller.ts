import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { RateLimitGuard, RateLimit } from './rate-limit.guard';
import type { SearchInput, SearchResponse } from '@matcha/shared';

// DTO for Swagger documentation
class SearchInputDto {
  query: string;
  destinationCountry?: string;
  filters?: {
    grades?: string[];
    origins?: string[];
    certifications?: string[];
    moqMin?: number;
    moqMax?: number;
    leadTimeMin?: number;
    leadTimeMax?: number;
    priceMin?: number;
    priceMax?: number;
  };
  page?: number;
  limit?: number;
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('ai')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60 * 1000 }) // 20 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI-powered search',
    description:
      'Search products using natural language. Supports queries like "organic uji ceremonial moq <20kg"',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with explanations',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async search(@Body() input: SearchInputDto): Promise<SearchResponse> {
    // Validate and provide defaults
    const searchInput: SearchInput = {
      query: input.query,
      destinationCountry: input.destinationCountry,
      filters: input.filters,
      page: input.page || 1,
      limit: input.limit || 20,
    };

    return this.searchService.search(searchInput);
  }

  @Get('filters')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available filter options',
    description: 'Returns available grades, regions, certifications, and ranges for filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter options',
  })
  async getFilterOptions() {
    return this.searchService.getFilterOptions();
  }
}

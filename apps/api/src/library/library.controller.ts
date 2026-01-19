import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { Public } from '../auth/decorators';

/**
 * Library Controller
 *
 * Handles public-facing endpoints for reference data (regions, grades).
 * No authentication required.
 */
@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // ==================== REGIONS ====================

  /**
   * Get all active regions
   */
  @Get('regions')
  @Public()
  @ApiOperation({ summary: 'Get all regions (public)' })
  @ApiResponse({ status: 200, description: 'List of regions' })
  @ApiQuery({ name: 'withCounts', required: false, type: Boolean })
  async getRegions(@Query('withCounts') withCounts?: string) {
    if (withCounts === 'true') {
      return this.libraryService.getRegionsWithCounts();
    }
    return this.libraryService.getRegions();
  }

  /**
   * Get distinct countries
   */
  @Get('regions/countries')
  @Public()
  @ApiOperation({ summary: 'Get distinct countries (public)' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  async getCountries() {
    return this.libraryService.getCountries();
  }

  /**
   * Get regions by country
   */
  @Get('regions/country/:country')
  @Public()
  @ApiOperation({ summary: 'Get regions by country (public)' })
  @ApiResponse({ status: 200, description: 'List of regions in country' })
  async getRegionsByCountry(@Param('country') country: string) {
    return this.libraryService.getRegionsByCountry(country);
  }

  /**
   * Get a single region by ID
   */
  @Get('regions/:id')
  @Public()
  @ApiOperation({ summary: 'Get region by ID (public)' })
  @ApiResponse({ status: 200, description: 'Region details' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async getRegionById(@Param('id') id: string) {
    return this.libraryService.getRegionById(id);
  }

  // ==================== GRADE TYPES ====================

  /**
   * Get all active grade types
   */
  @Get('grades')
  @Public()
  @ApiOperation({ summary: 'Get all grade types (public)' })
  @ApiResponse({ status: 200, description: 'List of grade types' })
  @ApiQuery({ name: 'withCounts', required: false, type: Boolean })
  async getGradeTypes(@Query('withCounts') withCounts?: string) {
    if (withCounts === 'true') {
      return this.libraryService.getGradeTypesWithCounts();
    }
    return this.libraryService.getGradeTypes();
  }

  /**
   * Get a single grade type by ID
   */
  @Get('grades/:id')
  @Public()
  @ApiOperation({ summary: 'Get grade type by ID (public)' })
  @ApiResponse({ status: 200, description: 'Grade type details' })
  @ApiResponse({ status: 404, description: 'Grade type not found' })
  async getGradeTypeById(@Param('id') id: string) {
    return this.libraryService.getGradeTypeById(id);
  }

  /**
   * Get a grade type by code
   */
  @Get('grades/code/:code')
  @Public()
  @ApiOperation({ summary: 'Get grade type by code (public)' })
  @ApiResponse({ status: 200, description: 'Grade type details' })
  @ApiResponse({ status: 404, description: 'Grade type not found' })
  async getGradeTypeByCode(@Param('code') code: string) {
    return this.libraryService.getGradeTypeByCode(code);
  }
}

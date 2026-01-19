import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaxonomyService } from './taxonomy.service';
import { Public } from '../auth/decorators';

@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get('regions')
  @Public()
  @ApiOperation({ summary: 'Get all regions' })
  async getRegions() {
    return this.taxonomyService.getRegions();
  }

  @Get('grades')
  @Public()
  @ApiOperation({ summary: 'Get all grade types' })
  async getGrades() {
    return this.taxonomyService.getGrades();
  }

  @Get('certifications')
  @Public()
  @ApiOperation({ summary: 'Get available certifications' })
  async getCertifications() {
    return this.taxonomyService.getCertifications();
  }
}

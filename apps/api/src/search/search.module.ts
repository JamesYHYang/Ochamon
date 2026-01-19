import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  controllers: [SearchController],
  providers: [SearchService, RateLimitGuard],
  exports: [SearchService],
})
export class SearchModule {}

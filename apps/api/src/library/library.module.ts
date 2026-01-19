import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

/**
 * Library Module
 *
 * Provides reference data functionality:
 * - Regions (matcha growing regions)
 * - Grade types (matcha quality grades)
 */
@Module({
  imports: [PrismaModule],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}

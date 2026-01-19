import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SellerService } from './seller.service';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  CreateSkuSchema,
  UpdateSkuSchema,
  UpdateSellerProfileSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductQueryInput,
  type CreateSkuInput,
  type UpdateSkuInput,
  type UpdateSellerProfileInput,
} from './dto';

// Configure multer storage for product images
const storage = diskStorage({
  destination: './uploads/products',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('Seller')
@ApiBearerAuth()
@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  // ==================== PROFILE ====================

  @Get('profile')
  @ApiOperation({ summary: 'Get seller profile' })
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.sellerService.getProfile(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update seller profile' })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateSellerProfileSchema)) dto: UpdateSellerProfileInput,
  ) {
    return this.sellerService.updateProfile(user.id, dto);
  }

  // ==================== LOOKUPS ====================

  @Get('regions')
  @ApiOperation({ summary: 'Get available regions' })
  async getRegions() {
    return this.sellerService.getRegions();
  }

  @Get('grade-types')
  @ApiOperation({ summary: 'Get available grade types' })
  async getGradeTypes() {
    return this.sellerService.getGradeTypes();
  }

  // ==================== PRODUCTS ====================

  @Get('products')
  @ApiOperation({ summary: 'Get seller products (paginated)' })
  async getProducts(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(ProductQuerySchema)) query: ProductQueryInput,
  ) {
    return this.sellerService.getProducts(user.id, query);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create new product' })
  async createProduct(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductInput,
  ) {
    return this.sellerService.createProduct(user.id, dto);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.sellerService.getProduct(user.id, id);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductInput,
  ) {
    return this.sellerService.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.sellerService.deleteProduct(user.id, id);
  }

  // ==================== PRODUCT IMAGES ====================

  @Post('products/:id/images')
  @ApiOperation({ summary: 'Upload product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadImage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('isPrimary') isPrimary?: string,
  ) {
    return this.sellerService.addProductImage(
      user.id,
      id,
      file,
      isPrimary === 'true',
    );
  }

  @Delete('products/:id/images/:imageId')
  @ApiOperation({ summary: 'Delete product image' })
  async deleteImage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.sellerService.deleteProductImage(user.id, id, imageId);
  }

  // ==================== SKUS ====================

  @Post('products/:id/skus')
  @ApiOperation({ summary: 'Add SKU to product' })
  async addSku(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateSkuSchema)) dto: CreateSkuInput,
  ) {
    return this.sellerService.addSku(user.id, id, dto);
  }

  @Put('products/:id/skus/:skuId')
  @ApiOperation({ summary: 'Update SKU' })
  async updateSku(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('skuId') skuId: string,
    @Body(new ZodValidationPipe(UpdateSkuSchema)) dto: UpdateSkuInput,
  ) {
    return this.sellerService.updateSku(user.id, id, skuId, dto);
  }

  @Delete('products/:id/skus/:skuId')
  @ApiOperation({ summary: 'Delete SKU' })
  async deleteSku(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('skuId') skuId: string,
  ) {
    return this.sellerService.deleteSku(user.id, id, skuId);
  }
}

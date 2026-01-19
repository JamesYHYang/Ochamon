import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  AddToCartSchema,
  AddToCartInput,
  UpdateCartItemSchema,
  UpdateCartItemInput,
  CheckoutSchema,
  CheckoutInput,
  ConvertToRfqSchema,
  ConvertToRfqInput,
} from './dto';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUYER')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get active cart' })
  async getCart(@CurrentUser() user: { id: string }) {
    return this.cartService.getOrCreateCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(AddToCartSchema)) dto: AddToCartInput,
  ) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item' })
  async updateItem(
    @CurrentUser() user: { id: string },
    @Param('id') itemId: string,
    @Body(new ZodValidationPipe(UpdateCartItemSchema)) dto: UpdateCartItemInput,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser() user: { id: string },
    @Param('id') itemId: string,
  ) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@CurrentUser() user: { id: string }) {
    return this.cartService.clearCart(user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout (B2C direct purchase)' })
  async checkout(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CheckoutSchema)) dto: CheckoutInput,
  ) {
    return this.cartService.checkout(user.id, dto);
  }

  @Post('convert-to-rfq')
  @ApiOperation({ summary: 'Convert cart to RFQ (B2B flow)' })
  async convertToRfq(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ConvertToRfqSchema)) dto: ConvertToRfqInput,
  ) {
    return this.cartService.convertToRfq(user.id, dto);
  }
}

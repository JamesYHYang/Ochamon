import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { OrderStatus } from '@prisma/client';

@ApiTags('Order')
@ApiBearerAuth()
@Controller('order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ==================== BUYER ENDPOINTS ====================

  @Get('buyer')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Get all orders for buyer' })
  async getBuyerOrders(@CurrentUser() user: { id: string }) {
    return this.orderService.getBuyerOrders(user.id);
  }

  @Get('buyer/:id')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Get order detail for buyer' })
  async getBuyerOrderDetail(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
  ) {
    return this.orderService.getBuyerOrderDetail(user.id, orderId);
  }

  // ==================== SELLER ENDPOINTS ====================

  @Get('seller')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get all orders for seller' })
  async getSellerOrders(@CurrentUser() user: { id: string }) {
    return this.orderService.getSellerOrders(user.id);
  }

  @Get('seller/:id')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get order detail for seller' })
  async getSellerOrderDetail(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
  ) {
    return this.orderService.getSellerOrderDetail(user.id, orderId);
  }

  @Patch('seller/:id/status')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Update order status (Seller)' })
  async updateOrderStatus(
    @CurrentUser() user: { id: string },
    @Param('id') orderId: string,
    @Body()
    body: {
      status: OrderStatus;
      notes?: string;
      trackingNumber?: string;
      carrier?: string;
    },
  ) {
    return this.orderService.updateOrderStatus(
      user.id,
      orderId,
      body.status,
      body.notes,
      body.trackingNumber,
      body.carrier,
    );
  }
}

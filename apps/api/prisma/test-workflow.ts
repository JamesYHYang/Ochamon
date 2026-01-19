/**
 * Test Workflow Script: RFQ → Quote → Order
 *
 * Scenario:
 * 1. Buyer creates an RFQ with 2 SKUs from different sellers
 * 2. Seller A (Kyoto Matcha) quotes on their SKU
 * 3. Buyer accepts the quote
 * 4. Verify database state
 */

import { PrismaClient, RfqStatus, QuoteStatus, OrderStatus, Incoterm } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 TEST WORKFLOW: RFQ → Quote → Order');
  console.log('='.repeat(60));

  // ========== STEP 0: Verify existing data ==========
  console.log('\n📋 STEP 0: Verifying existing seed data...\n');

  const buyer = await prisma.user.findUnique({
    where: { email: 'buyer@urbantea.com' },
    include: { buyerProfile: { include: { company: true } } },
  });

  const seller1 = await prisma.user.findUnique({
    where: { email: 'seller@kyoto-matcha.com' },
    include: { sellerProfile: { include: { company: true } } },
  });

  const seller2 = await prisma.user.findUnique({
    where: { email: 'seller@nishio-green.com' },
    include: { sellerProfile: { include: { company: true } } },
  });

  if (!buyer?.buyerProfile || !seller1?.sellerProfile || !seller2?.sellerProfile) {
    throw new Error('Seed data not found. Run: pnpm db:seed first');
  }

  console.log('   ✅ Buyer:', buyer.name, '-', buyer.buyerProfile.company.name);
  console.log('   ✅ Seller A:', seller1.name, '-', seller1.sellerProfile.company.name);
  console.log('   ✅ Seller B:', seller2.name, '-', seller2.sellerProfile.company.name);

  // Get one SKU from each seller
  const seller1Sku = await prisma.sku.findFirst({
    where: { product: { sellerId: seller1.sellerProfile.id } },
    include: { product: true, priceTiers: { orderBy: { minQty: 'asc' } } },
  });

  const seller2Sku = await prisma.sku.findFirst({
    where: { product: { sellerId: seller2.sellerProfile.id } },
    include: { product: true, priceTiers: { orderBy: { minQty: 'asc' } } },
  });

  if (!seller1Sku || !seller2Sku) {
    throw new Error('SKUs not found. Run: pnpm db:seed first');
  }

  console.log('\n   SKU from Seller A:', seller1Sku.sku, '-', seller1Sku.name);
  console.log('   SKU from Seller B:', seller2Sku.sku, '-', seller2Sku.name);

  // ========== STEP 1: Clean up previous test data ==========
  console.log('\n📋 STEP 1: Cleaning up previous test runs...\n');

  const existingRfqs = await prisma.rfq.findMany({
    where: { title: { startsWith: '[TEST]' } },
    select: { id: true },
  });

  for (const rfq of existingRfqs) {
    await prisma.orderStatusHistory.deleteMany({ where: { order: { quote: { rfqId: rfq.id } } } });
    await prisma.orderLineItem.deleteMany({ where: { order: { quote: { rfqId: rfq.id } } } });
    await prisma.order.deleteMany({ where: { quote: { rfqId: rfq.id } } });
    await prisma.quoteLineItem.deleteMany({ where: { quote: { rfqId: rfq.id } } });
    await prisma.quote.deleteMany({ where: { rfqId: rfq.id } });
    await prisma.message.deleteMany({ where: { thread: { rfqId: rfq.id } } });
    await prisma.messageThread.deleteMany({ where: { rfqId: rfq.id } });
    await prisma.rfqLineItem.deleteMany({ where: { rfqId: rfq.id } });
    await prisma.rfq.delete({ where: { id: rfq.id } });
  }
  console.log('   ✅ Cleaned up', existingRfqs.length, 'previous test RFQs');

  // ========== STEP 2: Buyer creates RFQ with 2 SKUs from different sellers ==========
  console.log('\n📋 STEP 2: Buyer creating RFQ with 2 SKUs from different sellers...\n');

  const rfqNumber = `RFQ-TEST-${Date.now()}`;
  const rfq = await prisma.rfq.create({
    data: {
      rfqNumber,
      title: '[TEST] Multi-Seller Matcha Order',
      notes: 'Testing RFQ with products from two different suppliers',
      destinationCountry: 'US',
      destinationCity: 'San Francisco',
      incoterm: Incoterm.FOB,
      neededByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      status: RfqStatus.SUBMITTED,
      submittedAt: new Date(),
      buyerProfileId: buyer.buyerProfile.id,
      lineItems: {
        create: [
          {
            skuId: seller1Sku.id,
            qty: 20,
            unit: 'unit',
            notes: 'Need highest quality for tea ceremony',
            targetPrice: 100,
          },
          {
            skuId: seller2Sku.id,
            qty: 50,
            unit: 'unit',
            notes: 'For cafe menu items',
            targetPrice: 40,
          },
        ],
      },
      messageThread: {
        create: {
          subject: `RFQ: [TEST] Multi-Seller Matcha Order`,
        },
      },
    },
    include: {
      buyerProfile: { include: { company: true, user: true } },
      lineItems: {
        include: {
          sku: { include: { product: { include: { seller: { include: { company: true } } } } } },
        },
      },
      messageThread: true,
    },
  });

  console.log('   ✅ RFQ Created:', rfq.rfqNumber);
  console.log('   📍 Status:', rfq.status);
  console.log('   📦 Line Items:');
  for (const item of rfq.lineItems) {
    console.log(`      - ${item.sku.sku}: ${item.qty} ${item.unit} from ${item.sku.product.seller.company.name}`);
  }

  // ========== STEP 3: Seller A (Kyoto Matcha) creates a quote ==========
  console.log('\n📋 STEP 3: Seller A (Kyoto Matcha) creating quote...\n');

  const quoteNumber = `QT-TEST-${Date.now()}`;
  const unitPrice = 95; // Seller A's price for their SKU
  const qty = 20;
  const lineItemTotal = qty * unitPrice;
  const shippingCost = 150;
  const subtotal = lineItemTotal;
  const totalAmount = subtotal + shippingCost;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      rfqId: rfq.id,
      sellerProfileId: seller1.sellerProfile.id,
      subtotal,
      shippingCost,
      totalAmount,
      currency: 'USD',
      incoterm: Incoterm.FOB,
      estimatedLeadDays: 14,
      notes: 'Premium ceremonial grade, directly from our Uji farm',
      termsConditions: 'Net 30 payment terms. FOB Japan port.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: QuoteStatus.SUBMITTED,
      submittedAt: new Date(),
      lineItems: {
        create: [
          {
            skuId: seller1Sku.id,
            qty,
            unit: 'unit',
            unitPrice,
            totalPrice: lineItemTotal,
            notes: 'Stone-ground to order for maximum freshness',
          },
        ],
      },
    },
    include: {
      sellerProfile: { include: { company: true } },
      lineItems: { include: { sku: true } },
      rfq: true,
    },
  });

  // Update RFQ status to QUOTED (or PARTIALLY_QUOTED since only one seller quoted)
  await prisma.rfq.update({
    where: { id: rfq.id },
    data: { status: RfqStatus.PARTIALLY_QUOTED },
  });

  console.log('   ✅ Quote Created:', quote.quoteNumber);
  console.log('   📍 Status:', quote.status);
  console.log('   💰 Total: $' + Number(quote.totalAmount).toFixed(2));
  console.log('   📦 Line Items:');
  for (const item of quote.lineItems) {
    console.log(`      - ${item.sku.sku}: ${Number(item.qty)} x $${Number(item.unitPrice)} = $${Number(item.totalPrice)}`);
  }

  // ========== STEP 4: Buyer accepts the quote ==========
  console.log('\n📋 STEP 4: Buyer accepting quote...\n');

  const orderNumber = `ORD-TEST-${Date.now()}`;

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Update quote status
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    // Update RFQ status
    await tx.rfq.update({
      where: { id: rfq.id },
      data: { status: RfqStatus.ACCEPTED },
    });

    // Create order
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        quoteId: quote.id,
        subtotal: quote.subtotal,
        shippingCost: quote.shippingCost,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        status: OrderStatus.PENDING_PAYMENT,
        shipToName: buyer.name,
        shipToLine1: '100 Market St',
        shipToLine2: 'Suite 500',
        shipToCity: 'San Francisco',
        shipToState: 'CA',
        shipToPostal: '94102',
        shipToCountry: 'US',
        buyerNotes: 'Please deliver to loading dock B',
        lineItems: {
          create: quote.lineItems.map((item) => ({
            skuId: item.skuId,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        statusHistory: {
          create: {
            status: OrderStatus.PENDING_PAYMENT,
            notes: 'Order created from accepted quote',
            changedBy: buyer.id,
          },
        },
      },
      include: {
        lineItems: { include: { sku: true } },
        statusHistory: true,
        quote: {
          include: {
            sellerProfile: { include: { company: true } },
            rfq: { include: { buyerProfile: { include: { company: true } } } },
          },
        },
      },
    });

    return newOrder;
  });

  console.log('   ✅ Order Created:', order.orderNumber);
  console.log('   📍 Status:', order.status);
  console.log('   💰 Total: $' + Number(order.totalAmount).toFixed(2));
  console.log('   📦 Line Items:');
  for (const item of order.lineItems) {
    console.log(`      - ${item.sku.sku}: ${Number(item.qty)} x $${Number(item.unitPrice)} = $${Number(item.totalPrice)}`);
  }

  // ========== STEP 5: Verify Database State ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL DATABASE STATE VERIFICATION');
  console.log('='.repeat(60));

  // Re-fetch all data with full relations
  const finalRfq = await prisma.rfq.findUnique({
    where: { id: rfq.id },
    include: {
      buyerProfile: { include: { company: true, user: true } },
      lineItems: {
        include: {
          sku: { include: { product: { include: { seller: { include: { company: true } } } } } },
        },
      },
      quotes: {
        include: {
          sellerProfile: { include: { company: true } },
          lineItems: { include: { sku: true } },
          order: {
            include: {
              lineItems: { include: { sku: true } },
              statusHistory: true,
            },
          },
        },
      },
      messageThread: { include: { messages: true } },
    },
  });

  if (!finalRfq) {
    throw new Error('Failed to fetch final RFQ state');
  }

  console.log('\n📝 RFQ:');
  console.log('   ID:', finalRfq.id);
  console.log('   Number:', finalRfq.rfqNumber);
  console.log('   Title:', finalRfq.title);
  console.log('   Status:', finalRfq.status, finalRfq.status === RfqStatus.ACCEPTED ? '✅' : '❌');
  console.log('   Buyer:', finalRfq.buyerProfile.company.name);
  console.log('   Destination:', finalRfq.destinationCity + ', ' + finalRfq.destinationCountry);
  console.log('   Line Items:', finalRfq.lineItems.length);
  for (const item of finalRfq.lineItems) {
    console.log(`      └─ ${item.sku.product.seller.company.name}: ${item.sku.sku} x ${Number(item.qty)}`);
  }

  console.log('\n💬 Quotes:');
  console.log('   Total Quotes:', finalRfq.quotes.length);
  for (const q of finalRfq.quotes) {
    console.log(`   └─ ${q.quoteNumber}`);
    console.log(`      Seller: ${q.sellerProfile.company.name}`);
    console.log(`      Status: ${q.status} ${q.status === QuoteStatus.ACCEPTED ? '✅' : ''}`);
    console.log(`      Total: $${Number(q.totalAmount).toFixed(2)}`);
    console.log(`      Accepted At: ${q.acceptedAt?.toISOString() || 'N/A'}`);
    console.log(`      Has Order: ${q.order ? '✅ Yes' : '❌ No'}`);
  }

  const finalOrder = finalRfq.quotes[0]?.order;
  if (finalOrder) {
    console.log('\n🛒 Order:');
    console.log('   ID:', finalOrder.id);
    console.log('   Number:', finalOrder.orderNumber);
    console.log('   Status:', finalOrder.status, finalOrder.status === OrderStatus.PENDING_PAYMENT ? '✅' : '');
    console.log('   Total: $' + Number(finalOrder.totalAmount).toFixed(2));
    console.log('   Ship To:', finalOrder.shipToName);
    console.log('   Address:', [
      finalOrder.shipToLine1,
      finalOrder.shipToLine2,
      finalOrder.shipToCity,
      finalOrder.shipToState,
      finalOrder.shipToPostal,
      finalOrder.shipToCountry,
    ].filter(Boolean).join(', '));
    console.log('   Line Items:', finalOrder.lineItems.length);
    for (const item of finalOrder.lineItems) {
      console.log(`      └─ ${item.sku.sku}: ${Number(item.qty)} x $${Number(item.unitPrice)} = $${Number(item.totalPrice)}`);
    }
    console.log('   Status History:', finalOrder.statusHistory.length, 'entries');
    for (const h of finalOrder.statusHistory) {
      console.log(`      └─ ${h.status}: ${h.notes || 'No notes'} (${h.createdAt.toISOString()})`);
    }
  }

  // ========== VERIFICATION CHECKS ==========
  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION CHECKLIST');
  console.log('='.repeat(60));

  const checks = [
    { name: 'RFQ Status is ACCEPTED', pass: finalRfq.status === RfqStatus.ACCEPTED },
    { name: 'RFQ has 2 line items from 2 sellers', pass: finalRfq.lineItems.length === 2 },
    { name: 'Quote Status is ACCEPTED', pass: finalRfq.quotes[0]?.status === QuoteStatus.ACCEPTED },
    { name: 'Quote has acceptedAt timestamp', pass: !!finalRfq.quotes[0]?.acceptedAt },
    { name: 'Order exists', pass: !!finalOrder },
    { name: 'Order Status is PENDING_PAYMENT', pass: finalOrder?.status === OrderStatus.PENDING_PAYMENT },
    { name: 'Order has correct total', pass: Number(finalOrder?.totalAmount) === Number(quote.totalAmount) },
    { name: 'Order has line items from quote', pass: finalOrder?.lineItems.length === quote.lineItems.length },
    { name: 'Order has status history', pass: (finalOrder?.statusHistory.length || 0) > 0 },
    { name: 'Message thread exists', pass: !!finalRfq.messageThread },
  ];

  let allPassed = true;
  for (const check of checks) {
    const icon = check.pass ? '✅' : '❌';
    console.log(`   ${icon} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED! Workflow is working correctly.');
  } else {
    console.log('⚠️  SOME CHECKS FAILED! Review the issues above.');
  }
  console.log('='.repeat(60));

  // ========== DATABASE RECORD IDs ==========
  console.log('\n📌 RECORD IDs FOR REFERENCE:');
  console.log('   RFQ ID:', finalRfq.id);
  console.log('   Quote ID:', finalRfq.quotes[0]?.id);
  console.log('   Order ID:', finalOrder?.id);
  console.log('   Message Thread ID:', finalRfq.messageThread?.id);
}

main()
  .catch((e) => {
    console.error('\n❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

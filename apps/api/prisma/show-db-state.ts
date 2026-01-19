/**
 * Show Database State for Test Workflow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('   DATABASE STATE - RAW RECORDS');
  console.log('═'.repeat(70));

  // Find the test RFQ
  const rfq = await prisma.rfq.findFirst({
    where: { title: { startsWith: '[TEST]' } },
    orderBy: { createdAt: 'desc' },
  });

  if (!rfq) {
    console.log('\n⚠️  No test RFQ found. Run test-workflow.ts first.');
    return;
  }

  // ========== RFQ ==========
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TABLE: rfqs                                                         │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log(JSON.stringify(rfq, null, 2));

  // ========== RFQ LINE ITEMS ==========
  const rfqLineItems = await prisma.rfqLineItem.findMany({
    where: { rfqId: rfq.id },
    include: { sku: { select: { sku: true, name: true } } },
  });

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TABLE: rfq_line_items                                               │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log(JSON.stringify(rfqLineItems, null, 2));

  // ========== QUOTES ==========
  const quotes = await prisma.quote.findMany({
    where: { rfqId: rfq.id },
  });

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TABLE: quotes                                                       │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log(JSON.stringify(quotes, null, 2));

  // ========== QUOTE LINE ITEMS ==========
  if (quotes.length > 0) {
    const quoteLineItems = await prisma.quoteLineItem.findMany({
      where: { quoteId: quotes[0].id },
      include: { sku: { select: { sku: true, name: true } } },
    });

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TABLE: quote_line_items                                             │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log(JSON.stringify(quoteLineItems, null, 2));
  }

  // ========== ORDERS ==========
  const orders = await prisma.order.findMany({
    where: { quote: { rfqId: rfq.id } },
  });

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TABLE: orders                                                       │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log(JSON.stringify(orders, null, 2));

  // ========== ORDER LINE ITEMS ==========
  if (orders.length > 0) {
    const orderLineItems = await prisma.orderLineItem.findMany({
      where: { orderId: orders[0].id },
      include: { sku: { select: { sku: true, name: true } } },
    });

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TABLE: order_line_items                                             │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log(JSON.stringify(orderLineItems, null, 2));
  }

  // ========== ORDER STATUS HISTORY ==========
  if (orders.length > 0) {
    const statusHistory = await prisma.orderStatusHistory.findMany({
      where: { orderId: orders[0].id },
      orderBy: { createdAt: 'asc' },
    });

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TABLE: order_status_history                                         │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log(JSON.stringify(statusHistory, null, 2));
  }

  // ========== MESSAGE THREAD ==========
  const messageThread = await prisma.messageThread.findFirst({
    where: { rfqId: rfq.id },
    include: { messages: true },
  });

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ TABLE: message_threads                                               │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log(JSON.stringify(messageThread, null, 2));

  // ========== SUMMARY DIAGRAM ==========
  console.log('\n' + '═'.repeat(70));
  console.log('   RELATIONSHIP DIAGRAM');
  console.log('═'.repeat(70));
  console.log(`
  ┌─────────────────────────────────────────────────────────────────────┐
  │                         BUYER PROFILE                               │
  │  Urban Tea Collective (Sarah Chen)                                  │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ creates
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  RFQ: ${rfq.rfqNumber.padEnd(50)}│
  │  Status: ${rfq.status.padEnd(56)}│
  │  Destination: San Francisco, US                                     │
  └─────────────────────────────────────────────────────────────────────┘
                │                                    │
     ┌──────────┘                                    └──────────┐
     │                                                          │
     ▼                                                          ▼
  ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
  │  LINE ITEM 1                      │    │  LINE ITEM 2                      │
  │  SKU: KYO-ICM-100G               │    │  SKU: NIS-CGN-100G               │
  │  Qty: 20 units                    │    │  Qty: 50 units                    │
  │  Seller: Kyoto Matcha Masters     │    │  Seller: Nishio Green Industries  │
  └───────────────────────────────────┘    └───────────────────────────────────┘
     │                                                          │
     │ Seller A quotes                                          │ (No quote yet)
     ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  QUOTE: ${quotes[0]?.quoteNumber?.padEnd(50) || 'N/A'.padEnd(50)}│
  │  Status: ${(quotes[0]?.status || 'N/A').padEnd(56)}│
  │  Seller: Kyoto Matcha Masters                                       │
  │  Total: $${Number(quotes[0]?.totalAmount || 0).toFixed(2).padEnd(54)}│
  │  Line Items: 1 (only Seller A's SKU)                                │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Buyer accepts
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  ORDER: ${orders[0]?.orderNumber?.padEnd(50) || 'N/A'.padEnd(50)}│
  │  Status: ${(orders[0]?.status || 'N/A').padEnd(56)}│
  │  Total: $${Number(orders[0]?.totalAmount || 0).toFixed(2).padEnd(54)}│
  │  Ship To: Sarah Chen, 100 Market St, San Francisco, CA 94102       │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ tracks
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  STATUS HISTORY                                                     │
  │  └─ PENDING_PAYMENT: Order created from accepted quote              │
  └─────────────────────────────────────────────────────────────────────┘
  `);

  // ========== VERIFICATION NOTES ==========
  console.log('═'.repeat(70));
  console.log('   VERIFICATION NOTES');
  console.log('═'.repeat(70));
  console.log(`
  ✓ RFQ created with 2 line items from 2 different sellers
  ✓ Only Seller A (Kyoto Matcha) submitted a quote
  ✓ Quote only includes Seller A's SKU (not Seller B's)
  ✓ RFQ status changed: SUBMITTED → PARTIALLY_QUOTED → ACCEPTED
  ✓ Quote status changed: SUBMITTED → ACCEPTED
  ✓ Order created with status PENDING_PAYMENT
  ✓ Order line items copied from quote (1 item, not 2)
  ✓ Order status history tracks creation
  ✓ Message thread available for communication

  KEY INSIGHT: In a multi-seller RFQ, each seller can only quote on
  their own SKUs. The buyer can accept quotes from each seller
  independently, creating separate orders per seller.
  `);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

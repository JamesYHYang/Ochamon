'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { rfqApi, quoteApi, messagingApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileText,
  Clock,
  MapPin,
  Package,
  MessageCircle,
  Send,
  User,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-green-100 text-green-800',
  PARTIALLY_QUOTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'];

interface QuoteLineItem {
  skuId: string;
  skuName: string;
  productName: string;
  requestedQty: number;
  unit: string;
  targetPrice?: number;
  qty: number;
  unitPrice: number;
  notes?: string;
}

export default function SellerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rfq, setRfq] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [quoteForm, setQuoteForm] = useState({
    incoterm: 'FOB',
    shippingCost: 0,
    estimatedLeadDays: 14,
    notes: '',
    termsConditions: '',
    validUntil: '',
  });
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !params.id) return;
      try {
        const [rfqData, messagesData] = await Promise.all([
          rfqApi.getSellerRfqDetail(accessToken, params.id as string),
          messagingApi.getMessages(accessToken, params.id as string).catch(() => ({ messages: [] })),
        ]);
        setRfq(rfqData);
        setMessages(messagesData.messages || []);

        // Initialize quote line items from relevant line items
        if (rfqData.relevantLineItems) {
          setQuoteLineItems(
            rfqData.relevantLineItems.map((item: any) => ({
              skuId: item.skuId,
              skuName: item.sku?.name || 'SKU',
              productName: item.sku?.product?.name || 'Product',
              requestedQty: Number(item.qty),
              unit: item.unit,
              targetPrice: item.targetPrice ? Number(item.targetPrice) : undefined,
              qty: Number(item.qty),
              unitPrice: item.targetPrice ? Number(item.targetPrice) : 0,
              notes: '',
            }))
          );
        }

        // Set default valid until date (30 days from now)
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        setQuoteForm((prev) => ({
          ...prev,
          validUntil: validUntil.toISOString().split('T')[0],
          incoterm: rfqData.incoterm || 'FOB',
        }));
      } catch (error) {
        console.error('Failed to fetch RFQ:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accessToken, params.id]);

  const handleSendMessage = async () => {
    if (!accessToken || !newMessage.trim() || !params.id) return;
    setSendingMessage(true);
    try {
      const result = await messagingApi.sendMessage(accessToken, params.id as string, newMessage);
      setMessages((prev) => [...prev, result.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const updateQuoteLineItem = (skuId: string, field: keyof QuoteLineItem, value: any) => {
    setQuoteLineItems((prev) =>
      prev.map((item) => (item.skuId === skuId ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotal = () => {
    const itemsTotal = quoteLineItems.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );
    return itemsTotal + (quoteForm.shippingCost || 0);
  };

  const handleSubmitQuote = async () => {
    if (!accessToken || !rfq) return;

    // Validate
    const invalidItems = quoteLineItems.filter((item) => item.qty <= 0 || item.unitPrice <= 0);
    if (invalidItems.length > 0) {
      alert('Please fill in quantity and price for all items');
      return;
    }
    if (!quoteForm.validUntil) {
      alert('Please set a valid until date');
      return;
    }

    setSubmittingQuote(true);
    try {
      const quote = await quoteApi.createQuote(accessToken, {
        rfqId: rfq.id,
        incoterm: quoteForm.incoterm,
        shippingCost: quoteForm.shippingCost || undefined,
        estimatedLeadDays: quoteForm.estimatedLeadDays || undefined,
        notes: quoteForm.notes || undefined,
        termsConditions: quoteForm.termsConditions || undefined,
        validUntil: quoteForm.validUntil,
        lineItems: quoteLineItems.map((item) => ({
          skuId: item.skuId,
          qty: item.qty,
          unit: item.unit,
          unitPrice: item.unitPrice,
          notes: item.notes || undefined,
        })),
      });
      router.push(`/seller/quotes/${quote.id}`);
    } catch (error: any) {
      console.error('Failed to create quote:', error);
      alert(error.message || 'Failed to create quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">RFQ not found</p>
        <Link href="/seller/rfqs">
          <Button variant="outline" className="mt-4">
            Back to RFQs
          </Button>
        </Link>
      </div>
    );
  }

  const hasAlreadyQuoted = rfq.quotes?.some((q: any) => q.status !== 'REJECTED');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/seller/rfqs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{rfq.title}</h1>
            <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[rfq.status]}`}>
              {rfq.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500">RFQ #{rfq.rfqNumber}</p>
        </div>
        {!hasAlreadyQuoted && rfq.status === 'SUBMITTED' && (
          <Button
            onClick={() => setShowQuoteForm(!showQuoteForm)}
            className="bg-matcha-600 hover:bg-matcha-700"
          >
            {showQuoteForm ? 'Hide Quote Form' : 'Create Quote'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Buyer Information
              </h2>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{rfq.buyer?.name || 'Unknown Buyer'}</p>
              <p className="text-sm text-gray-500">{rfq.buyer?.companyName || ''}</p>
            </CardContent>
          </Card>

          {/* RFQ Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">RFQ Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Destination:</span>
                  <span>{rfq.destinationCity ? `${rfq.destinationCity}, ` : ''}{rfq.destinationCountry}</span>
                </div>
                {rfq.incoterm && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Preferred Incoterm:</span>
                    <span>{rfq.incoterm}</span>
                  </div>
                )}
                {rfq.neededByDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Needed by:</span>
                    <span>{new Date(rfq.neededByDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Created:</span>
                  <span>{new Date(rfq.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {rfq.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Buyer Notes</p>
                  <p className="text-sm">{rfq.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relevant Line Items (Your Products) */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Requested Items (Your Products)</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rfq.relevantLineItems?.map((item: any) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-matcha-50/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.sku?.product?.name || 'Product'}</p>
                        <p className="text-sm text-gray-500">{item.sku?.name || 'SKU'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Number(item.qty)} {item.unit}</p>
                        {item.targetPrice && (
                          <p className="text-sm text-gray-500">Target: ${Number(item.targetPrice).toFixed(2)}/{item.unit}</p>
                        )}
                      </div>
                    </div>
                    {item.notes && (
                      <p className="mt-2 text-sm text-gray-600">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quote Form */}
          {showQuoteForm && !hasAlreadyQuoted && (
            <Card className="border-matcha-300">
              <CardHeader>
                <h2 className="text-lg font-semibold text-matcha-700">Create Quote</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quote Line Items */}
                <div>
                  <h3 className="font-medium mb-3">Line Items</h3>
                  <div className="space-y-4">
                    {quoteLineItems.map((item) => (
                      <div key={item.skuId} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-500">{item.skuName}</p>
                            <p className="text-xs text-gray-400">Requested: {item.requestedQty} {item.unit}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateQuoteLineItem(item.skuId, 'qty', Number(e.target.value))}
                                min="0"
                                className="w-20 px-2 py-1 border rounded text-sm"
                              />
                              <span className="text-sm text-gray-500">{item.unit}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-500">$</span>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateQuoteLineItem(item.skuId, 'unitPrice', Number(e.target.value))}
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 border rounded text-sm"
                              />
                            </div>
                            {item.targetPrice && (
                              <p className="text-xs text-gray-400 mt-1">Target: ${item.targetPrice.toFixed(2)}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Line Total</label>
                            <p className="font-medium">${(item.qty * item.unitPrice).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Incoterm *</label>
                    <select
                      value={quoteForm.incoterm}
                      onChange={(e) => setQuoteForm((p) => ({ ...p, incoterm: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {INCOTERMS.map((term) => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valid Until *</label>
                    <input
                      type="date"
                      value={quoteForm.validUntil}
                      onChange={(e) => setQuoteForm((p) => ({ ...p, validUntil: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Shipping Cost</label>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={quoteForm.shippingCost}
                        onChange={(e) => setQuoteForm((p) => ({ ...p, shippingCost: Number(e.target.value) }))}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Lead Time (days)</label>
                    <input
                      type="number"
                      value={quoteForm.estimatedLeadDays}
                      onChange={(e) => setQuoteForm((p) => ({ ...p, estimatedLeadDays: Number(e.target.value) }))}
                      min="1"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Additional information for the buyer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                  <textarea
                    value={quoteForm.termsConditions}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, termsConditions: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Payment terms, delivery conditions, etc..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Quote Total</p>
                    <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={handleSubmitQuote}
                    disabled={submittingQuote}
                    className="bg-matcha-600 hover:bg-matcha-700"
                  >
                    {submittingQuote ? 'Submitting...' : 'Submit Quote'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Quotes */}
          {hasAlreadyQuoted && rfq.quotes?.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Your Quote</h2>
              </CardHeader>
              <CardContent>
                {rfq.quotes.map((quote: any) => (
                  <Link key={quote.id} href={`/seller/quotes/${quote.id}`}>
                    <div className="p-4 border rounded-lg hover:border-matcha-300 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Quote #{quote.quoteNumber}</p>
                          <p className="text-sm text-gray-500">
                            Created {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${Number(quote.totalAmount).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quote.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Messaging Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-80 overflow-y-auto mb-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm">No messages yet</p>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg text-sm ${
                        msg.senderId !== rfq.buyerId
                          ? 'bg-matcha-50 ml-4'
                          : 'bg-gray-50 mr-4'
                      }`}
                    >
                      <p className="font-medium text-xs text-gray-500 mb-1">
                        {msg.sender?.name || 'User'}
                      </p>
                      <p>{msg.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="sm"
                  className="bg-matcha-600 hover:bg-matcha-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

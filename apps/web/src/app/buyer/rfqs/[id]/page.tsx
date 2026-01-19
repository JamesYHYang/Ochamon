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
  CheckCircle,
  Send,
  Truck,
} from 'lucide-react';
import { ShippingEstimatesSection } from '@/components/logistics';
import { ComplianceSummary } from '@/components/compliance';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-green-100 text-green-800',
  PARTIALLY_QUOTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

interface AcceptQuoteModal {
  isOpen: boolean;
  quoteId: string;
  quote: any;
}

export default function BuyerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rfq, setRfq] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [acceptModal, setAcceptModal] = useState<AcceptQuoteModal>({
    isOpen: false,
    quoteId: '',
    quote: null,
  });
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    shipToName: '',
    shipToLine1: '',
    shipToLine2: '',
    shipToCity: '',
    shipToState: '',
    shipToPostal: '',
    shipToCountry: '',
    buyerNotes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !params.id) return;
      try {
        const [rfqData, messagesData] = await Promise.all([
          rfqApi.getBuyerRfqDetail(accessToken, params.id as string),
          messagingApi.getMessages(accessToken, params.id as string).catch(() => ({ messages: [] })),
        ]);
        setRfq(rfqData);
        setMessages(messagesData.messages || []);
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

  const handleAcceptQuote = async () => {
    if (!accessToken || !acceptModal.quoteId) return;
    setAcceptingQuote(true);
    try {
      const result = await quoteApi.acceptQuote(accessToken, {
        quoteId: acceptModal.quoteId,
        ...shippingForm,
      });
      router.push(`/buyer/orders/${result.order.id}`);
    } catch (error: any) {
      console.error('Failed to accept quote:', error);
      alert(error.message || 'Failed to accept quote');
    } finally {
      setAcceptingQuote(false);
    }
  };

  const openAcceptModal = (quote: any) => {
    setAcceptModal({ isOpen: true, quoteId: quote.id, quote });
    if (rfq) {
      setShippingForm((prev) => ({
        ...prev,
        shipToCountry: rfq.destinationCountry || '',
        shipToCity: rfq.destinationCity || '',
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">RFQ not found</p>
        <Link href="/buyer/rfqs">
          <Button variant="outline" className="mt-4">
            Back to RFQs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/buyer/rfqs">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                    <span className="text-gray-500">Incoterm:</span>
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
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{rfq.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Requested Items ({rfq.lineItems?.length || 0})</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rfq.lineItems?.map((item: any) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.sku?.product?.name || 'Product'}</p>
                        <p className="text-sm text-gray-500">{item.sku?.name || 'SKU'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.qty} {item.unit}</p>
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

          {/* Compliance Summary */}
          {rfq.lineItems && rfq.lineItems.length > 0 && (
            <ComplianceSummary
              destinationCountry={rfq.destinationCountry || 'US'}
              productCategory={rfq.lineItems[0]?.sku?.product?.gradeType?.code || 'matcha'}
              declaredValueUsd={
                rfq.lineItems.reduce(
                  (sum: number, item: any) =>
                    sum + Number(item.qty || 0) * Number(item.targetPrice || 50),
                  0
                )
              }
              weightKg={
                rfq.lineItems.reduce(
                  (sum: number, item: any) => sum + Number(item.qty || 0),
                  0
                )
              }
              certifications={rfq.lineItems[0]?.sku?.product?.certifications || []}
              rfqId={params.id as string}
              showAcknowledgement={true}
            />
          )}

          {/* Shipping Estimates */}
          {rfq.lineItems && rfq.lineItems.length > 0 && (
            <ShippingEstimatesSection
              rfqId={params.id as string}
              destinationCountry={rfq.destinationCountry || 'US'}
            />
          )}

          {/* Quotes */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Quotes Received ({rfq.quotes?.length || 0})</h2>
            </CardHeader>
            <CardContent>
              {!rfq.quotes || rfq.quotes.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No quotes received yet</p>
              ) : (
                <div className="space-y-4">
                  {rfq.quotes.map((quote: any) => (
                    <div key={quote.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{quote.seller?.company?.name || 'Seller'}</p>
                          <p className="text-sm text-gray-500">Quote #{quote.quoteNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${Number(quote.totalAmount).toFixed(2)}</p>
                          <p className={`text-xs px-2 py-1 rounded ${
                            quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quote.status}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Incoterm:</span> {quote.incoterm}
                        </div>
                        {quote.shippingCost > 0 && (
                          <div>
                            <span className="text-gray-500">Shipping:</span> ${Number(quote.shippingCost).toFixed(2)}
                          </div>
                        )}
                        {quote.estimatedLeadDays && (
                          <div>
                            <span className="text-gray-500">Lead time:</span> {quote.estimatedLeadDays} days
                          </div>
                        )}
                      </div>
                      <div className="text-sm mb-3">
                        <span className="text-gray-500">Valid until:</span>{' '}
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </div>
                      {quote.status === 'PENDING' && new Date(quote.validUntil) > new Date() && (
                        <Button
                          onClick={() => openAcceptModal(quote)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Quote
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                        msg.senderId === rfq.buyerId
                          ? 'bg-green-50 ml-4'
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept Quote Modal */}
      {acceptModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Accept Quote & Place Order</h3>
              <p className="text-sm text-gray-600 mb-4">
                Total: <span className="font-bold">${Number(acceptModal.quote?.totalAmount).toFixed(2)}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Ship To Name *</label>
                  <input
                    type="text"
                    value={shippingForm.shipToName}
                    onChange={(e) => setShippingForm((p) => ({ ...p, shipToName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    value={shippingForm.shipToLine1}
                    onChange={(e) => setShippingForm((p) => ({ ...p, shipToLine1: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={shippingForm.shipToLine2}
                    onChange={(e) => setShippingForm((p) => ({ ...p, shipToLine2: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">City *</label>
                    <input
                      type="text"
                      value={shippingForm.shipToCity}
                      onChange={(e) => setShippingForm((p) => ({ ...p, shipToCity: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={shippingForm.shipToState}
                      onChange={(e) => setShippingForm((p) => ({ ...p, shipToState: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Postal Code *</label>
                    <input
                      type="text"
                      value={shippingForm.shipToPostal}
                      onChange={(e) => setShippingForm((p) => ({ ...p, shipToPostal: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country *</label>
                    <input
                      type="text"
                      value={shippingForm.shipToCountry}
                      onChange={(e) => setShippingForm((p) => ({ ...p, shipToCountry: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={shippingForm.buyerNotes}
                    onChange={(e) => setShippingForm((p) => ({ ...p, buyerNotes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setAcceptModal({ isOpen: false, quoteId: '', quote: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAcceptQuote}
                  disabled={acceptingQuote || !shippingForm.shipToName || !shippingForm.shipToLine1 || !shippingForm.shipToCity || !shippingForm.shipToPostal || !shippingForm.shipToCountry}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {acceptingQuote ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

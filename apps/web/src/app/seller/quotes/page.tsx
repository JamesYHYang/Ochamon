'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { quoteApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Package } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

export default function SellerQuotesPage() {
  const { accessToken } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!accessToken) return;
      try {
        const data = await quoteApi.getSellerQuotes(accessToken);
        setQuotes(data);
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, [accessToken]);

  const filteredQuotes = quotes.filter((quote) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return quote.status === 'PENDING';
    if (filter === 'accepted') return quote.status === 'ACCEPTED';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Quotes</h1>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          All ({quotes.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          Pending ({quotes.filter(q => q.status === 'PENDING').length})
        </Button>
        <Button
          variant={filter === 'accepted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('accepted')}
          className={filter === 'accepted' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          Accepted ({quotes.filter(q => q.status === 'ACCEPTED').length})
        </Button>
      </div>

      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No quotes found</p>
            <p className="text-gray-500 mb-4">
              {filter === 'all'
                ? "You haven't submitted any quotes yet."
                : `No ${filter} quotes.`}
            </p>
            <Link href="/seller/rfqs">
              <Button className="bg-matcha-600 hover:bg-matcha-700">
                View Incoming RFQs
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Link key={quote.id} href={`/seller/quotes/${quote.id}`}>
              <Card className="hover:border-matcha-300 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">Quote #{quote.quoteNumber}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[quote.status]}`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        For RFQ: {quote.rfq?.title || 'Unknown'} • Buyer: {quote.rfq?.buyer?.name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {quote._count?.lineItems || quote.lineItems?.length || 0} items
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Valid until: {new Date(quote.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${Number(quote.totalAmount).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

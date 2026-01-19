'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { rfqApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, MapPin, Package } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-green-100 text-green-800',
  PARTIALLY_QUOTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export default function SellerRfqsPage() {
  const { accessToken } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'quoted'>('all');

  useEffect(() => {
    const fetchRfqs = async () => {
      if (!accessToken) return;
      try {
        const data = await rfqApi.getSellerRfqs(accessToken);
        setRfqs(data);
      } catch (error) {
        console.error('Failed to fetch RFQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRfqs();
  }, [accessToken]);

  const filteredRfqs = rfqs.filter((rfq) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return rfq.status === 'SUBMITTED';
    if (filter === 'quoted') return ['QUOTED', 'PARTIALLY_QUOTED', 'ACCEPTED'].includes(rfq.status);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Incoming RFQs</h1>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          All ({rfqs.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          Pending Quote ({rfqs.filter(r => r.status === 'SUBMITTED').length})
        </Button>
        <Button
          variant={filter === 'quoted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('quoted')}
          className={filter === 'quoted' ? 'bg-matcha-600 hover:bg-matcha-700' : ''}
        >
          Quoted ({rfqs.filter(r => ['QUOTED', 'PARTIALLY_QUOTED', 'ACCEPTED'].includes(r.status)).length})
        </Button>
      </div>

      {filteredRfqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No RFQs found</p>
            <p className="text-gray-500">
              {filter === 'all'
                ? "No RFQs have been received for your products yet."
                : `No ${filter === 'pending' ? 'pending' : 'quoted'} RFQs.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRfqs.map((rfq) => (
            <Link key={rfq.id} href={`/seller/rfqs/${rfq.id}`}>
              <Card className="hover:border-matcha-300 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{rfq.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[rfq.status]}`}>
                          {rfq.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        RFQ #{rfq.rfqNumber} • From: {rfq.buyer?.name || 'Buyer'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {rfq.relevantLineItems?.length || rfq._count?.lineItems || 0} items for you
                        </span>
                        {rfq.destinationCountry && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {rfq.destinationCountry}
                          </span>
                        )}
                        {rfq.neededByDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Needed by: {new Date(rfq.neededByDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(rfq.createdAt).toLocaleDateString()}
                      </p>
                      {rfq.status === 'SUBMITTED' && (
                        <Button
                          size="sm"
                          className="mt-2 bg-matcha-600 hover:bg-matcha-700"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/seller/rfqs/${rfq.id}`;
                          }}
                        >
                          Submit Quote
                        </Button>
                      )}
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

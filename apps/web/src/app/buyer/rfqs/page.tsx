'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { rfqApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Clock, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-green-100 text-green-800',
  PARTIALLY_QUOTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export default function BuyerRfqsPage() {
  const { accessToken } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const fetchRfqs = async () => {
      if (!accessToken) return;
      try {
        const data = await rfqApi.getBuyerRfqs(accessToken);
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
    if (filter === 'active') return ['SUBMITTED', 'QUOTED', 'PARTIALLY_QUOTED'].includes(rfq.status);
    if (filter === 'completed') return ['ACCEPTED', 'EXPIRED', 'CANCELLED'].includes(rfq.status);
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My RFQs</h1>
        <Link href="/buyer/rfqs/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New RFQ
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          All ({rfqs.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Active ({rfqs.filter(r => ['SUBMITTED', 'QUOTED', 'PARTIALLY_QUOTED'].includes(r.status)).length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Completed ({rfqs.filter(r => ['ACCEPTED', 'EXPIRED', 'CANCELLED'].includes(r.status)).length})
        </Button>
      </div>

      {filteredRfqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No RFQs found</p>
            <p className="text-gray-500 mb-4">
              {filter === 'all'
                ? "You haven't created any RFQs yet."
                : `No ${filter} RFQs.`}
            </p>
            <Link href="/buyer/rfqs/new">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create your first RFQ
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRfqs.map((rfq) => (
            <Link key={rfq.id} href={`/buyer/rfqs/${rfq.id}`}>
              <Card className="hover:border-green-300 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{rfq.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[rfq.status] || 'bg-gray-100'}`}>
                          {rfq.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">RFQ #{rfq.rfqNumber}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {rfq._count?.lineItems || rfq.lineItems?.length || 0} items
                        </span>
                        {rfq.destinationCountry && (
                          <span>Ship to: {rfq.destinationCountry}</span>
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
                        Created {new Date(rfq.createdAt).toLocaleDateString()}
                      </p>
                      {rfq._count?.quotes > 0 && (
                        <p className="text-sm font-medium text-green-600 mt-1 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          {rfq._count.quotes} quote{rfq._count.quotes > 1 ? 's' : ''}
                        </p>
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

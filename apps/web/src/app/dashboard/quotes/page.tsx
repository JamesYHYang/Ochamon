'use client';

import { useEffect, useState } from 'react';

type QuoteStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  subtotal: number;
  shippingCost: number | null;
  totalAmount: number;
  currency: string;
  incoterm: string;
  estimatedLeadDays: number | null;
  validUntil: string;
  createdAt: string;
  rfq?: {
    id: string;
    rfqNumber: string;
    title: string;
  };
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expired', className: 'bg-yellow-100 text-yellow-800' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-orange-100 text-orange-800' },
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const tokensStr = localStorage.getItem('matcha_tokens');
        if (!tokensStr) {
          throw new Error('Not authenticated. Please log in.');
        }

        const tokens = JSON.parse(tokensStr);
        const accessToken = tokens.accessToken;

        if (!accessToken) {
          throw new Error('No access token found. Please log in again.');
        }

        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const role = payload.role;
        setUserRole(role);

        // Sellers see quotes they've created, buyers see quotes they've received
        const endpoint = role === 'SELLER'
          ? `${process.env.NEXT_PUBLIC_API_URL}/quote/seller`
          : `${process.env.NEXT_PUBLIC_API_URL}/quote/buyer`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch quotes');
        }

        const data = await res.json();
        setQuotes(Array.isArray(data) ? data : data.quotes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Quotes</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {userRole === 'SELLER' ? 'My Quotes' : 'Received Quotes'}
        </h1>
        <p className="text-gray-600 mt-1">
          {userRole === 'SELLER'
            ? 'Manage quotes you have submitted to buyers'
            : 'Review and compare quotes from sellers'}
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes yet</h3>
          <p className="mt-2 text-gray-500">
            {userRole === 'SELLER'
              ? 'Quotes will appear here when you respond to RFQs.'
              : 'Quotes will appear here when sellers respond to your RFQs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {quote.quoteNumber}
                      </h3>
                      <StatusBadge status={quote.status} />
                    </div>
                    {quote.rfq && (
                      <p className="mt-1 text-sm text-gray-600">
                        For RFQ: <span className="font-medium">{quote.rfq.rfqNumber}</span> - {quote.rfq.title}
                      </p>
                    )}
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Incoterm:</span> {quote.incoterm}
                        {quote.estimatedLeadDays && ` • Lead time: ${quote.estimatedLeadDays} days`}
                      </p>
                      <p>
                        <span className="font-medium">Valid until:</span> {formatDate(quote.validUntil)}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span> {formatDate(quote.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(quote.totalAmount, quote.currency)}
                    </p>
                    {quote.shippingCost && (
                      <p className="text-sm text-gray-500 mt-1">
                        + {formatCurrency(quote.shippingCost, quote.currency)} shipping
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    onClick={() => window.location.href = `/dashboard/quotes/${quote.id}`}
                  >
                    View Details
                  </button>
                  {userRole === 'BUYER' && quote.status === 'SUBMITTED' && (
                    <>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Accept Quote
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {userRole === 'SELLER' && quote.status === 'DRAFT' && (
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Submit Quote
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
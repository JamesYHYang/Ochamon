'use client';

import { useEffect, useState } from 'react';

type RfqStatus = 'DRAFT' | 'SUBMITTED' | 'QUOTED' | 'PARTIALLY_QUOTED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

interface Rfq {
  id: string;
  rfqNumber: string;
  title: string;
  notes: string | null;
  destinationCountry: string;
  destinationCity: string | null;
  incoterm: string;
  neededByDate: string | null;
  expiresAt: string | null;
  status: RfqStatus;
  createdAt: string;
}

const STATUS_CONFIG: Record<RfqStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
  QUOTED: { label: 'Quoted', className: 'bg-purple-100 text-purple-800' },
  PARTIALLY_QUOTED: { label: 'Partially Quoted', className: 'bg-indigo-100 text-indigo-800' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Expired', className: 'bg-yellow-100 text-yellow-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: RfqStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RfqsPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRfqs = async () => {
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

        const endpoint = role === 'SELLER'
          ? `${process.env.NEXT_PUBLIC_API_URL}/rfq/available`
          : `${process.env.NEXT_PUBLIC_API_URL}/rfq`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch RFQs');
        }

        const data = await res.json();
        setRfqs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRfqs();
  }, []);

  if (loading) {
    return <div className="p-8">Loading RFQs...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading RFQs</h2>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === 'SELLER' ? 'Available RFQs' : 'My RFQs'}
          </h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'SELLER'
              ? 'Browse and respond to buyer requests'
              : 'Manage your requests for quotation'}
          </p>
        </div>
        {userRole === 'BUYER' && (
          <button
            onClick={() => window.location.href = '/dashboard/rfqs/new'}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Create New RFQ
          </button>
        )}
      </div>

      {rfqs.length === 0 ? (
        <p className="text-gray-500">No RFQs found.</p>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{rfq.rfqNumber}</h3>
                <StatusBadge status={rfq.status} />
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{rfq.incoterm}</span>
              </div>
              <p className="font-medium text-gray-800">{rfq.title}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Destination: {rfq.destinationCity ? `${rfq.destinationCity}, ` : ''}{rfq.destinationCountry}</p>
                {rfq.neededByDate && <p>Needed by: {formatDate(rfq.neededByDate)}</p>}
                <p>Created: {formatDate(rfq.createdAt)}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => window.location.href = `/dashboard/rfqs/${rfq.id}`}
                  className="px-4 py-2 text-sm text-gray-700 border rounded-md hover:bg-gray-50"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
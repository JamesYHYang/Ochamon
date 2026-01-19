'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CartEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-6xl mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-24 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md">
        Looks like you haven't added any matcha products yet. Browse our marketplace to find premium Japanese matcha.
      </p>
      <Link href="/marketplace">
        <Button className="bg-green-600 hover:bg-green-700">
          Browse Marketplace
        </Button>
      </Link>
    </div>
  );
}

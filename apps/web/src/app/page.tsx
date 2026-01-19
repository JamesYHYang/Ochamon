'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-matcha-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍵</span>
            <span className="text-xl font-bold text-matcha-800">
              Matcha Trade
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-matcha-900 mb-6">
            Premium B2B Matcha Trading Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect with verified suppliers and buyers for premium Japanese
            matcha. Streamlined RFQs, transparent pricing, and compliance
            guidance all in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register?role=BUYER">
              <Button size="lg">I&apos;m a Buyer</Button>
            </Link>
            <Link href="/register?role=SELLER">
              <Button size="lg" variant="outline">
                I&apos;m a Seller
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Search</h3>
            <p className="text-gray-600">
              Find exactly what you need with intelligent search that
              understands matcha grades, origins, and specifications.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">Streamlined RFQs</h3>
            <p className="text-gray-600">
              Create requests for quotes, receive competitive bids, and manage
              orders all in one workflow.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">✅</div>
            <h3 className="text-lg font-semibold mb-2">Compliance Ready</h3>
            <p className="text-gray-600">
              Built-in guidance for import regulations, certifications, and food
              safety standards by region.
            </p>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>© 2024 Matcha Trading Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

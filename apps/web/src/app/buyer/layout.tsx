'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Package,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartIcon } from '@/components/cart';

const sidebarLinks = [
  { href: '/buyer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buyer/search', label: 'AI Search', icon: Search },
  { href: '/buyer/rfqs', label: 'My RFQs', icon: FileText },
  { href: '/buyer/orders', label: 'My Orders', icon: Package },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
];

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && user.role !== 'BUYER') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'BUYER') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getBreadcrumb = () => {
    if (pathname === '/buyer') return 'Dashboard';
    if (pathname.includes('/search')) return 'AI Search';
    if (pathname.includes('/rfqs/new')) return 'New RFQ';
    if (pathname.includes('/rfqs/')) return 'RFQ Detail';
    if (pathname.includes('/rfqs')) return 'My RFQs';
    if (pathname.includes('/orders/')) return 'Order Detail';
    if (pathname.includes('/orders')) return 'My Orders';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/buyer" className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-600">🍵 Matcha</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Buyer
              </span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/buyer' && link.href !== '/marketplace' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white border-b h-16 flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center text-sm text-gray-500 flex-1">
            <Link href="/buyer" className="hover:text-gray-700">
              Buyer Portal
            </Link>
            {pathname !== '/buyer' && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-900 font-medium">{getBreadcrumb()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <CartIcon />
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

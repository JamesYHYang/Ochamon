'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { rfqApi, cartApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, ShoppingCart } from 'lucide-react';

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'];

interface LineItem {
  id: string;
  skuId: string;
  skuName: string;
  productName: string;
  qty: number;
  unit: string;
  targetPrice?: number;
  notes?: string;
}

export default function NewRfqPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingCart, setImportingCart] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    destinationCountry: '',
    destinationCity: '',
    incoterm: '',
    neededByDate: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImportFromCart = async () => {
    if (!accessToken) return;
    setImportingCart(true);
    try {
      const cart = await cartApi.getCart(accessToken);
      if (cart.items.length === 0) {
        setError('Your cart is empty. Add items to your cart first.');
        return;
      }
      const items: LineItem[] = cart.items.map((item) => ({
        id: crypto.randomUUID(),
        skuId: item.skuId,
        skuName: item.sku.name,
        productName: item.sku.product.name,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes || '',
      }));
      setLineItems(items);
      if (cart.destinationCountry) {
        setFormData((prev) => ({ ...prev, destinationCountry: cart.destinationCountry || '' }));
      }
      if (cart.incoterm) {
        setFormData((prev) => ({ ...prev, incoterm: cart.incoterm || '' }));
      }
    } catch (err) {
      console.error('Failed to import cart:', err);
      setError('Failed to import cart items');
    } finally {
      setImportingCart(false);
    }
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!formData.title.trim()) {
      setError('Please enter a title for your RFQ');
      return;
    }
    if (!formData.destinationCountry.trim()) {
      setError('Please enter a destination country');
      return;
    }
    if (lineItems.length === 0) {
      setError('Please add at least one item to your RFQ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rfq = await rfqApi.createRfq(accessToken, {
        title: formData.title,
        notes: formData.notes || undefined,
        destinationCountry: formData.destinationCountry,
        destinationCity: formData.destinationCity || undefined,
        incoterm: formData.incoterm || undefined,
        neededByDate: formData.neededByDate || undefined,
        lineItems: lineItems.map((item) => ({
          skuId: item.skuId,
          qty: item.qty,
          unit: item.unit,
          targetPrice: item.targetPrice,
          notes: item.notes,
        })),
      });
      router.push(`/buyer/rfqs/${rfq.id}`);
    } catch (err: any) {
      console.error('Failed to create RFQ:', err);
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/buyer/rfqs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New RFQ</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">RFQ Details</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Q1 2025 Matcha Order"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Country *
                </label>
                <input
                  type="text"
                  name="destinationCountry"
                  value={formData.destinationCountry}
                  onChange={handleInputChange}
                  placeholder="e.g., United States"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination City
                </label>
                <input
                  type="text"
                  name="destinationCity"
                  value={formData.destinationCity}
                  onChange={handleInputChange}
                  placeholder="e.g., Los Angeles"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Incoterm
                </label>
                <select
                  name="incoterm"
                  value={formData.incoterm}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Incoterm</option>
                  {INCOTERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Needed By Date
                </label>
                <input
                  type="date"
                  name="neededByDate"
                  value={formData.neededByDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional requirements or specifications..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Line Items</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImportFromCart}
                disabled={importingCart}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {importingCart ? 'Importing...' : 'Import from Cart'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No items added yet. Import items from your cart or browse the marketplace.
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportFromCart}
                    disabled={importingCart}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Import from Cart
                  </Button>
                  <Link href="/marketplace">
                    <Button type="button" variant="outline">
                      Browse Marketplace
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">{item.skuName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              updateLineItem(item.id, 'qty', Number(e.target.value))
                            }
                            min="1"
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Target Price (optional)
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            value={item.targetPrice || ''}
                            onChange={(e) =>
                              updateLineItem(
                                item.id,
                                'targetPrice',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">/{item.unit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) =>
                            updateLineItem(item.id, 'notes', e.target.value)
                          }
                          placeholder="Specific requirements..."
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/buyer/rfqs">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || lineItems.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Creating...' : 'Submit RFQ'}
          </Button>
        </div>
      </form>
    </div>
  );
}

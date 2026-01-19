'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { complianceApi, type ComplianceRule, type PaginatedComplianceRules } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Shield,
  FileText,
  AlertTriangle,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

// ISO Country codes with names for dropdown
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IN', name: 'India' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

const PRODUCT_CATEGORIES = [
  { value: 'matcha', label: 'Matcha' },
  { value: 'green-tea', label: 'Green Tea' },
  { value: 'tea', label: 'Tea (General)' },
  { value: 'organic-tea', label: 'Organic Tea' },
  { value: 'organic-matcha', label: 'Organic Matcha' },
  { value: 'ceremonial-matcha', label: 'Ceremonial Matcha' },
  { value: 'culinary-matcha', label: 'Culinary Matcha' },
  { value: 'sencha', label: 'Sencha' },
  { value: 'gyokuro', label: 'Gyokuro' },
  { value: 'hojicha', label: 'Hojicha' },
  { value: 'genmaicha', label: 'Genmaicha' },
  { value: 'other', label: 'Other' },
];

const CERTIFICATIONS = [
  { value: 'JAS', label: 'JAS (Japan Agricultural Standard)' },
  { value: 'USDA-organic', label: 'USDA Organic' },
  { value: 'EU-organic', label: 'EU Organic' },
  { value: 'fair-trade', label: 'Fair Trade' },
  { value: 'rainforest-alliance', label: 'Rainforest Alliance' },
  { value: 'non-gmo', label: 'Non-GMO' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'halal', label: 'Halal' },
];

const REQUIRED_DOCS = [
  { value: 'packing-list', label: 'Packing List' },
  { value: 'commercial-invoice', label: 'Commercial Invoice' },
  { value: 'proforma-invoice', label: 'Proforma Invoice' },
  { value: 'bill-of-lading', label: 'Bill of Lading' },
  { value: 'phytosanitary-certificate', label: 'Phytosanitary Certificate' },
  { value: 'certificate-of-origin', label: 'Certificate of Origin' },
  { value: 'organic-certificate', label: 'Organic Certificate' },
  { value: 'jas-certificate', label: 'JAS Certificate' },
  { value: 'certificate-of-analysis', label: 'Certificate of Analysis' },
  { value: 'health-certificate', label: 'Health Certificate' },
  { value: 'import-permit', label: 'Import Permit' },
  { value: 'fumigation-certificate', label: 'Fumigation Certificate' },
  { value: 'insurance-certificate', label: 'Insurance Certificate' },
  { value: 'customs-declaration', label: 'Customs Declaration' },
];

interface RuleFormData {
  destinationCountry: string;
  productCategory: string;
  minDeclaredValueUsd: string;
  minWeightKg: string;
  maxWeightKg: string;
  requiredCertifications: string[];
  requiredDocs: string[];
  warnings: string;
  disclaimerText: string;
  isActive: boolean;
}

const initialFormData: RuleFormData = {
  destinationCountry: '',
  productCategory: '',
  minDeclaredValueUsd: '',
  minWeightKg: '',
  maxWeightKg: '',
  requiredCertifications: [],
  requiredDocs: [],
  warnings: '',
  disclaimerText: 'This compliance information is provided for general guidance only and does not constitute legal advice. Importers are responsible for verifying all requirements with relevant authorities.',
  isActive: true,
};

export default function AdminCompliancePage() {
  const router = useRouter();
  const { accessToken, user, isLoading: authLoading } = useAuth();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(initialFormData);
  const [formError, setFormError] = useState('');

  const fetchRules = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await complianceApi.listRules(accessToken, {
        destinationCountry: filterCountry || undefined,
        productCategory: filterCategory || undefined,
        activeOnly: !showInactive,
        skip: page * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      });
      setRules(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to fetch compliance rules:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filterCountry, filterCategory, showInactive, page]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      fetchRules();
    }
  }, [accessToken, user, fetchRules]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setFormError('');
    setSaving(true);

    try {
      await complianceApi.createRule(accessToken, {
        destinationCountry: formData.destinationCountry,
        productCategory: formData.productCategory,
        minDeclaredValueUsd: formData.minDeclaredValueUsd
          ? parseFloat(formData.minDeclaredValueUsd)
          : null,
        minWeightKg: formData.minWeightKg
          ? parseFloat(formData.minWeightKg)
          : null,
        maxWeightKg: formData.maxWeightKg
          ? parseFloat(formData.maxWeightKg)
          : null,
        requiredCertifications: formData.requiredCertifications,
        requiredDocs: formData.requiredDocs,
        warnings: formData.warnings
          .split('\n')
          .filter((w) => w.trim()),
        disclaimerText: formData.disclaimerText,
        isActive: formData.isActive,
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchRules();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedRule) return;

    setFormError('');
    setSaving(true);

    try {
      await complianceApi.updateRule(accessToken, selectedRule.id, {
        destinationCountry: formData.destinationCountry,
        productCategory: formData.productCategory,
        minDeclaredValueUsd: formData.minDeclaredValueUsd
          ? parseFloat(formData.minDeclaredValueUsd)
          : null,
        minWeightKg: formData.minWeightKg
          ? parseFloat(formData.minWeightKg)
          : null,
        maxWeightKg: formData.maxWeightKg
          ? parseFloat(formData.maxWeightKg)
          : null,
        requiredCertifications: formData.requiredCertifications,
        requiredDocs: formData.requiredDocs,
        warnings: formData.warnings
          .split('\n')
          .filter((w) => w.trim()),
        disclaimerText: formData.disclaimerText,
        isActive: formData.isActive,
      });
      setShowEditModal(false);
      setSelectedRule(null);
      setFormData(initialFormData);
      fetchRules();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!accessToken || !selectedRule) return;

    setSaving(true);
    try {
      await complianceApi.deleteRule(accessToken, selectedRule.id);
      setShowDeleteConfirm(false);
      setSelectedRule(null);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (rule: ComplianceRule) => {
    setSelectedRule(rule);
    setFormData({
      destinationCountry: rule.destinationCountry,
      productCategory: rule.productCategory,
      minDeclaredValueUsd: rule.minDeclaredValueUsd?.toString() || '',
      minWeightKg: rule.minWeightKg?.toString() || '',
      maxWeightKg: rule.maxWeightKg?.toString() || '',
      requiredCertifications: rule.requiredCertifications,
      requiredDocs: rule.requiredDocs,
      warnings: rule.warnings.join('\n'),
      disclaimerText: rule.disclaimerText,
      isActive: rule.isActive,
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteConfirm = (rule: ComplianceRule) => {
    setSelectedRule(rule);
    setShowDeleteConfirm(true);
  };

  const getCountryName = (code: string) => {
    return COUNTRIES.find((c) => c.code === code)?.name || code;
  };

  const getCategoryLabel = (value: string) => {
    return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Rules</h1>
          <p className="text-gray-500 mt-1">
            Manage import/export compliance rules for different countries and product categories
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData(initialFormData);
            setFormError('');
            setShowCreateModal(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <select
                value={filterCountry}
                onChange={(e) => {
                  setFilterCountry(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setPage(0);
                }}
                className="rounded"
              />
              Show Inactive
            </label>
            <div className="ml-auto text-sm text-gray-500">
              {total} rules found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No compliance rules found</p>
              <p className="text-sm mt-1">Create a new rule to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Thresholds
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Required Docs
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Warnings
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {getCountryName(rule.destinationCountry)}
                        </span>
                        <span className="text-gray-400 ml-1 text-xs">
                          ({rule.destinationCountry})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getCategoryLabel(rule.productCategory)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {rule.minDeclaredValueUsd && (
                          <div>Min Value: ${rule.minDeclaredValueUsd}</div>
                        )}
                        {rule.minWeightKg && (
                          <div>Min Weight: {rule.minWeightKg} kg</div>
                        )}
                        {rule.maxWeightKg && (
                          <div>Max Weight: {rule.maxWeightKg} kg</div>
                        )}
                        {!rule.minDeclaredValueUsd &&
                          !rule.minWeightKg &&
                          !rule.maxWeightKg && (
                            <span className="text-gray-400">No thresholds</span>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{rule.requiredDocs.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {rule.warnings.length > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{rule.warnings.length}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(rule)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={showEditModal ? handleUpdateRule : handleCreateRule}>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {showEditModal ? 'Edit Compliance Rule' : 'Create Compliance Rule'}
                </h2>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Country & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Destination Country *
                      </label>
                      <select
                        value={formData.destinationCountry}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            destinationCountry: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Product Category *
                      </label>
                      <select
                        value={formData.productCategory}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            productCategory: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">Select category</option>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Thresholds */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Min Declared Value (USD)
                      </label>
                      <input
                        type="number"
                        value={formData.minDeclaredValueUsd}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            minDeclaredValueUsd: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        step="0.01"
                        placeholder="No minimum"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Min Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.minWeightKg}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            minWeightKg: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        step="0.01"
                        placeholder="No minimum"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Max Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.maxWeightKg}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            maxWeightKg: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        step="0.01"
                        placeholder="No maximum"
                      />
                    </div>
                  </div>

                  {/* Required Certifications */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Required Certifications
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CERTIFICATIONS.map((cert) => (
                        <label
                          key={cert.value}
                          className="flex items-center gap-2 px-3 py-1 border rounded-full cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.requiredCertifications.includes(
                              cert.value
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((f) => ({
                                  ...f,
                                  requiredCertifications: [
                                    ...f.requiredCertifications,
                                    cert.value,
                                  ],
                                }));
                              } else {
                                setFormData((f) => ({
                                  ...f,
                                  requiredCertifications:
                                    f.requiredCertifications.filter(
                                      (c) => c !== cert.value
                                    ),
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{cert.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Required Documents */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Required Documents *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {REQUIRED_DOCS.map((doc) => (
                        <label
                          key={doc.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.requiredDocs.includes(doc.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((f) => ({
                                  ...f,
                                  requiredDocs: [...f.requiredDocs, doc.value],
                                }));
                              } else {
                                setFormData((f) => ({
                                  ...f,
                                  requiredDocs: f.requiredDocs.filter(
                                    (d) => d !== doc.value
                                  ),
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{doc.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Warnings */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Warnings (one per line)
                    </label>
                    <textarea
                      value={formData.warnings}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, warnings: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="Perishable item - check lead time&#10;Temperature controlled shipping required"
                    />
                  </div>

                  {/* Disclaimer */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Disclaimer Text *
                    </label>
                    <textarea
                      value={formData.disclaimerText}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          disclaimerText: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={4}
                      required
                    />
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            isActive: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedRule(null);
                      setFormData(initialFormData);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      !formData.destinationCountry ||
                      !formData.productCategory ||
                      formData.requiredDocs.length === 0 ||
                      !formData.disclaimerText
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving
                      ? 'Saving...'
                      : showEditModal
                        ? 'Update Rule'
                        : 'Create Rule'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedRule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Delete Compliance Rule?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this rule for{' '}
                <strong>{getCountryName(selectedRule.destinationCountry)}</strong> -{' '}
                <strong>{getCategoryLabel(selectedRule.productCategory)}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This will deactivate the rule. Existing evaluations will not be
                affected.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedRule(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteRule}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {saving ? 'Deleting...' : 'Delete Rule'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  trendsApi,
  libraryApi,
  type TrendSeries,
  type TrendPoint,
  type LibraryRegion,
  type CreateTrendSeriesData,
  type CreateTrendPointData,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendChart } from '@/components/trends/TrendChart';
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Eye,
  EyeOff,
  BarChart2,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const TREND_TYPES = [
  { value: 'PRICING', label: 'Pricing', icon: '💰' },
  { value: 'WEATHER', label: 'Weather', icon: '☀️' },
  { value: 'DEMAND', label: 'Demand', icon: '📈' },
  { value: 'SUPPLY', label: 'Supply', icon: '📦' },
] as const;

interface SeriesFormData {
  name: string;
  description: string;
  type: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
  unit: string;
  regionId: string;
  isActive: boolean;
}

const initialSeriesFormData: SeriesFormData = {
  name: '',
  description: '',
  type: 'PRICING',
  unit: 'USD/kg',
  regionId: '',
  isActive: true,
};

interface PointFormData {
  date: string;
  value: string;
  unit: string;
}

const initialPointFormData: PointFormData = {
  date: new Date().toISOString().split('T')[0],
  value: '',
  unit: '',
};

export default function AdminTrendsPage() {
  const router = useRouter();
  const { accessToken, user, isLoading: authLoading } = useAuth();
  const [trendSeries, setTrendSeries] = useState<TrendSeries[]>([]);
  const [regions, setRegions] = useState<LibraryRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataPointsModal, setShowDataPointsModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<(TrendSeries & { dataPoints: TrendPoint[] }) | null>(null);
  const [seriesFormData, setSeriesFormData] = useState<SeriesFormData>(initialSeriesFormData);
  const [pointFormData, setPointFormData] = useState<PointFormData>(initialPointFormData);
  const [formError, setFormError] = useState('');

  // Fetch regions
  useEffect(() => {
    libraryApi
      .getRegions()
      .then(setRegions)
      .catch(console.error);
  }, []);

  const fetchTrendSeries = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await trendsApi.adminListTrendSeries(accessToken, {
        skip: page * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        type: filterType as any || undefined,
        regionId: filterRegion || undefined,
        isPublic: showInactive ? undefined : true,
      });
      setTrendSeries(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to fetch trend series:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, filterType, filterRegion, showInactive]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      fetchTrendSeries();
    }
  }, [accessToken, user, fetchTrendSeries]);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setFormError('');
    setSaving(true);

    try {
      await trendsApi.adminCreateTrendSeries(accessToken, {
        name: seriesFormData.name,
        description: seriesFormData.description || undefined,
        type: seriesFormData.type,
        unit: seriesFormData.unit,
        regionId: seriesFormData.regionId || undefined,
        isActive: seriesFormData.isActive,
      });
      setShowCreateModal(false);
      setSeriesFormData(initialSeriesFormData);
      fetchTrendSeries();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to create trend series');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSeries) return;

    setFormError('');
    setSaving(true);

    try {
      await trendsApi.adminUpdateTrendSeries(accessToken, selectedSeries.id, {
        name: seriesFormData.name,
        description: seriesFormData.description || undefined,
        type: seriesFormData.type,
        unit: seriesFormData.unit,
        regionId: seriesFormData.regionId || undefined,
        isActive: seriesFormData.isActive,
      });
      setShowEditModal(false);
      setSelectedSeries(null);
      setSeriesFormData(initialSeriesFormData);
      fetchTrendSeries();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to update trend series');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (series: TrendSeries) => {
    if (!accessToken) return;

    try {
      await trendsApi.adminToggleTrendSeriesActive(accessToken, series.id);
      fetchTrendSeries();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const handleDeleteSeries = async () => {
    if (!accessToken || !selectedSeries) return;

    setSaving(true);
    try {
      await trendsApi.adminDeleteTrendSeries(accessToken, selectedSeries.id);
      setShowDeleteConfirm(false);
      setSelectedSeries(null);
      fetchTrendSeries();
    } catch (error) {
      console.error('Failed to delete series:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDataPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSeries) return;

    setFormError('');
    setSaving(true);

    try {
      await trendsApi.adminAddTrendPoint(accessToken, selectedSeries.id, {
        date: pointFormData.date,
        value: parseFloat(pointFormData.value),
        unit: pointFormData.unit || selectedSeries.unit,
      });

      // Refresh the selected series data
      const updated = await trendsApi.adminGetTrendSeries(accessToken, selectedSeries.id);
      setSelectedSeries(updated);
      setPointFormData({ ...initialPointFormData, unit: selectedSeries.unit });
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to add data point');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDataPoint = async (pointId: string) => {
    if (!accessToken || !selectedSeries) return;

    try {
      await trendsApi.adminDeleteTrendPoint(accessToken, pointId);
      const updated = await trendsApi.adminGetTrendSeries(accessToken, selectedSeries.id);
      setSelectedSeries(updated);
    } catch (error) {
      console.error('Failed to delete data point:', error);
    }
  };

  const openEditModal = (series: TrendSeries) => {
    setSelectedSeries(series as any);
    setSeriesFormData({
      name: series.name,
      description: series.description || '',
      type: series.type,
      unit: series.unit,
      regionId: series.regionId || '',
      isActive: series.isActive,
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteConfirm = (series: TrendSeries) => {
    setSelectedSeries(series as any);
    setShowDeleteConfirm(true);
  };

  const openDataPointsModal = async (series: TrendSeries) => {
    if (!accessToken) return;

    try {
      const fullSeries = await trendsApi.adminGetTrendSeries(accessToken, series.id);
      setSelectedSeries(fullSeries);
      setPointFormData({ ...initialPointFormData, unit: fullSeries.unit });
      setFormError('');
      setShowDataPointsModal(true);
    } catch (error) {
      console.error('Failed to load series data:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    return TREND_TYPES.find((t) => t.value === type)?.icon || '📊';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Trends Management</h1>
          <p className="text-gray-500 mt-1">
            Manage market trend data series and data points
          </p>
        </div>
        <Button
          onClick={() => {
            setSeriesFormData(initialSeriesFormData);
            setFormError('');
            setShowCreateModal(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Series
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Types</option>
              {TREND_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <select
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
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
            <div className="ml-auto text-sm text-gray-500">{total} series found</div>
          </div>
        </CardContent>
      </Card>

      {/* Series Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : trendSeries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No trend series found</p>
              <p className="text-sm mt-1">Create a new series to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Region</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Unit</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Data Points</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trendSeries.map((series) => (
                    <tr key={series.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{series.name}</div>
                        {series.description && (
                          <div className="text-gray-400 text-xs line-clamp-1">
                            {series.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          {getTypeIcon(series.type)} {series.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{series.region?.name || '-'}</td>
                      <td className="px-4 py-3">{series.unit}</td>
                      <td className="px-4 py-3">{series._count?.dataPoints || 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            series.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {series.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDataPointsModal(series)}
                            title="Manage Data Points"
                          >
                            <BarChart2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(series)}
                            title={series.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {series.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(series)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(series)}
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

      {/* Create/Edit Series Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={showEditModal ? handleUpdateSeries : handleCreateSeries}>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {showEditModal ? 'Edit Trend Series' : 'Create Trend Series'}
                </h2>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <Input
                      value={seriesFormData.name}
                      onChange={(e) => setSeriesFormData((f) => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="e.g., Uji Matcha Pricing Index"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={seriesFormData.description}
                      onChange={(e) => setSeriesFormData((f) => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                      placeholder="Brief description of this trend series"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type *</label>
                      <select
                        value={seriesFormData.type}
                        onChange={(e) => setSeriesFormData((f) => ({ ...f, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        {TREND_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unit *</label>
                      <Input
                        value={seriesFormData.unit}
                        onChange={(e) => setSeriesFormData((f) => ({ ...f, unit: e.target.value }))}
                        required
                        placeholder="e.g., USD/kg, °C, %"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Region (optional)</label>
                    <select
                      value={seriesFormData.regionId}
                      onChange={(e) => setSeriesFormData((f) => ({ ...f, regionId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Global / No specific region</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}, {region.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seriesFormData.isActive}
                        onChange={(e) => setSeriesFormData((f) => ({ ...f, isActive: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Active (visible to public)</span>
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
                      setSelectedSeries(null);
                      setSeriesFormData(initialSeriesFormData);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !seriesFormData.name || !seriesFormData.unit}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving ? 'Saving...' : showEditModal ? 'Update Series' : 'Create Series'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Points Modal */}
      {showDataPointsModal && selectedSeries && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedSeries.name}</h2>
                  <p className="text-gray-500 text-sm">
                    {getTypeIcon(selectedSeries.type)} {selectedSeries.type} • {selectedSeries.unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDataPointsModal(false);
                    setSelectedSeries(null);
                  }}
                >
                  Close
                </Button>
              </div>

              {/* Chart */}
              {selectedSeries.dataPoints && selectedSeries.dataPoints.length > 0 && (
                <div className="h-64 mb-6 bg-gray-50 rounded-lg p-4">
                  <TrendChart
                    data={selectedSeries.dataPoints}
                    unit={selectedSeries.unit}
                    type={selectedSeries.type}
                  />
                </div>
              )}

              {/* Add Data Point Form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium mb-3">Add Data Point</h3>
                {formError && (
                  <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleAddDataPoint} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <Input
                      type="date"
                      value={pointFormData.date}
                      onChange={(e) => setPointFormData((f) => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <Input
                      type="number"
                      step="any"
                      value={pointFormData.value}
                      onChange={(e) => setPointFormData((f) => ({ ...f, value: e.target.value }))}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <Input
                      value={pointFormData.unit}
                      onChange={(e) => setPointFormData((f) => ({ ...f, unit: e.target.value }))}
                      placeholder={selectedSeries.unit}
                    />
                  </div>
                  <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </form>
              </div>

              {/* Data Points Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Value</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Unit</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedSeries.dataPoints && selectedSeries.dataPoints.length > 0 ? (
                      selectedSeries.dataPoints.map((point) => (
                        <tr key={point.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{formatDate(point.date)}</td>
                          <td className="px-4 py-2 font-mono">{point.value}</td>
                          <td className="px-4 py-2">{point.unit}</td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDataPoint(point.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No data points yet. Add your first data point above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedSeries && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Delete Trend Series?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedSeries.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This will also delete all associated data points. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedSeries(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteSeries}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {saving ? 'Deleting...' : 'Delete Series'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  insightsApi,
  type InsightsPost,
  type PaginatedInsights,
  type Category,
  type Tag,
  type CreateInsightsPostData,
  type UpdateInsightsPostData,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

interface InsightFormData {
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  categoryId: string;
  tagIds: string[];
  metaTitle: string;
  metaDescription: string;
}

const initialFormData: InsightFormData = {
  title: '',
  excerpt: '',
  content: '',
  featuredImage: '',
  categoryId: '',
  tagIds: [],
  metaTitle: '',
  metaDescription: '',
};

export default function AdminInsightsPage() {
  const router = useRouter();
  const { accessToken, user, isLoading: authLoading } = useAuth();
  const [insights, setInsights] = useState<InsightsPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightsPost | null>(null);
  const [formData, setFormData] = useState<InsightFormData>(initialFormData);
  const [formError, setFormError] = useState('');

  // Fetch categories and tags
  useEffect(() => {
    Promise.all([insightsApi.getCategories(), insightsApi.getTags()])
      .then(([cats, tgs]) => {
        setCategories(cats);
        setTags(tgs);
      })
      .catch(console.error);
  }, []);

  const fetchInsights = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await insightsApi.adminListInsights(accessToken, {
        skip: page * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        status: filterStatus,
        categoryId: filterCategory || undefined,
        search: searchQuery || undefined,
      });
      setInsights(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, filterStatus, filterCategory, searchQuery]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      fetchInsights();
    }
  }, [accessToken, user, fetchInsights]);

  const handleCreateInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setFormError('');
    setSaving(true);

    try {
      await insightsApi.adminCreateInsight(accessToken, {
        title: formData.title,
        excerpt: formData.excerpt || undefined,
        content: formData.content,
        featuredImage: formData.featuredImage || undefined,
        categoryId: formData.categoryId,
        tagIds: formData.tagIds,
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchInsights();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to create insight');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedInsight) return;

    setFormError('');
    setSaving(true);

    try {
      await insightsApi.adminUpdateInsight(accessToken, selectedInsight.id, {
        title: formData.title,
        excerpt: formData.excerpt || undefined,
        content: formData.content,
        featuredImage: formData.featuredImage || undefined,
        categoryId: formData.categoryId,
        tagIds: formData.tagIds,
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
      });
      setShowEditModal(false);
      setSelectedInsight(null);
      setFormData(initialFormData);
      fetchInsights();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      setFormError(apiError.message || 'Failed to update insight');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (insight: InsightsPost) => {
    if (!accessToken) return;

    try {
      if (insight.isPublished) {
        await insightsApi.adminUnpublishInsight(accessToken, insight.id);
      } else {
        await insightsApi.adminPublishInsight(accessToken, insight.id);
      }
      fetchInsights();
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  };

  const handleDeleteInsight = async () => {
    if (!accessToken || !selectedInsight) return;

    setSaving(true);
    try {
      await insightsApi.adminDeleteInsight(accessToken, selectedInsight.id);
      setShowDeleteConfirm(false);
      setSelectedInsight(null);
      fetchInsights();
    } catch (error) {
      console.error('Failed to delete insight:', error);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (insight: InsightsPost) => {
    setSelectedInsight(insight);
    setFormData({
      title: insight.title,
      excerpt: insight.excerpt || '',
      content: insight.content,
      featuredImage: insight.featuredImage || '',
      categoryId: insight.categoryId,
      tagIds: insight.tags?.map((t) => t.id) || [],
      metaTitle: insight.metaTitle || '',
      metaDescription: insight.metaDescription || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteConfirm = (insight: InsightsPost) => {
    setSelectedInsight(insight);
    setShowDeleteConfirm(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
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
          <h1 className="text-2xl font-bold text-gray-900">Insights Management</h1>
          <p className="text-gray-500 mt-1">
            Create and manage blog posts and articles
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
          New Insight
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="ml-auto text-sm text-gray-500">{total} insights found</div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No insights found</p>
              <p className="text-sm mt-1">Create a new insight to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Author</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Published</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Views</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {insights.map((insight) => (
                    <tr key={insight.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium line-clamp-1">{insight.title}</div>
                        <div className="text-gray-400 text-xs">/insights/{insight.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        {insight.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {insight.author?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            insight.isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {insight.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(insight.publishedAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {insight.viewCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(insight)}
                            title={insight.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {insight.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(insight)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(insight)}
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
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={showEditModal ? handleUpdateInsight : handleCreateInsight}>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">
                  {showEditModal ? 'Edit Insight' : 'Create Insight'}
                </h2>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                      required
                      placeholder="Article title"
                    />
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Excerpt</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData((f) => ({ ...f, excerpt: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                      placeholder="Brief summary of the article"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Content *</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                      rows={12}
                      required
                      placeholder="Article content (HTML supported)"
                    />
                  </div>

                  {/* Category & Featured Image */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Category *</label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData((f) => ({ ...f, categoryId: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Featured Image URL</label>
                      <Input
                        type="url"
                        value={formData.featuredImage}
                        onChange={(e) => setFormData((f) => ({ ...f, featuredImage: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2 px-3 py-1 border rounded-full cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.tagIds.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((f) => ({
                                  ...f,
                                  tagIds: [...f.tagIds, tag.id],
                                }));
                              } else {
                                setFormData((f) => ({
                                  ...f,
                                  tagIds: f.tagIds.filter((id) => id !== tag.id),
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* SEO */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">SEO Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Meta Title</label>
                        <Input
                          value={formData.metaTitle}
                          onChange={(e) => setFormData((f) => ({ ...f, metaTitle: e.target.value }))}
                          placeholder="SEO title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Meta Description</label>
                        <Input
                          value={formData.metaDescription}
                          onChange={(e) => setFormData((f) => ({ ...f, metaDescription: e.target.value }))}
                          placeholder="SEO description"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedInsight(null);
                      setFormData(initialFormData);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.title || !formData.content || !formData.categoryId}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {saving ? 'Saving...' : showEditModal ? 'Update Insight' : 'Create Insight'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedInsight && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Delete Insight?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedInsight.title}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedInsight(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteInsight}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {saving ? 'Deleting...' : 'Delete Insight'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

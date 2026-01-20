'use client';

import { useEffect, useState, useRef } from 'react';

interface Region {
  id: string;
  name: string;
  country: string;
}

interface GradeType {
  id: string;
  name: string;
  code: string;
}

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  file?: File;
}

interface ProductFormData {
  name: string;
  description: string;
  shortDesc: string;
  regionId: string;
  gradeTypeId: string;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  status: 'DRAFT' | 'ACTIVE';
}

const CERTIFICATION_OPTIONS = [
  'JAS Organic',
  'USDA Organic',
  'EU Organic',
  'Kosher',
  'Halal',
  'Fair Trade',
];

export default function NewProductPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    shortDesc: '',
    regionId: '',
    gradeTypeId: '',
    leadTimeDays: 14,
    moqKg: 1,
    certifications: [],
    status: 'DRAFT',
  });

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const tokensStr = localStorage.getItem('matcha_tokens');
        const headers: Record<string, string> = {};

        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          if (tokens.accessToken) {
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          }
        }

        const [regionsRes, gradesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/library/regions`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/library/grades`, { headers }),
        ]);

        if (regionsRes.ok) {
          const regionsData = await regionsRes.json();
          setRegions(Array.isArray(regionsData) ? regionsData : []);
        }

        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          setGradeTypes(Array.isArray(gradesData) ? gradesData : []);
        }
      } catch (err) {
        console.error('Failed to load reference data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchReferenceData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCertificationChange = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ProductImage[] = Array.from(files).map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      altText: file.name,
      isPrimary: images.length === 0 && index === 0,
      file,
    }));

    setImages((prev) => [...prev, ...newImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== imageId);
      const removedImage = prev.find((img) => img.id === imageId);
      
      if (removedImage?.isPrimary && filtered.length > 0) {
        filtered[0].isPrimary = true;
      }
      
      return filtered;
    });
  };

  const handleSetPrimary = (imageId: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      const payload = {
        ...formData,
        status: saveAsDraft ? 'DRAFT' : formData.status,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/seller/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create product');
      }

      const product = await res.json();

      // Upload images if any
      for (const image of images) {
        if (image.file) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', image.file);
          formDataUpload.append('isPrimary', String(image.isPrimary));

          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/seller/products/${product.id}/images`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formDataUpload,
            });
          } catch (imgErr) {
            console.warn('Image upload failed:', imgErr);
          }
        }
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href = `/dashboard/products/${product.id}`;
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-green-800">Product Created Successfully!</h2>
          <p className="mt-2 text-green-600">Redirecting to product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => window.location.href = '/dashboard/products'}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add New Product</h1>
        <p className="text-gray-600 mt-1">Create a new product listing for your matcha</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Images Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Product Images</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                  image.isPrimary ? 'border-indigo-500' : 'border-gray-200'
                }`}
              >
                <img
                  src={image.url}
                  alt={image.altText || 'Product image'}
                  className="w-full h-full object-cover"
                />
                {image.isPrimary && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded">
                    Primary
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1 flex justify-center gap-1">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      className="px-2 py-1 bg-white text-gray-700 text-xs rounded hover:bg-gray-100"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image.id)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Add Image Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="mt-2 text-sm text-gray-500">Add Image</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          <p className="text-sm text-gray-500">
            Upload product images. The primary image will be shown in listings. Recommended size: 800x800px.
          </p>
        </div>

        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Premium Uji Matcha"
            />
          </div>

          <div>
            <label htmlFor="shortDesc" className="block text-sm font-medium text-gray-700 mb-1">
              Short Description
            </label>
            <input
              type="text"
              id="shortDesc"
              name="shortDesc"
              value={formData.shortDesc}
              onChange={handleChange}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description for product cards"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Full Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Detailed product description..."
            />
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Classification</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="regionId" className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                id="regionId"
                name="regionId"
                value={formData.regionId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}, {region.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gradeTypeId" className="block text-sm font-medium text-gray-700 mb-1">
                Grade <span className="text-red-500">*</span>
              </label>
              <select
                id="gradeTypeId"
                name="gradeTypeId"
                value={formData.gradeTypeId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a grade</option>
                {gradeTypes.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name} ({grade.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Logistics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Pricing & Logistics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="moqKg" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order Quantity (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="moqKg"
                name="moqKg"
                value={formData.moqKg}
                onChange={handleChange}
                required
                min="0.1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="leadTimeDays" className="block text-sm font-medium text-gray-700 mb-1">
                Lead Time (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="leadTimeDays"
                name="leadTimeDays"
                value={formData.leadTimeDays}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Certifications</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CERTIFICATION_OPTIONS.map((cert) => (
              <label key={cert} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.certifications.includes(cert)}
                  onChange={() => handleCertificationChange(cert)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{cert}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Status</h2>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={formData.status === 'DRAFT'}
                onChange={handleChange}
                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Draft (not visible to buyers)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={formData.status === 'ACTIVE'}
                onChange={handleChange}
                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Active (visible to buyers)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => window.location.href = '/dashboard/products'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
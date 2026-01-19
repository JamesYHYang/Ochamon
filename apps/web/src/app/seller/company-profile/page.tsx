'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { sellerApi, SellerProfile } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export default function CompanyProfilePage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    company: {
      name: '',
      legalName: '',
      taxId: '',
      website: '',
      phone: '',
      email: '',
      description: '',
    },
    yearsInBusiness: '',
    annualCapacityKg: '',
    exportLicenseNo: '',
    isOrganic: false,
    isJasCertified: false,
    isUsdaCertified: false,
    isEuCertified: false,
    bio: '',
  });

  useEffect(() => {
    if (accessToken) {
      loadProfile();
    }
  }, [accessToken]);

  const loadProfile = async () => {
    try {
      const data = await sellerApi.getProfile(accessToken!);
      setProfile(data);
      setFormData({
        company: {
          name: data.company.name || '',
          legalName: data.company.legalName || '',
          taxId: data.company.taxId || '',
          website: data.company.website || '',
          phone: data.company.phone || '',
          email: data.company.email || '',
          description: data.company.description || '',
        },
        yearsInBusiness: data.yearsInBusiness?.toString() || '',
        annualCapacityKg: data.annualCapacityKg?.toString() || '',
        exportLicenseNo: data.exportLicenseNo || '',
        isOrganic: data.isOrganic,
        isJasCertified: data.isJasCertified,
        isUsdaCertified: data.isUsdaCertified,
        isEuCertified: data.isEuCertified,
        bio: data.bio || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      await sellerApi.updateProfile(accessToken!, {
        company: formData.company,
        yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
        annualCapacityKg: formData.annualCapacityKg ? parseInt(formData.annualCapacityKg) : undefined,
        exportLicenseNo: formData.exportLicenseNo || undefined,
        isOrganic: formData.isOrganic,
        isJasCertified: formData.isJasCertified,
        isUsdaCertified: formData.isUsdaCertified,
        isEuCertified: formData.isEuCertified,
        bio: formData.bio || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('company.')) {
      const companyField = field.replace('company.', '');
      setFormData((prev) => ({
        ...prev,
        company: { ...prev.company, [companyField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-gray-500">
          Manage your company information and certifications
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Basic information about your company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.company.name}
                  onChange={(e) => handleChange('company.name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  value={formData.company.legalName}
                  onChange={(e) => handleChange('company.legalName', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Business Number</Label>
                <Input
                  id="taxId"
                  value={formData.company.taxId}
                  onChange={(e) => handleChange('company.taxId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.company.website}
                  onChange={(e) => handleChange('company.website', e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.company.phone}
                  onChange={(e) => handleChange('company.phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.company.email}
                  onChange={(e) => handleChange('company.email', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Company Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-500 focus:border-transparent"
                value={formData.company.description}
                onChange={(e) => handleChange('company.description', e.target.value)}
                placeholder="Tell buyers about your company..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Information about your operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input
                  id="yearsInBusiness"
                  type="number"
                  min="0"
                  value={formData.yearsInBusiness}
                  onChange={(e) => handleChange('yearsInBusiness', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualCapacityKg">Annual Capacity (kg)</Label>
                <Input
                  id="annualCapacityKg"
                  type="number"
                  min="0"
                  value={formData.annualCapacityKg}
                  onChange={(e) => handleChange('annualCapacityKg', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exportLicenseNo">Export License No.</Label>
                <Input
                  id="exportLicenseNo"
                  value={formData.exportLicenseNo}
                  onChange={(e) => handleChange('exportLicenseNo', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Seller Bio</Label>
              <textarea
                id="bio"
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-500 focus:border-transparent"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell your story..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>
              Select the certifications your products have
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.isOrganic}
                  onChange={(e) => handleChange('isOrganic', e.target.checked)}
                  className="h-4 w-4 text-matcha-600 rounded focus:ring-matcha-500"
                />
                <span className="text-sm font-medium">Organic</span>
              </label>

              <label className="flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.isJasCertified}
                  onChange={(e) => handleChange('isJasCertified', e.target.checked)}
                  className="h-4 w-4 text-matcha-600 rounded focus:ring-matcha-500"
                />
                <span className="text-sm font-medium">JAS Certified</span>
              </label>

              <label className="flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.isUsdaCertified}
                  onChange={(e) => handleChange('isUsdaCertified', e.target.checked)}
                  className="h-4 w-4 text-matcha-600 rounded focus:ring-matcha-500"
                />
                <span className="text-sm font-medium">USDA Organic</span>
              </label>

              <label className="flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.isEuCertified}
                  onChange={(e) => handleChange('isEuCertified', e.target.checked)}
                  className="h-4 w-4 text-matcha-600 rounded focus:ring-matcha-500"
                />
                <span className="text-sm font-medium">EU Organic</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    profile.verificationStatus === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : profile.verificationStatus === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {profile.verificationStatus}
                </span>
                {profile.verificationStatus === 'APPROVED' && (
                  <span className="text-sm text-gray-500">
                    Your account is verified and visible to buyers
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Changes saved</span>
            </div>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="bg-matcha-600 hover:bg-matcha-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

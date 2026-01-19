'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FilterOptions {
  grades: Array<{ code: string; name: string }>;
  regions: Array<{ name: string; country: string }>;
  certifications: string[];
  moqRange: { min: number; max: number };
  leadTimeRange: { min: number; max: number };
  priceRange: { min: number; max: number };
}

export interface Filters {
  grades: string[];
  origins: string[];
  certifications: string[];
  moqMin?: number;
  moqMax?: number;
  leadTimeMin?: number;
  leadTimeMax?: number;
  priceMin?: number;
  priceMax?: number;
}

interface FilterSidebarProps {
  options: FilterOptions | null;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-2"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="space-y-2">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  options,
  filters,
  onFiltersChange,
  onClearFilters,
  isLoading = false,
}: FilterSidebarProps) {
  const [regionSearch, setRegionSearch] = useState('');

  const hasActiveFilters =
    filters.grades.length > 0 ||
    filters.origins.length > 0 ||
    filters.certifications.length > 0 ||
    filters.moqMin !== undefined ||
    filters.moqMax !== undefined ||
    filters.leadTimeMax !== undefined ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined;

  const handleGradeChange = (code: string, checked: boolean) => {
    const newGrades = checked
      ? [...filters.grades, code]
      : filters.grades.filter((g) => g !== code);
    onFiltersChange({ ...filters, grades: newGrades });
  };

  const handleRegionChange = (name: string, checked: boolean) => {
    const newOrigins = checked
      ? [...filters.origins, name]
      : filters.origins.filter((o) => o !== name);
    onFiltersChange({ ...filters, origins: newOrigins });
  };

  const handleCertChange = (cert: string, checked: boolean) => {
    const newCerts = checked
      ? [...filters.certifications, cert]
      : filters.certifications.filter((c) => c !== cert);
    onFiltersChange({ ...filters, certifications: newCerts });
  };

  const handleRangeChange = (
    field: 'moq' | 'leadTime' | 'price',
    type: 'min' | 'max',
    value: string,
  ) => {
    const numValue = value === '' ? undefined : Number(value);
    if (field === 'moq') {
      onFiltersChange({
        ...filters,
        [type === 'min' ? 'moqMin' : 'moqMax']: numValue,
      });
    } else if (field === 'leadTime') {
      onFiltersChange({
        ...filters,
        [type === 'min' ? 'leadTimeMin' : 'leadTimeMax']: numValue,
      });
    } else {
      onFiltersChange({
        ...filters,
        [type === 'min' ? 'priceMin' : 'priceMax']: numValue,
      });
    }
  };

  const filteredRegions =
    options?.regions.filter((r) =>
      r.name.toLowerCase().includes(regionSearch.toLowerCase()),
    ) || [];

  if (isLoading || !options) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Grade Filter */}
      <FilterSection title="Grade">
        {options.grades.map((grade) => (
          <label
            key={grade.code}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <Checkbox
              checked={filters.grades.includes(grade.code)}
              onCheckedChange={(checked) =>
                handleGradeChange(grade.code, checked as boolean)
              }
            />
            {grade.name}
          </label>
        ))}
      </FilterSection>

      {/* Origin/Region Filter */}
      <FilterSection title="Origin / Region">
        <Input
          type="text"
          placeholder="Search regions..."
          value={regionSearch}
          onChange={(e) => setRegionSearch(e.target.value)}
          className="h-8 text-sm mb-2"
        />
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredRegions.map((region) => (
            <label
              key={region.name}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <Checkbox
                checked={filters.origins.includes(region.name)}
                onCheckedChange={(checked) =>
                  handleRegionChange(region.name, checked as boolean)
                }
              />
              {region.name}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Certification Filter */}
      <FilterSection title="Certification">
        {options.certifications.map((cert) => (
          <label
            key={cert}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <Checkbox
              checked={filters.certifications.includes(cert)}
              onCheckedChange={(checked) =>
                handleCertChange(cert, checked as boolean)
              }
            />
            {cert}
          </label>
        ))}
        {options.certifications.length === 0 && (
          <p className="text-xs text-gray-500">No certifications available</p>
        )}
      </FilterSection>

      {/* MOQ Range */}
      <FilterSection title="MOQ (kg)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Min (${options.moqRange.min})`}
            value={filters.moqMin ?? ''}
            onChange={(e) => handleRangeChange('moq', 'min', e.target.value)}
            className="h-8 text-sm"
            min={options.moqRange.min}
            max={options.moqRange.max}
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            placeholder={`Max (${options.moqRange.max})`}
            value={filters.moqMax ?? ''}
            onChange={(e) => handleRangeChange('moq', 'max', e.target.value)}
            className="h-8 text-sm"
            min={options.moqRange.min}
            max={options.moqRange.max}
          />
        </div>
      </FilterSection>

      {/* Lead Time Range */}
      <FilterSection title="Lead Time (days)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Min (${options.leadTimeRange.min})`}
            value={filters.leadTimeMin ?? ''}
            onChange={(e) => handleRangeChange('leadTime', 'min', e.target.value)}
            className="h-8 text-sm"
            min={options.leadTimeRange.min}
            max={options.leadTimeRange.max}
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            placeholder={`Max (${options.leadTimeRange.max})`}
            value={filters.leadTimeMax ?? ''}
            onChange={(e) => handleRangeChange('leadTime', 'max', e.target.value)}
            className="h-8 text-sm"
            min={options.leadTimeRange.min}
            max={options.leadTimeRange.max}
          />
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price ($/kg)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Min ($${options.priceRange.min})`}
            value={filters.priceMin ?? ''}
            onChange={(e) => handleRangeChange('price', 'min', e.target.value)}
            className="h-8 text-sm"
            min={options.priceRange.min}
            max={options.priceRange.max}
          />
          <span className="text-gray-400">-</span>
          <Input
            type="number"
            placeholder={`Max ($${options.priceRange.max})`}
            value={filters.priceMax ?? ''}
            onChange={(e) => handleRangeChange('price', 'max', e.target.value)}
            className="h-8 text-sm"
            min={options.priceRange.min}
            max={options.priceRange.max}
          />
        </div>
      </FilterSection>
    </div>
  );
}

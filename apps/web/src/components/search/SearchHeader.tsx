'use client';

import { useState, FormEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

const EXAMPLE_QUERIES = [
  'organic uji ceremonial moq <20kg',
  'premium matcha for cafe use',
  'culinary grade ship to singapore',
  'JAS certified quick delivery',
  'barista blend under $60/kg',
];

export function SearchHeader({
  onSearch,
  isLoading = false,
  initialQuery = '',
}: SearchHeaderProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    onSearch(example);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-900">AI-Powered Search</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Describe what you&apos;re looking for in natural language. Include details like
        region, grade, certifications, MOQ requirements, or lead time preferences.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="e.g., organic uji ceremonial moq <20kg ship to singapore"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          className="h-12 px-6 bg-green-600 hover:bg-green-700"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </Button>
      </form>

      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

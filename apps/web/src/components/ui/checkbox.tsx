'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  id,
  name,
  className = '',
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label
      className={`relative inline-flex items-center justify-center w-4 h-4 ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <span
        className={`
          flex items-center justify-center w-4 h-4 rounded border transition-colors
          peer-focus-visible:ring-2 peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2
          ${
            checked
              ? 'bg-green-600 border-green-600 text-white'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {checked && <Check className="w-3 h-3" strokeWidth={3} />}
      </span>
    </label>
  );
}

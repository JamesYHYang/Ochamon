'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  unit = 'kg',
  disabled = false,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = max !== undefined ? Math.min(max, value + step) : value + step;
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || min;
    if (max !== undefined) {
      onChange(Math.min(max, Math.max(min, newValue)));
    } else {
      onChange(Math.max(min, newValue));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
      >
        -
      </Button>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="w-20 h-8 text-center"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        +
      </Button>
    </div>
  );
}

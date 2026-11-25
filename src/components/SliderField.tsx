import { RotateCcw } from 'lucide-react';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  onChange,
}: SliderFieldProps) {
  const isModified = defaultValue !== undefined && Math.abs(value - defaultValue) > 0.001;

  return (
    <div className="slider-field">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <div className="slider-value-group">
          <span className="slider-value">
            {Number.isInteger(step) ? value : value.toFixed(1)}
            {unit}
          </span>
          {isModified && (
            <button
              type="button"
              className="icon-reset-btn"
              title={`重設為 ${defaultValue}${unit}`}
              onClick={() => onChange(defaultValue)}
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        className="studio-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

'use client';
import { CARS, CAR_COLOR, CAR_NAME } from '@/lib/core';

const label = (c) => `${CAR_NAME[c]} ${CAR_COLOR[c]}`;

// Two chips, one per car. The dot is the car's paint; the selected chip is
// also filled and outlined, so the choice reads without colour.
export default function CarPicker({ value, onChange, disabled }) {
  return (
    <div className="cars" role="radiogroup" aria-label="רכב">
      {CARS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={label(c)}
          className="car"
          disabled={disabled}
          onClick={() => onChange(c)}
        >
          <span className={`car__dot car__dot--${c}`} aria-hidden="true" />
          <span>{CAR_NAME[c]}</span>
        </button>
      ))}
    </div>
  );
}

export function CarTag({ car }) {
  if (!car) return null;
  return (
    <span className="car-tag">
      <span className={`car__dot car__dot--${car}`} aria-hidden="true" />
      {CAR_NAME[car]}
    </span>
  );
}

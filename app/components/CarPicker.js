'use client';
import { CARS, CAR_COLOR, CAR_NAME } from '@/lib/core';

const label = (c) => `${CAR_NAME[c]} ${CAR_COLOR[c]}`;

// Two chips, one per car. The dot is the car's paint; the selected chip is
// also filled and outlined, so the choice reads without colour.
export default function CarPicker({ value, onChange, disabled }) {
  // A radio group moves with the arrow keys, and only the chosen car is in
  // the tab order. In RTL, the left arrow goes to the next one.
  function onKeyDown(e) {
    const step = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = CARS[(CARS.indexOf(value) + step + CARS.length) % CARS.length];
    onChange(next);
    e.currentTarget.querySelector(`[data-car="${next}"]`)?.focus();
  }
  return (
    <div className="cars" role="radiogroup" aria-label="רכב" onKeyDown={onKeyDown}>
      {CARS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          tabIndex={value === c ? 0 : -1}
          data-car={c}
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

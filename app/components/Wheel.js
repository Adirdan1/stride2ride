// The on-screen mark: a wheel in three tonal layers — tyre, rim, hub.
// It turns while the car is out and sits still, hollow, while it is home.
export default function Wheel({ moving = false, size = 40 }) {
  return (
    <svg className={`wheel${moving ? ' wheel--moving' : ' wheel--still'}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle className="wheel__tyre" cx="20" cy="20" r="18" />
      <g className="wheel__rim">
        <circle cx="20" cy="20" r="11" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x="18.6" y="9.5" width="2.8" height="10.5" rx="1.4" transform={`rotate(${a} 20 20)`} />
        ))}
      </g>
      <circle className="wheel__hub" cx="20" cy="20" r="4" />
    </svg>
  );
}

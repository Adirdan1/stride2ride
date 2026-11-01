export default function Loading() {
  return (
    <main className="screen" aria-busy="true">
      <div className="skeleton skeleton--bar" />
      <div className="skeleton skeleton--hero" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </main>
  );
}

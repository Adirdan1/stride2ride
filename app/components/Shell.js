import Nav from './Nav';
import AutoRefresh from './AutoRefresh';

export default function Shell({ current, aside, children }) {
  return (
    <>
      <header className="bar">
        <span className="brand" dir="ltr">stride2ride<span className="brand__mark">.</span></span>
        {aside}
      </header>
      <main className="screen">{children}</main>
      <Nav current={current} />
      <AutoRefresh />
    </>
  );
}

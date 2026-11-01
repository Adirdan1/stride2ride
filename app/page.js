import { cookies } from 'next/headers';
import Shell from './components/Shell';
import { WhoAmI, MeChip } from './components/Me';
import Home from './components/Home';
import { isUser, openTripOf, recentTrips, whoIsOut } from '@/lib/core';
import { listTrips } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const me = (await cookies()).get('ride_me')?.value;
  if (!isUser(me)) {
    return (
      <main className="screen">
        <WhoAmI />
      </main>
    );
  }
  const trips = await listTrips();
  return (
    <Shell current="/" aside={<MeChip me={me} />}>
      <Home
        me={me}
        now={Date.now()}
        open={openTripOf(trips, me)}
        out={whoIsOut(trips)}
        recent={recentTrips(trips, me, 5)}
      />
    </Shell>
  );
}

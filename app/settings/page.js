import { cookies } from 'next/headers';
import Shell from '../components/Shell';
import { MeChip, WhoAmI } from '../components/Me';
import Notifications from '../components/Notifications';
import { isUser } from '@/lib/core';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const me = (await cookies()).get('ride_me')?.value;
  if (!isUser(me)) {
    return (
      <main className="screen">
        <WhoAmI />
      </main>
    );
  }
  return (
    <Shell current="/settings" aside={<MeChip me={me} />}>
      <h1 className="title">הגדרות</h1>
      <Notifications me={me} />
    </Shell>
  );
}

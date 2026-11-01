# stride2ride

Shared-car usage log. Adir and Or (one household) and Adi (the other) log every
time they take the Mitsubishi Space Star out, for a few weeks. The point is to see
how often both households would need the car at the same time, how the usage
would split, and what each month without a decision costs.

Three screens:

| | |
| --- | --- |
| `/` בית | יצאתי מהבית / חזרתי הביתה, who is out now, my last five trips (tap to edit or delete), manual add |
| `/usage` שימוש | collision rate, trips that hit a collision, the household split and the per-person breakdown, the weekly timeline, time when nobody was out, the list of collisions |
| `/savings` חיסכון | money lost so far per side and in total, a 5 and 10 year projection, and the settings |

Part of the Stride collection: see `ship-stride-app` in `Adirdan1/stride-skills`.

## Definitions

These are the numbers on screen 2, stated exactly. All of them are in `lib/core.js` and tested in `test/core.test.js`.

- **Household time** is the *union* of its members' trips. When Adir and Or are both out at once, that counts as one car out, not two, and it is never a collision.
- **Collision time** is where the two households' unions overlap.
- **Collision rate** is collision time divided by the time *anyone* had the car out (the union of everything). 100% would mean every hour out was a clash.
- **Trips that hit a collision** counts every trip, on either side, that overlaps a collision window.
- **Usage split** is each household's time over the sum of both; whole percentages that always add up to 100.
- **Per person** is the plain sum of that person's trips, so Adir + Or can add up to more than the household's time.
- **Nobody out** is the range minus the time anyone was out.
- An **open trip** counts up to now. Trips crossing midnight are split across both days on the timeline. Days, weeks (starting Sunday) and months are Asia/Jerusalem.
- **Ranges**: הכל runs from the first logged trip, החודש from the 1st, השבוע from Sunday, all to now.

Screen 3:

- **Lost so far** = monthly saving × 12 / 365 × days, where days run from the tracking start to today, or to the decision date once it is set. On the start date itself it is 0.
- **Projection** = the freed capital invested once plus the monthly saving invested at the end of each month, compounded monthly at annual return / 12.
- Money is integer agorot everywhere; the rate is basis points.

## Data

Schema `ride` in the shared `Stride` Supabase project (`supabase/migrations/0001_ride.sql`).

- `trips (id, rider, started_at, ended_at, created_at, updated_at)`. `ended_at` null means still out. The column is `rider` and not `user`, because `user` is a reserved word in Postgres (`select user` returns the current role). `lib/repo.js` translates it to `user`.
- A partial unique index allows only one open trip per person, so a double tap on יצאתי does nothing.
- `settings`: one row, pinned to `id = 1`.
- Collisions and shares are computed in `lib/core.js` on every read. No extra tables and no views.
- RLS is on with zero policies on both tables. Only the server reaches them, using the service-role key, and only behind the PIN gate. That is how "only the three of us" is enforced.

## Auth

One shared PIN for the three of us (`APP_PIN`). It is checked in edge middleware against a signed one-year cookie. After that, each phone picks who it is once: אדיר, אור or עדי. The choice is stored in a cookie on that device and can be changed from the name chip in the top bar.

## Develop

```bash
npm install
npm test          # vitest over lib/
npm run dev       # with no APP_PIN the gate is open in development
npm run icons     # regenerate public/*.png
```

Environment variables: see `.env.example`.

## Deploy

Vercel project `stride2ride`, linked to this repo, production branch `main`. `vercel.json` pins the framework to Next.js. Set `APP_PIN`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on production and preview.

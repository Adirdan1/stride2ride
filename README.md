# stride2ride

Shared-car usage log. Adir and Or (one household) and Adi (the other) log every
time they take the Mitsubishi Space Star out, for a few weeks. The point is to see
how often both households would need the car at the same time, how the usage
would split, and what each month without a decision costs.

Three screens:

| | |
| --- | --- |
| `/` בית | who is out now; one big button, יצאתי מהבית / חזרתי הביתה (one tap — the car defaults to the household's own); a warning when the other household is out; my last five trips (tap to edit or delete), manual add |
| `/usage` שימוש | the collision rate as the screen's figure; the household split as one bar with each person under it; today; the weekly timeline; every collision in the range |
| `/savings` חיסכון | money lost so far and what each day without a decision adds; each side's part; a 5 and 10 year projection; the settings |
| `/settings` (the bell) | notifications; the home-screen widget |

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

## Notifications (Web Push)

Works on iPhone from iOS 16.4, only when the app is opened from the home screen. No Apple Developer account is needed: it is standard Web Push with VAPID.

- **Subscribe:** `/settings` (the bell in the top bar) → הפעל התראות. The permission prompt is requested inside the tap. The subscription is saved to `ride.push_subscriptions` (RLS on, no policies) through `/api/push`.
- **Service worker:** `public/sw.js`. Every `push` shows a notification, because iOS revokes permission from apps that receive silent pushes. Tapping one opens the app.
- **Triggers:** `ride.notify_trip` runs after insert/update on `ride.trips`.
  - A new **open** trip → 🚗 *rider* יצא עם ה*car*.
  - `ended_at` going from null to a time → 🏠 ה*car* חזרה (*rider*).
  - A trip added by hand that is already finished sends nothing.
  - The trigger POSTs through pg_net to the edge function `ride-notify` with an `x-ride-secret` header. Logging a trip never fails because of a notification.
- **Send:** `supabase/functions/ride-notify` uses `npm:web-push` and sends to every subscription except the rider's own. Subscriptions answering 404/410 are deleted. Wording is in `messages.js`, which the app's tests import.
- **Daily summary at 09:00 Israel time** goes to everyone: 💸 עד היום הפסדנו *total*, with each side's share and the days without a decision. It's the savings page's "lost so far", computed by the edge function (`dailyMessage` in `messages.js`; a test keeps it equal to `lib/core.js` to the agora). It stops once a decision date has passed.
  - pg_cron job `ride-daily-summary` runs at 06:00 and 07:00 UTC. `ride.daily_summary()` sends only from the run that lands on 09:00 in Jerusalem, so it is right in summer and winter.
  - `select ride.daily_summary(true)` sends one now.
- **Secrets live in Supabase Vault:**
  - `ride_notify_secret` is generated in Postgres.
  - `ride_vapid_public` / `ride_vapid_private` were generated once by the function's `{"kind":"init"}`.
  - If `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are both set as edge function secrets, the function uses them instead. Changing keys invalidates every phone's subscription, so everyone must tap הפעל התראות again.

## Widget (Scriptable)

`scripts/widget.js` is the whole widget, one file. Small: who has the car (or
"הרכב בבית"), since when, and the money lost so far. Medium adds this month's
split as a bar and the collision rate. A collision in progress is said in words
and in red. Colours are `Color.dynamic` pairs, so it follows the phone's theme.

- **Install:** the bell → *העתקת הסקריפט של …* copies the script with a key of
  your own on line 2. Scriptable → **+** → paste → name it `stride2ride`. Long-press
  the home screen → **+** → Scriptable → Small or Medium → Edit Widget → Script:
  `stride2ride`. The phone's copy does not update with the repo; a changed widget
  means copying it again.
- **Keys:** `ride.widget_keys` (migration 0006) holds one row per copied script,
  naming the person, storing only the SHA-256. The same screen lists your keys and
  revokes them. `GET /api/widget` takes the key as `x-api-key`, is exempt from the
  PIN cookie, and returns `{ view }` shaped by `glance()` (core) and `widgetView()`
  (format) — the widget only draws.
- **Preview:** `npm run widget-preview -- <payload.json|offline|nokey|badkey> <small|medium> <light|dark>`
  runs the real script against stubs of the Scriptable API and prints HTML.

## Screenshots

`npm run build && npm run shots` starts `scripts/fake-postgrest.mjs` seeded with the
first real days of the log plus Adi out now, runs `next start` against it, and
captures every screen in light, dark, greyscale and an iPhone 13 into
`probe-out/shots/` (git-ignored), reporting horizontal overflow and any tap target
under 44px. `test/palette.test.js` asserts contrast from the real `globals.css` in
both themes.

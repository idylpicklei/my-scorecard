This is a Next.js app for tracking golf scores with friends.

## Local Authentication

The app now includes a local auth system with:

- A login page at `/login`
- Auth API endpoints at `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`
- An on-disk local auth store at `data/auth-db.json`
- Cookie-based sessions (`myscorecard_session`)

On first run, a default user is seeded into the local auth store.

Default credentials:

- Email: `friends@myscorecard.local`
- Password: `golfweekend`

Default admin credentials:

- Email: `admin@myscorecard.local`
- Password: `adminweekend`

You can override these with environment variables in `.env.local`:

```bash
LOCAL_AUTH_EMAIL=friends@myscorecard.local
LOCAL_AUTH_NAME=Weekend Golfer
LOCAL_AUTH_PASSWORD=golfweekend
LOCAL_ADMIN_EMAIL=admin@myscorecard.local
LOCAL_ADMIN_NAME=Trip Admin
LOCAL_ADMIN_PASSWORD=adminweekend
```

Admin users can:

- Create upcoming trip schedule items
- Set team player assignments (Team Idaho / Team Oregon or custom names)

All authenticated users can view the upcoming schedule and current teams.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

If you are not authenticated, you will be redirected to `/login`.

After login, the home page is session-protected.

## Notes

- This local auth store is intended for development and early prototyping.
- For production, move to a managed auth solution and a proper shared database.

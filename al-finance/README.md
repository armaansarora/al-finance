# A&L Finance Tracker

Your personal household finance app. Both of you can access it from any phone or computer — changes sync instantly.

---

## 🚀 How to Deploy (Step by Step)

You need 3 free accounts. Total setup time: ~20 minutes.

### Step 1: Get a Free Database

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **"New Project"** → name it `al-finance` → click **Create**
3. You'll see a connection string that looks like:
   ```
   postgresql://username:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copy this string** — you'll need it in Step 3

### Step 2: Upload Code to GitHub

1. Go to [github.com](https://github.com) and sign up (free) or log in
2. Click the **+** button → **New repository**
3. Name it `al-finance`, keep it **Private**, click **Create**
4. Upload all the files from this project folder to the repository:
   - You can drag and drop files on the GitHub page
   - Or use Git on your computer if you know how
   - Make sure the folder structure stays the same!

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account (free)
2. Click **"Add New..."** → **"Project"**
3. Find your `al-finance` repo and click **Import**
4. Before deploying, click **"Environment Variables"** and add these 3:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | The connection string from Step 1 |
   | `HOUSEHOLD_PASSWORD` | Pick any password you and Layla will share (e.g. `ourfinance2026`) |
   | `SESSION_SECRET` | Type any random 32+ characters (mash your keyboard) |

5. Click **Deploy** — wait 1-2 minutes
6. Vercel gives you a URL like `al-finance-xyz.vercel.app` — **that's your app!**

### Step 4: Set Up the Database Tables

After deploying, you need to create the database tables:

1. In your Vercel project, go to **Settings** → **Functions** (or just redeploy)
2. The `postinstall` and `build` scripts will run Prisma automatically
3. If tables aren't created, open a terminal and run:
   ```bash
   npx prisma db push
   ```
   Or in the Vercel dashboard, go to your project's **Deployments** → click the latest → **Redeploy**

### Step 5: Add Demo Data (Optional)

To pre-fill with the demo data (same data you saw in the prototype):
```bash
npm run seed
```

Or just start fresh — the app creates default settings automatically.

---

## 📱 Using the App

1. Open your Vercel URL on any device (phone, laptop, tablet)
2. Enter the household password you set
3. Both Armaan and Layla use the SAME password
4. You're in! The app works like the prototype you already used

**Key feature:** When one person makes a change, the other person sees it automatically when they open the app (it refreshes on focus).

---

## 📌 Add to Home Screen (Phone)

### iPhone:
1. Open the URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. It now looks and feels like a real app!

### Android:
1. Open the URL in Chrome
2. Tap the **three dots** menu
3. Tap **"Add to Home Screen"**

---

## 🔧 How It Works

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (via Neon, free)
- **Auth:** Simple household password with encrypted session cookies (90-day sessions)
- **Hosting:** Vercel (free)

No monthly costs. Everything is on free tiers.

---

## 📁 Project Structure

```
al-finance/
├── prisma/
│   ├── schema.prisma    ← Database schema
│   └── seed.ts          ← Demo data
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts   ← Login/logout
│   │   │   └── data/route.ts   ← All data operations
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx     ← Entry point
│   ├── components/
│   │   ├── FinanceApp.tsx  ← Main app (all the UI)
│   │   └── LoginPage.tsx   ← Password screen
│   └── lib/
│       ├── db.ts        ← Database connection
│       └── session.ts   ← Auth/cookies
├── package.json
├── tailwind.config.js
└── README.md            ← You're reading this
```

---

## 🛠 Local Development

If you want to run it on your computer:

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your database URL, password, and session secret

# 3. Create database tables
npx prisma db push

# 4. (Optional) Add demo data
npm run seed

# 5. Start the app
npm run dev

# Open http://localhost:3000
```

---

## ❓ Troubleshooting

**"Wrong password" but I'm entering the right one**
→ Check that `HOUSEHOLD_PASSWORD` in Vercel matches exactly (case-sensitive)

**App shows blank / errors**
→ Check that `DATABASE_URL` is correct. Go to Neon dashboard and copy it again.

**Changes not showing for the other person**
→ The app refreshes when you switch back to the tab. Pull down to refresh on mobile, or reload the page.

**Want to change the password?**
→ Update `HOUSEHOLD_PASSWORD` in Vercel → Settings → Environment Variables → Redeploy

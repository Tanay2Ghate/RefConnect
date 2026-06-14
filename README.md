# ⚡ RefConnect — Job Referral & Networking Platform

A full-stack web application where students, alumni, employees, and recruiters connect for job referrals. Built with **Node.js**, **Express**, **MySQL**, and vanilla **HTML/CSS/JS**.

---

## 🌐 Deploy for FREE (15 minutes)

> **Railway** gives $5/month free credit — a small app like this uses ~$1–2/month, so it's **effectively free forever**. No credit card needed to start.

---

### Step 1 — Push your code to GitHub

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `reconnect` → set to **Private** → click **Create**
3. Open **PowerShell** in your project folder (`C:\Users\ghate\OneDrive\Desktop\REconnect`) and run:

```powershell
git init
git add .
git commit -m "Initial commit - RefConnect"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reconnect.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username.

---

### Step 2 — Create a Railway account & project

1. Go to **[railway.app](https://railway.app)** → click **Login** → **Login with GitHub**
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Select your `reconnect` repository → click **Deploy Now**

Railway will start building your app automatically.

---

### Step 3 — Add a free MySQL database

1. In your Railway project dashboard, click **+ New** (top right)
2. Select **Database → MySQL**
3. Wait ~30 seconds for the database to spin up
4. Click on the **MySQL** service → go to the **Variables** tab
5. You'll see variables like `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

---

### Step 4 — Connect your app to the database

1. Click on your **web service** (the refconnect app)
2. Go to **Variables** tab
3. Click **+ New Variable** and add these one by one:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | `any-long-random-string-like-refconnect-xyz-2024-abc` |
| `NODE_ENV` | `production` |

> The `MYSQL*` variables are automatically shared between services on Railway — you don't need to copy them manually!

4. Click **Deploy** (or it may auto-redeploy)

---

### Step 5 — Set up the database schema

1. In Railway, click on your **MySQL** service
2. Click the **Query** tab (or use **Connect** → open a MySQL GUI)
3. Paste the entire contents of `database/schema.sql` and click **Run**
4. *(Optional)* Also run `database/seed.sql` to add sample data

---

### Step 6 — Get your live URL 🎉

1. Click on your **web service** in Railway
2. Go to **Settings** → **Networking** → click **Generate Domain**
3. You'll get a URL like: `https://reconnect-production.up.railway.app`
4. **Share this link with anyone** — they can register and use the app!

---

## 💻 Run Locally (Development)

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create your local .env file
copy .env.example .env
# Edit .env with your local MySQL credentials

# 3. Set up the database
# Open MySQL Workbench or run:
mysql -u root -p < database/schema.sql
mysql -u root -p refconnect < database/seed.sql

# 4. Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
REconnect/
├── backend/
│   ├── config/
│   │   └── db.js              # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            # Session auth middleware
│   ├── routes/
│   │   ├── auth.js            # Login, register, logout
│   │   ├── profile.js         # User profiles & skills
│   │   ├── jobs.js            # Job CRUD & matching
│   │   ├── connections.js     # Network connections
│   │   ├── referrals.js       # Referral requests
│   │   └── applications.js    # Job applications
│   ├── server.js              # Express app entry point
│   └── package.json
├── frontend/
│   ├── css/style.css          # Design system
│   ├── js/
│   │   ├── api.js             # API wrapper & auth helpers
│   │   ├── dashboard.js
│   │   ├── profile.js
│   │   ├── jobs.js
│   │   ├── connections.js
│   │   ├── referrals.js
│   │   └── applications.js
│   ├── index.html             # Landing page
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── jobs.html
│   ├── connections.html
│   ├── referrals.html
│   └── applications.html
├── database/
│   ├── schema.sql             # Table definitions
│   └── seed.sql               # Sample data
├── .gitignore
├── .env.example               # Environment variable template
└── railway.toml               # Railway deployment config
```

---

## 👥 User Roles

| Role | Can Do |
|---|---|
| **Student** | Browse jobs, apply, request referrals, connect with alumni |
| **Alumni** | Browse jobs, provide referrals, connect with students |
| **Employee** | Post/browse jobs, provide referrals, connect with students |
| **Recruiter** | Post jobs, manage applications, update application status |

---

## 🔒 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `SESSION_SECRET` | Secret key for signing session cookies | ✅ Yes |
| `NODE_ENV` | `production` or `development` | ✅ Yes |
| `PORT` | Server port (Railway sets this automatically) | Auto |
| `DB_HOST` / `MYSQLHOST` | MySQL host | ✅ Yes |
| `DB_PORT` / `MYSQLPORT` | MySQL port (default 3306) | Optional |
| `DB_USER` / `MYSQLUSER` | MySQL username | ✅ Yes |
| `DB_PASSWORD` / `MYSQLPASSWORD` | MySQL password | ✅ Yes |
| `DB_NAME` / `MYSQLDATABASE` | Database name | ✅ Yes |

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8 with mysql2
- **Auth**: express-session + bcryptjs
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Hosting**: Railway (free tier)

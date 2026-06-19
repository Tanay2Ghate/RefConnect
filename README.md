 RefConnect — Job Referral & Networking Platform

A full-stack web application where students, alumni, employees, and recruiters connect for job referrals. Built with **Node.js**, **Express**, **MySQL**, and vanilla **HTML/CSS/JS**.

---

### Step 1 — Create a Railway account & project

1. Go to **[railway.app](https://railway.app)** → click **Login** → **Login with GitHub**
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Select your `reconnect` repository → click **Deploy Now**

Railway will start building your app automatically.

---

### Step 2 — Add a free MySQL database

1. In your Railway project dashboard, click **+ New** (top right)
2. Select **Database → MySQL**
3. Wait ~30 seconds for the database to spin up
4. Click on the **MySQL** service → go to the **Variables** tab
5. You'll see variables like `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

---

### Step 3 — Connect your app to the database

| Variable | Value |
|---|---|
| `SESSION_SECRET` | `any-long-random-string-like-refconnect-xyz-2024-abc` |
| `NODE_ENV` | `production` |
---

### Step 4 — Set up the database schema

1. In Railway, click on your **MySQL** service
2. Click the **Query** tab (or use **Connect** → open a MySQL GUI)
3. Paste the entire contents of `database/schema.sql` and click **Run**
4. *(Optional)* Also run `database/seed.sql` to add sample data

---

##  Run Locally (Development)

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

##  Project Structure

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

##  User Roles

| Role | Can Do |
|---|---|
| **Student** | Browse jobs, apply, request referrals, connect with alumni |
| **Alumni** | Browse jobs, provide referrals, connect with students |
| **Employee** | Post/browse jobs, provide referrals, connect with students |
| **Recruiter** | Post jobs, manage applications, update application status |

---

##  Environment Variables

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

##  Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8 with mysql2
- **Auth**: express-session + bcryptjs
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Hosting**: Railway (free tier)

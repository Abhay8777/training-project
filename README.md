# EduPulse — Student Attendance Management System

A full-stack, role-based Student Attendance Management System with separate **Faculty** and **Student** portals, built with React, Vite, Tailwind CSS, Recharts, Node.js, Express, PostgreSQL, and Prisma ORM.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router DOM, Axios, Recharts, Lucide React, jsPDF, SheetJS (`xlsx`)
- **Backend:** Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, Zod validation, Helmet, CORS, Express Rate Limit
- **Database:** MongoDB with Prisma ORM (12 normalized collections + password reset tokens)

## Quick Start

### 1. Configure MongoDB & Environment Variables

Ensure MongoDB is running locally on port `27017` (or provide a MongoDB Atlas connection string), then configure `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mongodb://127.0.0.1:27017/attendance_db"
JWT_SECRET="replace-with-a-strong-random-secret"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
LATE_WEIGHT="0.5"
LOW_ATTENDANCE_THRESHOLD="75"
```

### 2. Backend Setup, Migration & Seed

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Demo Login Credentials (Testing Only)

> **Security Notice:** Change default passwords immediately before any real deployment.

- **Faculty Portal** (`/faculty/login`)
  - **Faculty ID / Email:** `FAC-101` or `arjun.mehta@campus.edu`
  - **Password:** `Faculty@123`
- **Student Portal** (`/student/login`)
  - **Student ID / Email:** `STU-2026-001` or `aarav.sharma@student.edu`
  - **Password:** `Student@123`

## Attendance Calculation Policy

```text
Attendance Percentage = ((Present + Late * LATE_WEIGHT) / Total Conducted Classes) × 100
```

- Zero conducted classes safely return `0%` without division errors.
- `LATE_WEIGHT` defaults to `0.5` (each Late counts as 0.5 of a Present class) and is configurable via `backend/.env`.

## Running Backend Tests

```bash
cd backend
npm test
```

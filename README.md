# ClassFlow

ClassFlow is a free, deployable student-first class management app for teachers. Add a student, select that student as the main tab, then manage their class sessions, homework, and lesson plans.

## Features

- Student tabs as the primary navigation
- Per-student session planning with current, upcoming, and completed states
- Per-student homework tracking with open and done states
- Per-student lesson plans with objectives and activities
- JSON import and export for backups
- Browser-based storage with JSON import and export

## Run locally

Open `index.html` in a browser. No install step is required.

## Deploy for free

This is a static app, so it can be deployed on:

- GitHub Pages
- Netlify
- Vercel

The app stores data in the browser's local storage. Use Export regularly to keep a backup of class data.

## Android APK

The repository includes a minimal Android WebView wrapper that packages the static app into an installable APK. GitHub Actions builds a debug APK from `.github/workflows/build-android.yml`.

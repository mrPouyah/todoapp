# ClassFlow

ClassFlow is a free, deployable student-first class management app for teachers. Add a student, select that student as the main tab, then manage their class sessions, homework, and lesson plans.

## Features

- Student tabs as the primary navigation
- Editable per-student session count
- Per-student tabs for overview, sessions, syllabus, and homework
- Per-student session planning with current, upcoming, and completed states
- Current and next session syllabus and lesson plan notes
- Per-student homework tracking with open and done states
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

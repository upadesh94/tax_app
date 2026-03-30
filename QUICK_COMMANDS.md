# Quick Commands Reference

## Git Commands (Copy & Paste)

### First Time Setup

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Estate Tax Collection System"

# Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Update Repository

```bash
# Add changes
git add .

# Commit with message
git commit -m "Update: describe your changes"

# Push
git push
```

## App Commands

### Install Dependencies
```bash
cd app
npm install
```

### Start Development Server
```bash
cd app
npx expo start
```

### Clear Cache
```bash
cd app
npx expo start --clear
```

### Run on Specific Platform
```bash
# Android
npx expo start --android

# iOS
npx expo start --ios

# Web
npx expo start --web
```

## Check Status

```bash
# Git status
git status

# Git log
git log --oneline

# Check remote
git remote -v
```

## Troubleshooting

### Reset to last commit
```bash
git reset --hard HEAD
```

### Remove file from git (keep local)
```bash
git rm --cached filename
```

### Update .gitignore
```bash
git rm -r --cached .
git add .
git commit -m "Update .gitignore"
```

---

**Quick Tip**: Copy these commands to a text file for easy access!

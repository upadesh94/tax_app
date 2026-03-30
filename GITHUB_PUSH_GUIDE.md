# GitHub Push Guide

## Prerequisites

1. Install Git: https://git-scm.com/download/win
2. Create a GitHub account: https://github.com
3. Create a new repository on GitHub

## Steps to Push

### 1. Initialize Git (if not already done)

Open Command Prompt or PowerShell in the project root:

```bash
git init
```

### 2. Add all files

```bash
git add .
```

### 3. Commit changes

```bash
git commit -m "Initial commit: Estate Tax Collection System"
```

### 4. Add remote repository

Replace `YOUR_USERNAME` and `REPO_NAME` with your GitHub username and repository name:

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

### 5. Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## Alternative: Using GitHub Desktop

1. Download GitHub Desktop: https://desktop.github.com/
2. Open GitHub Desktop
3. Click "Add" → "Add Existing Repository"
4. Select your project folder
5. Click "Publish repository"
6. Choose repository name and visibility
7. Click "Publish repository"

## What's Included

✅ All source code
✅ Configuration files
✅ Database schema
✅ README with setup instructions
✅ .gitignore (excludes node_modules, .env, etc.)

## What's Excluded (via .gitignore)

❌ node_modules/
❌ .expo/
❌ .env files
❌ Build folders
❌ IDE settings
❌ OS files (.DS_Store, Thumbs.db)
❌ Sensitive files (*.key, *.pem)

## Verify Push

After pushing, visit:
```
https://github.com/YOUR_USERNAME/REPO_NAME
```

You should see all your files except those in .gitignore!

## Update Repository Later

```bash
git add .
git commit -m "Your commit message"
git push
```

## Common Issues

### Git not recognized
- Install Git from https://git-scm.com/download/win
- Restart your terminal after installation

### Permission denied
- Set up SSH keys or use HTTPS with personal access token
- Guide: https://docs.github.com/en/authentication

### Large files
- node_modules is already in .gitignore
- Don't commit large binary files

## Need Help?

- GitHub Docs: https://docs.github.com
- Git Basics: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics

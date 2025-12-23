# Release & Package Manager Setup Guide

This guide explains how to configure automated publishing to npm and Homebrew.

## Overview

cargo-dist is configured to build and distribute `emosh` across multiple platforms:
- ✅ **Shell/PowerShell installers** - Already working (no setup needed)
- ⚙️ **npm** - Requires setup (instructions below)
- ⚙️ **Homebrew** - Requires setup (instructions below)

---

## 1. npm Publishing Setup

### Step 1: Create npm Account
1. Go to [npmjs.com](https://www.npmjs.com)
2. Sign up for a free account
3. Verify your email

### Step 2: Generate npm Access Token
1. Log in to [npmjs.com](https://www.npmjs.com)
2. Click your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** type (for CI/CD)
5. Copy the token (starts with `npm_...`)

### Step 3: Add Token to GitHub
1. Go to your GitHub repo settings
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

### Step 4: Update package.json
Replace `yourusername` with your actual GitHub username:
```json
{
  "name": "emosh",
  "homepage": "https://github.com/YOURUSERNAME/emosh",
  "repository": {
    "url": "git+https://github.com/YOURUSERNAME/emosh.git"
  }
}
```

### Testing npm Publish
After pushing a version tag, the workflow will:
- Build the npm package
- Publish to npm registry as `emosh`
- Users can install with: `npm install -g emosh`

---

## 2. Homebrew Publishing Setup

### Step 1: Create Homebrew Tap Repository
A "tap" is a GitHub repository where Homebrew formulas are stored.

1. Go to GitHub and create a **new repository**
2. Name it: `homebrew-emosh` (must start with `homebrew-`)
3. Make it **public**
4. Initialize with a README
5. Clone it locally:
```bash
git clone https://github.com/YOURUSERNAME/homebrew-emosh.git
```

### Step 2: Configure Tap in Cargo.toml
Edit `Cargo.toml` and uncomment/update the tap line:
```toml
[package.metadata.dist]
tap = "YOURUSERNAME/homebrew-emosh"
```

### Step 3: Create GitHub Personal Access Token (Optional but Recommended)
This allows cargo-dist to automatically push formula updates.

1. Go to GitHub Settings → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name: "cargo-dist homebrew publishing"
4. Set expiration (1 year recommended)
5. Select scopes:
   - ✅ `repo` (all)
   - ✅ `workflow`
6. Click **Generate token**
7. Copy the token (starts with `ghp_...`)

### Step 4: Add Token to GitHub Secrets (If using auto-push)
1. Go to your `emosh` repo settings (not the tap repo)
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `HOMEBREW_TAP_TOKEN` or `GH_RELEASES_TOKEN`
5. Value: Paste your GitHub PAT
6. Click **Add secret**

### Step 5: Update URLs
Replace `yourusername` with your actual GitHub username in:
- `Cargo.toml`: repository, homepage
- `package.json`: homepage, repository.url

### Testing Homebrew Publish
After pushing a version tag, the workflow will:
- Build the Homebrew formula
- Push it to your `homebrew-emosh` tap
- Users can install with:
```bash
brew tap YOURUSERNAME/emosh
brew install emosh
```

Or in one command:
```bash
brew install YOURUSERNAME/emosh/emosh
```

---

## 3. Manual Workflow (Without Auto-Publish)

If you don't want to set up the tokens, you can manually publish:

### npm (Manual)
```bash
# After release is created
npm publish
```

### Homebrew (Manual)
```bash
# cargo-dist generates the formula in the release artifacts
# Download the .rb file from GitHub release
# Commit it to your homebrew-emosh repo:
cp emosh.rb ~/homebrew-emosh/Formula/
cd ~/homebrew-emosh
git add Formula/emosh.rb
git commit -m "Update emosh to vX.Y.Z"
git push
```

---

## 4. Creating a Release

Once everything is configured:

```bash
# 1. Bump version in Cargo.toml
sed -i '' 's/version = "0.1.0"/version = "0.2.0"/' Cargo.toml

# 2. Update package.json version to match
sed -i '' 's/"version": "0.1.0"/"version": "0.2.0"/' package.json

# 3. Commit the version bump
git add Cargo.toml package.json Cargo.lock
git commit -m "chore: bump version to 0.2.0"

# 4. Create and push tag
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

The GitHub Actions workflow will automatically:
1. Build binaries for all platforms (Linux, macOS, Windows)
2. Create installers (shell, PowerShell, npm, Homebrew)
3. Publish to npm (if configured)
4. Update Homebrew tap (if configured)
5. Create a GitHub Release with all artifacts

---

## 5. Verification

After release completes, verify:

✅ **GitHub Release**: https://github.com/YOURUSERNAME/emosh/releases
✅ **npm Package**: https://www.npmjs.com/package/emosh
✅ **Homebrew Tap**: https://github.com/YOURUSERNAME/homebrew-emosh

---

## Quick Reference

| Installer | User Command | Requires Account? |
|-----------|-------------|-------------------|
| Shell | `curl ... \| sh` | ❌ No |
| PowerShell | `irm ... \| iex` | ❌ No |
| npm | `npm install -g emosh` | ✅ Yes (npm account) |
| Homebrew | `brew install YOURUSERNAME/emosh/emosh` | ✅ Yes (GitHub repo) |
| Direct Download | Download from GitHub Releases | ❌ No |

---

## Troubleshooting

**npm publish fails:**
- Check `NPM_TOKEN` secret is set correctly
- Verify token has "Automation" permissions
- Ensure package name isn't already taken

**Homebrew publish fails:**
- Check `tap` is configured in `Cargo.toml`
- Verify tap repository exists and is public
- Ensure `HOMEBREW_TAP_TOKEN` has `repo` scope

**Version mismatch:**
- Ensure `Cargo.toml` and `package.json` versions match
- Run `cargo generate-lockfile` after version changes

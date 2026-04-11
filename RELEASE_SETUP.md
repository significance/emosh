# Release Setup Guide

## Current Configuration

cargo-dist handles automated releases with cross-platform builds:

- **Shell installer** (`curl | sh`) - works out of the box
- **PowerShell installer** (`irm | iex`) - works out of the box
- **GitHub Releases** - binaries for Linux (x86_64, aarch64), macOS (Intel, Apple Silicon), Windows

## Creating a Release

```bash
# 1. Bump version in Cargo.toml
# 2. Commit
git add Cargo.toml Cargo.lock
git commit -m "chore: bump version to 0.2.0"

# 3. Tag and push
git tag v0.2.0
git push origin master
git push origin v0.2.0
```

The Release workflow will automatically build all platforms and create a GitHub Release.

## Adding npm Publishing (Optional)

1. Create an npm account at [npmjs.com](https://www.npmjs.com) with 2FA enabled
2. Generate a **Granular Access Token** (Settings > Access Tokens)
3. Add it as `NPM_TOKEN` secret in GitHub repo settings
4. Create a `package.json` in the repo root
5. In `dist-workspace.toml`, add `"npm"` to `installers` and `publish-jobs`
6. Re-run `cargo dist generate` to update the release workflow

## Adding Homebrew Publishing (Optional)

1. Create a public repo: `significance/homebrew-emosh`
2. Create a GitHub PAT with `repo` + `workflow` scopes
3. Add it as `HOMEBREW_TAP_TOKEN` secret in GitHub repo settings
4. In `Cargo.toml`, uncomment the `tap` line under `[package.metadata.dist]`
5. In `dist-workspace.toml`, add `"homebrew"` to `installers` and `publish-jobs`
6. Re-run `cargo dist generate` to update the release workflow

Users would then install with:
```bash
brew install significance/emosh/emosh
```

## Troubleshooting

**Release workflow fails:**
- Check GitHub Actions logs
- Ensure `Cargo.toml` version matches the tag
- Verify tests pass: `cargo test`
- Verify clippy passes: `cargo clippy -- -D warnings`

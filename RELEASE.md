# Release Process

This document describes the automated release process for emosh.

## Overview

Releases are fully automated via GitHub Actions. When you push a version tag, the system automatically:

1. Builds binaries for all supported platforms
2. Creates a GitHub Release with downloadable archives
3. Publishes to crates.io (Rust package registry)
4. (Optional) Updates Homebrew tap

## Supported Platforms

The release workflow builds for:

- **Linux**
  - x86_64 (Intel/AMD 64-bit)
  - aarch64 (ARM64)
- **macOS**
  - x86_64 (Intel)
  - aarch64 (Apple Silicon)
- **Windows**
  - x86_64

## Creating a Release

### 1. Update Version

Update the version in `Cargo.toml`:

```toml
[package]
version = "0.2.0"  # New version
```

### 2. Update Changelog

Create/update `CHANGELOG.md` with release notes:

```markdown
## [0.2.0] - 2025-01-15

### Added
- Signal Desktop keyword alignment
- CLI auto-copy to clipboard

### Changed
- Exact keyword matches now score 10000 (was 100)

### Fixed
- Keyword conflict resolution
```

### 3. Commit Changes

```bash
git add Cargo.toml CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin master
```

### 4. Create and Push Tag

```bash
# Create annotated tag
git tag -a v0.2.0 -m "Release v0.2.0"

# Push tag to trigger release workflow
git push origin v0.2.0
```

### 5. Monitor Release

1. Go to GitHub Actions tab
2. Watch the "Release" workflow
3. Builds take ~10-15 minutes
4. Release appears in GitHub Releases when complete

## Post-Release

After the automated release completes:

1. **Verify GitHub Release**: Check that all platform binaries are attached
2. **Verify crates.io**: Visit https://crates.io/crates/emosh to confirm publication
3. **Test Installation**: Try installing from various sources:
   ```bash
   # From crates.io
   cargo install emosh
   
   # From GitHub release
   curl -L https://github.com/yourusername/emosh/releases/download/v0.2.0/emosh-linux-x86_64.tar.gz | tar xz
   ```

## Required GitHub Secrets

For the full release process to work, configure these secrets in your repository:

### CARGO_REGISTRY_TOKEN (Required for crates.io)

1. Visit https://crates.io/me
2. Click "New Token"
3. Name it "GitHub Actions"
4. Copy the token
5. In GitHub: Settings → Secrets and variables → Actions → New repository secret
6. Name: `CARGO_REGISTRY_TOKEN`
7. Value: (paste token)

### COMMITTER_TOKEN (Optional - for Homebrew)

Only needed if you want automatic Homebrew tap updates:

1. Create a Personal Access Token with `repo` scope
2. Add it as `COMMITTER_TOKEN` secret

## Package Managers

### crates.io (Automatic)

Published automatically on every release tag.

Users can install with:
```bash
cargo install emosh
```

### Homebrew (Manual Setup Required)

To enable automatic Homebrew updates:

1. Create a tap repository: `yourusername/homebrew-tap`
2. Add initial formula to the tap
3. Update `.github/workflows/release.yml`:
   - Change `if: github.repository == 'yourusername/emosh'` to your repo
   - Change `homebrew-tap: yourusername/homebrew-tap` to your tap
4. Add `COMMITTER_TOKEN` secret

### Other Package Managers

To add support for other package managers (apt, rpm, AUR, etc.), consider:

- **cargo-deb**: For Debian/Ubuntu packages
- **cargo-generate-rpm**: For Fedora/RHEL packages
- **cargo-aur**: For Arch Linux AUR
- **chocolatey/scoop**: For Windows package managers

## Troubleshooting

### Release workflow fails

- Check GitHub Actions logs for specific errors
- Ensure Cargo.toml version matches the tag version
- Verify all tests pass: `cargo test`
- Verify clippy passes: `cargo clippy -- -D warnings`

### crates.io publish fails

- Check if version already exists on crates.io
- Verify `CARGO_REGISTRY_TOKEN` is valid
- Ensure `Cargo.toml` has required metadata

### Binaries don't work

- Test locally before tagging: `cargo build --release --target <target>`
- Check that dependencies are statically linked
- Verify target architecture matches the build

## Manual Release (Emergency)

If automated release fails, you can manually release:

```bash
# Build for current platform
cargo build --release

# Publish to crates.io
cargo publish

# Create GitHub release manually
gh release create v0.2.0 --title "Release v0.2.0" --notes "Release notes here"
gh release upload v0.2.0 target/release/emosh
```

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Examples:
- `v0.1.0` → `v0.1.1`: Bug fix
- `v0.1.1` → `v0.2.0`: New feature
- `v0.2.0` → `v1.0.0`: Breaking change or production-ready

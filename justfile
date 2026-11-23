# emosh task runner. `just` lists everything; `just check` runs what CI runs.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List the recipes
default:
    @just --list --unsorted

# Run the CLI, e.g. `just run unicorn` or `just run -k shrug`
run *args:
    cargo run --quiet -- {{args}}

# Build the release binary
build:
    cargo build --release

# Install emosh from this checkout into ~/.cargo/bin
install:
    cargo install --path . --locked

# Tests
test:
    cargo test --all-features

# Clippy with warnings as errors, as in CI
lint:
    cargo clippy --all-targets --all-features -- -D warnings

# Format the code
fmt:
    cargo fmt

# Check formatting without changing anything
fmt-check:
    cargo fmt --check

# Coverage summary (needs cargo-llvm-cov)
cov:
    cargo llvm-cov --summary-only

# Benchmarks
bench:
    cargo bench

# Build the WebAssembly package into pkg/ (needs wasm-pack and the wasm32 target)
wasm:
    wasm-pack build --release --target web -- --no-default-features --features wasm

# Everything CI checks
check: fmt-check lint test

# Remove build output
clean:
    cargo clean
    rm -rf pkg

# Tag the current Cargo.toml version locally (push the tag yourself to release)
tag:
    #!/usr/bin/env bash
    set -euo pipefail
    version=$(grep -m1 '^version' Cargo.toml | sed 's/.*"\(.*\)".*/\1/')
    git tag -a "v$version" -m "emosh v$version"
    echo "Tagged v$version. Release with: git push origin v$version"

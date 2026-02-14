# Tools (`tools/`)

This directory contains all the meta-development tools and utilities that power the Abe-Stack development experience.

## Directory Structure

- `scripts/` - Development scripts (audit, dev, export, git hooks, path utils, test runner)
- `sync/` - Sync scripts for file headers, CSS theme generation, and TS references
- `release/` - Release automation (planned)

## Purpose

The `tools/` directory separates development tooling from application code, emphasizing that this is a professional development platform with advanced tooling capabilities. This enables developers to extend and customize the development workflow.

## Usage

These tools are integrated into the development workflow via package.json scripts and are designed to enhance productivity and maintain code quality across the monorepo.

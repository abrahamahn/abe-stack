# Infrastructure (`infra/`)

This directory contains all infrastructure-as-code configurations for deploying and orchestrating the Abe-Stack applications.

## Directory Structure

- `docker/` - Dockerfiles, docker-compose configurations, and container build assets
- `caddy/` - Caddy web server configurations for reverse proxy and SSL termination
- `nginx/` - Nginx configurations as an alternative to Caddy

## Purpose

The `infra/` directory separates deployment concerns from application code, making it clear that this is a production-ready stack with professional infrastructure configurations. This enables easy deployment to various platforms (self-hosted, cloud providers, etc.).

## Usage

Deployment configurations are designed to work with the applications in the `apps/` directory and can be customized for your specific hosting environment.

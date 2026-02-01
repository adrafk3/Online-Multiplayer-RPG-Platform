# Deployment Guide

This document describes how to deploy the **client** (Angular SPA) and **server** (NestJS API) for the Online Multiplayer RPG Platform. The client can be served as static files (e.g. GitLab Pages); the server runs on Node.js, typically on a VPS or cloud instance (e.g. AWS EC2).

---

## Table of Contents

- [Overview](#overview)
- [Client Deployment (Static / GitLab Pages)](#client-deployment-static--gitlab-pages)
- [Server Deployment (Node.js / AWS EC2)](#server-deployment-nodejs--aws-ec2)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

| Component | Typical host            | CI trigger (GitLab)                           |
| --------- | ----------------------- | --------------------------------------------- |
| Client    | GitLab Pages (static)   | Manual job `pages` when tag contains `deploy` |
| Server    | AWS EC2 (Node.js + PM2) | Auto on push to `dev` or `main`               |

- **Client:** Built with Angular; output is static HTML/CSS/JS. Served over HTTP/HTTPS. Must be configured with the correct API and WebSocket base URL for the deployed server.
- **Server:** NestJS app; requires Node.js, MongoDB connection string, and optional Firebase Admin config. The CI pipeline can deploy to an EC2 instance via SSH and PM2.

Ensure the client’s production environment points to the **deployed server URL** (not `localhost`).

---

## Client Deployment (Static / GitLab Pages)

### Prerequisites

- GitLab CI/CD enabled for the project.
- A **tag** whose name contains `deploy` (e.g. `deploy_v1.0`) to trigger the deploy stage.

### CI/CD Variables (GitLab)

In **Settings → CI/CD → Variables** add:

| Variable    | Description                                       | Example / notes       |
| ----------- | ------------------------------------------------- | --------------------- |
| `BASE_HREF` | Base path for the app (for GitLab Pages subpaths) | e.g. `/project-name/` |

Adjust `BASE_HREF` to match your GitLab Pages URL structure. Keep the variable unprotected so the deploy job can use it.

### Deploy Steps (GitLab)

1. Create and push a tag that contains `deploy`:
    ```bash
    git tag deploy_v1.0
    git push origin deploy_v1.0
    ```
2. In GitLab: **Build → Pipelines**. A pipeline with a **manual** deploy stage should appear.
3. Run the **`pages`** job. It will:
    - Install client dependencies.
    - Build the client with `npm run deploy` (or equivalent) using `BASE_HREF`.
    - Publish the build output to GitLab Pages.
4. After the job succeeds, the site is available under the project’s **Pages** URL (see **Deploy → Pages**).

### Client Configuration for Production

- **Environment:** Production build uses `client/src/environments/environment.prod.ts`.
- Set **`serverUrl`** and **`socketUrl`** (or your equivalent) to the **deployed server** URL (e.g. `http://your-ec2-ip:3000/api` and `http://your-ec2-ip:3000`). Do not use `localhost` in production.
- If you use Firebase, ensure production config (e.g. Firebase project, auth domain) is correct in the same file.

### Routing (SPA)

The app uses **hash-based routing** (`HashLocationStrategy`). URLs look like `https://your-pages-url/#/home`. This avoids 404s on refresh when the host serves a single `index.html`. If you change the base path, ensure `BASE_HREF` and any asset paths stay consistent.

### Cache

GitLab Pages may cache aggressively. After a new deploy, allow a few minutes for updates to appear, or test in an incognito window / different browser.

---

## Server Deployment (Node.js / AWS EC2)

The server can be deployed **manually** (SSH + run commands) or **automatically** via the GitLab CI job `deploy:server` when pushing to `dev` or `main`.

### Prerequisites

- An **EC2 instance** (or other Linux VPS) with:
    - SSH access (key pair).
    - Inbound rules allowing the server port (e.g. 3000) and SSH (22).
- **MongoDB** reachable from the server (e.g. MongoDB Atlas or a self-hosted instance).
- **GitLab CI/CD variables** set for the deploy job (see below).

### CI Variables for Server Deploy (GitLab)

In **Settings → CI/CD → Variables** configure (and protect/mask as needed):

| Variable                     | Description                          | Example / notes                             |
| ---------------------------- | ------------------------------------ | ------------------------------------------- |
| `EC2_HOST`                   | Public IP or hostname of the server  | e.g. `54.123.45.67`                         |
| `EC2_PEM_FILE_CONTENT`       | Full content of the private key file | Paste the `.pem` content                    |
| `EC2_USER`                   | SSH user on the instance             | Often `ubuntu` for Ubuntu AMIs              |
| `DATABASE_CONNECTION_STRING` | MongoDB connection URI               | e.g. `mongodb+srv://...` or `mongodb://...` |
| `SERVER_PORT`                | Port the NestJS app listens on       | e.g. `3000`                                 |

The pipeline uses these to SSH into the host, clone the repo, build the server, create a `.env` file, and start the app with PM2.

### What the CI Deploy Job Does

From `.gitlab-ci.yml`, the **deploy:server** job typically:

1. Installs SSH client and loads the PEM key.
2. Connects to `EC2_USER@EC2_HOST`.
3. Ensures **git**, **Node.js** (e.g. 20.x), and **PM2** are installed.
4. Stops and removes existing PM2 processes.
5. Clones the repository (using CI job token) and checks out the commit that triggered the pipeline.
6. Runs `npm ci` and `npm run build` in the `server/` directory.
7. Writes a `.env` file with `DATABASE_CONNECTION_STRING` and `PORT` (from `SERVER_PORT`).
8. Starts the app with PM2 (e.g. `pm2 start out/server/app/index.js --name log3900-server`) and saves the process list.

Trigger: push to `dev` or `main` (as defined in the `rules` of `deploy:server`).

### Manual Server Deployment

If you prefer to deploy by hand:

1. SSH into the instance:
    ```bash
    ssh -i your-key.pem ubuntu@<EC2_HOST>
    ```
2. Install Node.js (e.g. 20.x) and PM2 if not already present.
3. Clone the repo (or pull latest), then:
    ```bash
    cd repo/server
    npm ci
    npm run build
    ```
4. Create `.env` in `server/` with:
    - `DATABASE_CONNECTION_STRING=<your-mongo-uri>`
    - `PORT=3000` (or your chosen port)
5. Start with PM2:
    ```bash
    pm2 start out/server/app/index.js --name log3900-server
    pm2 save
    pm2 startup   # optional, for restart on reboot
    ```

### Security and Firewall

- Restrict SSH and the app port in the EC2 security group (e.g. only your IP or a load balancer).
- Prefer HTTPS in front of the API (reverse proxy with Nginx/Caddy and TLS).
- Keep the PEM key and CI variables secure; use masked/protected variables where possible.

---

## Environment Variables

### Client (build-time)

| Variable / config | File / location                | Purpose                    |
| ----------------- | ------------------------------ | -------------------------- |
| `serverUrl`       | `environment.prod.ts`          | REST API base URL          |
| `socketUrl`       | `environment.prod.ts`          | WebSocket server URL       |
| Firebase config   | `environment.prod.ts` (or env) | Auth and optional features |

### Server (runtime)

| Variable                     | Purpose                           |
| ---------------------------- | --------------------------------- |
| `DATABASE_CONNECTION_STRING` | MongoDB URI                       |
| `PORT`                       | HTTP port (e.g. 3000)             |
| Firebase Admin credentials   | If you use Firebase on the server |

---

## Troubleshooting

**Client shows wrong API or cannot connect**

- Confirm `environment.prod.ts` (or the config used in production build) has the correct `serverUrl` and `socketUrl` for the deployed server.
- Rebuild and redeploy the client after changing env.

**Server deploy job fails on SSH**

- Check `EC2_HOST`, `EC2_USER`, and `EC2_PEM_FILE_CONTENT` in CI/CD variables.
- Ensure the EC2 security group allows SSH from the GitLab runner’s IP (or use a runner in the same VPC if applicable).

**Server crashes or DB errors**

- Verify `DATABASE_CONNECTION_STRING` and that the server can reach MongoDB (network/allowlist).
- SSH to the server and run `pm2 logs` to inspect errors.

**Pages deploy job fails**

- Ensure `BASE_HREF` is set and matches the expected path.
- Check the build locally: `cd client && npm run build` (with production config) and fix any errors.

**Mixed content (HTTPS page, HTTP API)**

- If the client is on HTTPS and the server on HTTP, browsers may block requests. Either serve the client over HTTP (if acceptable) or put the server behind HTTPS (reverse proxy with TLS).

---

For repository-specific details (e.g. exact job names, branch names, or extra env vars), refer to `.gitlab-ci.yml` and your GitLab project settings.

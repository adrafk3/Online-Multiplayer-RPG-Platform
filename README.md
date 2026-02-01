
# Online Multiplayer RPG PlatformA full-stack **turn-based multiplayer RPG** with real-time gameplay, multiple game modes, and a custom map editor. Built with Angular and NestJS, featuring WebSocket-based synchronization, combat mechanics, and Firebase authentication.![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)![Angular](https://img.shields.io/badge/Angular-19-red)![NestJS](https://img.shields.io/badge/NestJS-10-red)![MongoDB](https://img.shields.io/badge/MongoDB-8-green)![Socket.io](https://img.shields.io/badge/Socket.io-4-black)---## Table of Contents- [Overview](#overview)- [Features](#features)- [Tech Stack](#tech-stack)- [Architecture](#architecture)- [Getting Started](#getting-started)- [Project Structure](#project-structure)- [Testing & Quality](#testing--quality)- [Deployment](#deployment)- [Contributing](#contributing)---## OverviewThis project is a **real-time multiplayer board game** where players move on a grid, collect items, engage in turn-based combat, and compete in **Classic** or **Capture the Flag (CTF)** modes. The application supports human players and AI-controlled virtual players, in-game chat, and persistent user accounts. A **map editor** allows creation and validation of custom game boards.---## Features### Gameplay- **Two game modes**    - **Classic** — Last player standing wins.    - **CTF** — Capture the opponent's flag and bring it to your base.- **Turn-based movement** on configurable grid sizes (10×10, 15×15, 20×20).- **Combat system** — Attack, defend, or attempt to escape when meeting another player.- **Items** — Potions, daggers, shields, poison, revive, and dice with distinct effects.- **Virtual players (bots)** — Defensive and aggressive AI to fill empty slots.- **Doors** — Toggleable doors that open/close during the game.- **Special tiles** — Ice (sliding), water, walls, and default tiles.### Platform- **Game rooms** — Create/join rooms, lock/unlock, kick players, choose avatars.- **Real-time sync** — Movement, combat, items, and turn order via **Socket.io**.- **In-game & global chat** — Room-specific and app-wide messaging.- **Map editor** — Create, edit, and validate custom maps (tiles, items, spawns).- **User accounts** — Sign-in with **Firebase Authentication**.- **Player stats** — Victories and game history stored in **MongoDB**.### Quality & DevOps- **REST API** — Game rooms, boards, auth; documented with **Swagger/OpenAPI**.- **Unit tests** — Client (Jasmine/Karma) and server (Jest); coverage reports.- **Linting & formatting** — ESLint and Prettier across client, server, and common code.- **CI/CD** — GitLab CI (install, lint, test); optional deploy to GitLab Pages and AWS EC2.---## Tech Stack| Layer         | Technologies                                                       || ------------- | ------------------------------------------------------------------ || **Client**    | Angular 19, Angular Material, RxJS, Socket.io Client, Firebase SDK || **Server**    | NestJS 10, Express, Socket.io, Mongoose, Firebase Admin            || **Database**  | MongoDB                                                            || **Auth**      | Firebase Authentication                                            || **Real-time** | Socket.io (WebSockets)                                             || **API docs**  | Swagger / OpenAPI                                                  || **Language**  | TypeScript 5.5                                                     |---## Architecture- **Monorepo** with three main packages:    - **`client/`** — Angular SPA (single-page application).    - **`server/`** — NestJS API + WebSocket gateways.    - **`common/`** — Shared TypeScript types, enums, and constants (no business logic).- **Communication**    - HTTP/REST for auth, game room CRUD, and board management.    - WebSockets (Socket.io) for live game events: movement, combat, turns, items, chat, timer.- **Server structure** — Controllers (REST), Gateways (Socket.io), Services (business logic), Mongoose models (Game, User).---## Getting Started### Prerequisites- **Node.js** (v18+ recommended) and **npm**- **MongoDB** (local or Atlas)- **Firebase** project (for authentication)- (Optional) **Angular CLI** for client tooling: `npm install -g @angular/cli`### Installation1. **Clone the repository**    git clone https://github.com/YOUR_USERNAME/Online-Multiplayer-RPG-Platform.git    cd Online-Multiplayer-RPG-Platform    
Install dependencies
    npm ci    cd client && npm ci && cd ..    cd server && npm ci && cd ..
Environment configuration
Server: In server/, create .env or use .env.local with:
DATABASE_CONNECTION_STRING — MongoDB URI
Firebase Admin credentials (for auth)
Client: Configure client/src/environments/environment.ts (and environment.prod.ts) with your Firebase config and API/base URL.
Running locally
Client (default: http://localhost:4200)
    cd client && npm start
Server (default: http://localhost:3000)
    cd server && npm start
Open the client URL in a browser. Ensure the client environment points to the running server (e.g. http://localhost:3000).
Useful commands
Task	Client	Server
Start	npm start	npm start
Build	npm run build	npm run build
Unit tests	npm test	npm test
Coverage	npm run coverage	npm run coverage
Lint	npm run lint	npm run lint
Lint fix	npm run lint:fix	npm run lint:fix
API documentation (when server is running): http://localhost:3000/api/docs
Project Structure
├── client/                 # Angular frontend│   ├── src/│   │   ├── app/│   │   │   ├── components/   # Reusable UI components│   │   │   ├── pages/        # Route-level views (login, game, editor, etc.)│   │   │   ├── services/     # HTTP, Socket, auth, game state│   │   │   ├── guards/       # Route guards (e.g. auth)│   │   │   └── ...│   │   ├── assets/           # Images, audio, avatars│   │   └── environments/     # Dev/prod config│   └── package.json├── server/                 # NestJS backend│   ├── app/│   │   ├── controllers/     # REST (auth, board, game-room)│   │   ├── gateways/        # Socket.io (game-logic, chat, items, timer, etc.)│   │   ├── services/        # Business logic (combat, movement, turns, items)│   │   ├── model/           # Mongoose schemas (Game, User)│   │   └── guards/          # Auth guard│   └── package.json├── common/                 # Shared code (types, enums, constants)│   ├── enums.ts│   ├── interfaces.ts│   ├── gateway-events.ts│   └── ...├── CONTRIBUTING.md├── DEPLOYMENT.md└── README.md
Testing & Quality
Client: Jasmine + Karma; run with npm test or npm run coverage in client/.
Server: Jest; run with npm test or npm run coverage in server/.
Linting: ESLint in both client and server; shared Prettier config at repo root.
CI: GitLab CI runs install, lint, and tests on commits and merge requests (see .gitlab-ci.yml).
Deployment
Client: Static build (e.g. GitLab Pages); configure BASE_HREF and production environment (API URL, Firebase).
Server: Node.js on a VPS or cloud instance (e.g. AWS EC2); see DEPLOYMENT.md for manual and CI-based deployment, security groups, and environment variables.
Detailed steps (including GitLab Pages and AWS EC2) are in DEPLOYMENT.md.
Contributing
Contributions are welcome. Please read CONTRIBUTING.md for branch naming, commit messages, and code review guidelines.
License
This project is available for portfolio and educational use. Check repository and course policies for licensing details.
Built as a full-stack software engineering project — Angular, NestJS, TypeScript, WebSockets, and MongoDB.

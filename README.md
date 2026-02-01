# Online Multiplayer RPG Platform

A full-stack turn-based multiplayer RPG with real-time gameplay, multiple game modes, and a custom map editor.  
Built with Angular and NestJS, featuring WebSocket-based synchronization, combat mechanics, and Firebase authentication.

---

## Table of Contents
- Overview  
- Features  
- Tech Stack  
- Architecture  
- Getting Started  
- Project Structure  
- Testing & Quality  
- Deployment  
- Contributing  

---

## Overview

This project is a real-time multiplayer board game where players move on a grid, collect items, engage in turn-based combat, and compete in Classic or Capture the Flag (CTF) modes.

The application supports human players and AI-controlled virtual players, in-game chat, and persistent user accounts.  
A map editor allows the creation and validation of custom game boards.

---

## Features

### Gameplay
- Two game modes:
  - **Classic**: last player standing wins
  - **Capture the Flag (CTF)**: capture the opponent’s flag and bring it to your base
- Turn-based movement on configurable grid sizes (10×10, 15×15, 20×20)
- Combat system: attack, defend, or attempt to escape when encountering another player
- Items: potions, daggers, shields, poison, revive, and dice with distinct effects
- Virtual players (bots): defensive and aggressive AI to fill empty slots
- Doors: toggleable doors that open and close during the game
- Special tiles: ice (sliding), water, walls, and default tiles

### Platform
- Game rooms: create and join rooms, lock/unlock, kick players, choose avatars
- Real-time synchronization: movement, combat, items, and turn order via Socket.io
- In-game and global chat: room-specific and application-wide messaging
- Map editor: create, edit, and validate custom maps (tiles, items, spawns)
- User accounts: sign-in with Firebase Authentication
- Player statistics: victories and game history stored in MongoDB

### Quality & DevOps
- REST API for game rooms, boards, and authentication, documented with Swagger / OpenAPI
- Unit tests:
  - Client: Jasmine / Karma
  - Server: Jest
- Coverage reports for both client and server
- Linting and formatting: ESLint and Prettier across client, server, and common code
- CI/CD: GitLab CI (install, lint, test), optional deployment to GitLab Pages and AWS EC2

---

## Tech Stack

- **Client**: Angular 19, Angular Material, RxJS, Socket.io Client, Firebase SDK  
- **Server**: NestJS 10, Express, Socket.io, Mongoose, Firebase Admin  
- **Database**: MongoDB  
- **Authentication**: Firebase Authentication  
- **Real-time Communication**: Socket.io (WebSockets)  
- **API Documentation**: Swagger / OpenAPI  
- **Language**: TypeScript 5.5  

---

## Architecture

The project is organized as a monorepo with three main packages:
- `client/`: Angular single-page application
- `server/`: NestJS API and WebSocket gateways
- `common/`: shared TypeScript types, enums, and constants (no business logic)

### Communication
- HTTP / REST for authentication, game room CRUD operations, and board management
- WebSockets (Socket.io) for live game events such as movement, combat, turns, items, chat, and timers

### Server Structure
- Controllers: REST endpoints
- Gateways: Socket.io communication
- Services: business logic
- Mongoose models: Game, User

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended) and npm
- MongoDB (local instance or MongoDB Atlas)
- Firebase project (for authentication)
- (Optional) Angular CLI:
  ```bash
  npm install -g @angular/cli

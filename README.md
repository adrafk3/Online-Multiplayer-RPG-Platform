# Online Multiplayer RPG Platform

A full-stack multiplayer role-playing game platform combining turn-based mechanics with real-time interactions.  
The project was designed as a complete software engineering exercise, covering client–server architecture, real-time synchronization, authentication, and persistent data management.

The game supports multiple modes, human and AI players, and includes a custom map editor to create and validate game boards.

---

## Overview

This application is a multiplayer grid-based RPG where players navigate a map, collect items, and engage in combat against other players.  
Games can be played in different modes, each with its own objectives and win conditions.

The platform supports authenticated users, real-time communication, and persistent player statistics. A dedicated map editor allows custom boards to be designed and reused in games.

---

## Core Gameplay

- Grid-based movement with configurable board sizes
- Turn-based progression with real-time synchronization
- Player encounters triggering combat sequences
- Item collection and strategic use of equipment
- Support for both human players and AI-controlled opponents

### Game Modes
- **Classic Mode**: last surviving player wins
- **Capture the Flag (CTF)**: retrieve the opponent’s flag and return it to your base

---

## Features

### Game Mechanics
- Turn-based movement on grids of varying sizes
- Combat actions: attack, defend, or escape
- Multiple item types with unique effects (offensive, defensive, utility)
- AI-controlled players with different behavioral profiles
- Dynamic elements such as doors and special tiles (ice, water, walls)

### Platform Capabilities
- Create and join multiplayer game rooms
- Room management (lock, unlock, kick players)
- Avatar selection
- In-game and global chat
- Custom map editor with validation rules
- Persistent user accounts and player statistics

### Quality & Tooling
- REST API documented with OpenAPI / Swagger
- Unit testing on both client and server
- Linting and formatting enforced across the codebase
- Continuous integration pipeline for automated checks

---

## Tech Stack

| Layer | Technologies |
|------|-------------|
| Client | Angular, Angular Material, RxJS, Socket.io Client |
| Server | NestJS, Express, Socket.io |
| Language | TypeScript |
| Database | MongoDB |
| Authentication | Firebase Authentication |
| Real-Time | WebSockets (Socket.io) |
| API Documentation | Swagger / OpenAPI |

---

## Architecture

The project is organized as a monorepository composed of three main parts:

- **client/**: Angular single-page application
- **server/**: NestJS backend exposing REST APIs and WebSocket gateways
- **common/**: Shared TypeScript types, enums, and constants

### Communication
- HTTP/REST for authentication, room management, and board configuration
- WebSockets for live gameplay events (movement, combat, turns, chat)

### Server Design
- Controllers for REST endpoints
- Gateways for real-time communication
- Services encapsulating business logic
- Mongoose models for persistent data

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm
- MongoDB (local instance or cloud-based)
- Firebase project for authentication
- (Optional) Angular CLI

---

### Installation

Clone the repository:
```bash
git clone https://github.com/<your-username>/Online-Multiplayer-RPG-Platform.git
cd Online-Multiplayer-RPG-Platform

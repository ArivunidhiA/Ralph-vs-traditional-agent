# 🎯 Ralph Loop Arena

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/ArivunidhiA/Ralph-vs-traditional-agent)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)](https://github.com/ArivunidhiA/Ralph-vs-traditional-agent)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.110-green.svg)](https://fastapi.tiangolo.com/)

> A visual web application demonstrating the difference between Traditional AI coding agents (accumulating context) and Ralph Loop agents (fresh context each iteration) through side-by-side battles on coding tasks.

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)

## 🎯 Overview

Ralph Loop Arena is an interactive battle arena where two AI coding agents compete on the same coding tasks. It compares **accumulating context** (Traditional) with **fresh context each iteration** (Ralph Loop). Ralph’s benefit is avoiding context degradation over long runs; token and time comparison depends on the task.

### Key Highlights

- ⚔️ **Side-by-side battles** between Traditional and Ralph Loop agents
- 📊 **Real-time metrics** tracking tokens, context size, and success rates
- 🎨 **Live code streaming** with syntax highlighting
- 📈 **Visual analytics** showing context growth over iterations
- 📄 **PDF export** for battle reports
- 📚 **Battle history** to review past competitions

## ✨ Features

### 🎮 Core Features
- **5 Predefined Coding Tasks**: REST API, React Component, Data Processing, Unit Tests, Auth Middleware
- **Real-time Streaming**: Watch code generate live with SSE (Server-Sent Events)
- **Dual Agent System**: Compare Traditional (accumulating) vs Ralph Loop (fresh context)
- **Metrics Dashboard**: Charts showing tokens per iteration, context growth, success rates
- **Winner Detection**: Automatic winner declaration when an agent completes successfully

### 🎨 UI/UX Features
- **Dark/Light Theme**: Persistent theme toggle with smooth transitions
- **Syntax Highlighting**: Prism-based code highlighting in iteration cards
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Animations**: Framer Motion animations for smooth interactions
- **Battle History Page**: View and export past battles

### 📊 Analytics & Export
- **Context Size Visualization**: Progress bars showing context accumulation
- **Token comparison**: Compare token usage between agents
- **Time Tracking**: Per-iteration and total time measurements
- **PDF Reports**: Export comprehensive battle reports with code snippets

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Header     │  │ TaskSelector │  │    Arena    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Metrics    │  │   Control    │  │   History   │      │
│  │  Dashboard   │  │    Panel     │  │    Page     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Zustand Store (State Management)           │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/SSE
┌───────────────────────────▼─────────────────────────────────┐
│                   Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Battle     │  │   Agent      │  │   Claude    │     │
│  │  Management  │  │   Iteration  │  │   API       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              PostgreSQL (Supabase)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │              battles table (JSONB)                 │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Description | Technology |
|-----------|-------------|------------|
| **Frontend** | React SPA with routing | React 19, React Router |
| **State Management** | Global state | Zustand |
| **Styling** | Utility-first CSS | Tailwind CSS |
| **Charts** | Metrics visualization | Recharts |
| **Animations** | UI transitions | Framer Motion |
| **Backend** | REST API server | FastAPI, Uvicorn |
| **Database** | Battle storage | PostgreSQL (Supabase) |
| **AI Integration** | LLM API | Anthropic Claude Sonnet 4.5 |
| **PDF Export** | Report generation | jsPDF, jsPDF-AutoTable |

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.110
- **Database**: PostgreSQL (via Supabase)
- **ORM/Driver**: asyncpg 0.29
- **AI SDK**: Anthropic SDK 0.76
- **Server**: Uvicorn (ASGI)

### Frontend
- **Framework**: React 19.0
- **Routing**: React Router 7.5
- **State**: Zustand 5.0
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 3.6
- **Animations**: Framer Motion 12.28
- **Syntax Highlighting**: react-syntax-highlighter 16.1
- **PDF**: jsPDF 2.5, jsPDF-AutoTable 3.8
- **UI Components**: Radix UI, shadcn/ui

### Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Local development setup
- **Environment**: Python 3.9+, Node.js 18+

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm/yarn
- Supabase account (for PostgreSQL)
- Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ArivunidhiA/Ralph-vs-traditional-agent.git
   cd Ralph-vs-traditional-agent
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```

4. **Environment Configuration**
   
   Create `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
   ANTHROPIC_API_KEY=sk-ant-api03-...
   CORS_ORIGINS=http://localhost:3000
   ```

   Create `frontend/.env`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```

5. **Run the Application**
   
   Backend:
   ```bash
   cd backend
   uvicorn server:app --reload --port 8000
   ```
   
   Frontend:
   ```bash
   cd frontend
   npm start
   ```

6. **Open Browser**
   
   Navigate to `http://localhost:3000`

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | API health check |
| `/api/tasks` | GET | List all coding tasks |
| `/api/tasks/{id}` | GET | Get specific task |
| `/api/battles` | GET | List all battles |
| `/api/battles` | POST | Create new battle |
| `/api/battles/{id}` | GET | Get battle details |
| `/api/battles/{id}/start` | POST | Start battle |
| `/api/battles/{id}/iterate/{agent}` | POST | Run iteration |
| `/api/battles/{id}/iterate/{agent}/stream` | GET | Stream iteration (SSE) |
| `/api/battles/{id}/reset` | POST | Reset battle |

## 🔐 Environment Variables

**Backend** (`backend/.env`): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`  
**Frontend** (`frontend/.env`): `REACT_APP_BACKEND_URL`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ to demonstrate the power of fresh context in AI coding agents**

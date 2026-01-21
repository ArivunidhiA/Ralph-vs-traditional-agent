# Ralph Loop Arena - Product Requirements Document

## Original Problem Statement
Build a visual webapp "Ralph Loop Arena" that demonstrates the difference between Traditional AI coding agents (accumulating context) and Ralph Loop agents (fresh context each iteration) through side-by-side battles on coding tasks.

## Architecture
- **Frontend**: React 18 + Zustand + Tailwind CSS + Recharts + Framer Motion
- **Backend**: FastAPI + PostgreSQL (Supabase) + Anthropic SDK (Claude Sonnet 4.5)
- **Database**: PostgreSQL via Supabase for battle storage

## User Personas
1. **AI/ML Engineers** - Want to understand Ralph Loop technique
2. **Tech Professionals** - Evaluating AI coding tools
3. **LinkedIn Audience** - Educational/shareable content

## Core Requirements (Static)
- Dual agent arena with split-screen layout
- 5 coding tasks: REST API, Todo Component, Data Processor, Unit Tests, Auth Middleware
- Real-time iteration visualization with code snippets
- Metrics dashboard with charts (context size, success rate)
- Dark/Light theme toggle
- Floating control panel (Start/Pause/Reset, Speed, Max iterations)

## What's Been Implemented (January 2026)
- [x] Full backend with Claude Sonnet 4.5 integration via Anthropic API
- [x] All 5 coding tasks defined with prompts and criteria
- [x] Traditional Agent (accumulating context) implementation
- [x] Ralph Loop Agent (fresh context) implementation
- [x] Battle creation, start, iterate, reset endpoints
- [x] **SSE Streaming endpoint** for real-time code generation display
- [x] Frontend with all components (Header, TaskSelector, Arena, AgentPanel, MetricsDashboard, ControlPanel)
- [x] Zustand store with streaming state management
- [x] Dark/Light theme with persistence
- [x] Real-time iteration updates with animations
- [x] **Streaming preview** in agent panels showing code as it generates
- [x] Context size visualization (progress bars)
- [x] Winner detection and display
- [x] Responsive design
- [x] **New metrics**: Avg Tokens/Iter, Avg Time/Iter, Token Efficiency
- [x] **Tokens per Iteration chart** showing Traditional grows vs Ralph stays flat

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Claude API integration
- [x] Battle flow end-to-end
- [x] UI visualization
- [x] Streaming responses for real-time code display
- [x] Meaningful comparison charts (Tokens per Iteration, Context Growth)

### P1 (Important)
- [ ] Improve code syntax highlighting in iteration cards
- [ ] Add battle history page

### P2 (Nice to have)
- [ ] Share battle results to LinkedIn
- [ ] Export battle reports as PDF
- [ ] Add more coding tasks
- [ ] Custom task creation

## Next Tasks
1. Consider adding streaming for better UX during long API calls
2. Add battle history/leaderboard showing past battles
3. LinkedIn share button for completed battles

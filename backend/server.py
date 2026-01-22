from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
import json
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, AsyncGenerator
import uuid
from datetime import datetime, timezone
import asyncio
import anthropic
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL connection pool
DATABASE_URL = os.environ.get('DATABASE_URL')  # Supabase connection string
db_pool: Optional[asyncpg.Pool] = None

# ============== DATABASE INITIALIZATION ==============

async def init_db():
    """Initialize PostgreSQL connection pool and create tables"""
    global db_pool
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required")
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    
    # Create battles table if it doesn't exist
    async with db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS battles (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                traditional_agent JSONB NOT NULL,
                ralph_agent JSONB NOT NULL,
                status TEXT NOT NULL DEFAULT 'idle',
                winner TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
        """)
    
    logger.info("Database initialized successfully")

async def close_db():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database connection pool closed")

def ensure_db_pool():
    """Ensure database pool is initialized"""
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

# Get API key
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== RATE LIMITING ==============

# Rate limiting configuration (configurable via environment variables)
RATE_LIMIT_REQUESTS_PER_HOUR = int(os.environ.get('RATE_LIMIT_REQUESTS_PER_HOUR', '50'))
RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'true').lower() == 'true'

# In-memory storage for rate limiting: IP -> list of request timestamps
rate_limit_store: Dict[str, List[float]] = defaultdict(list)

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    # Check for forwarded IP (when behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct client IP
    if request.client:
        return request.client.host
    
    return "unknown"

def check_rate_limit(ip: str) -> tuple[bool, int, int]:
    """
    Check if IP has exceeded rate limit
    Returns: (is_allowed, remaining_requests, reset_time_seconds)
    """
    if not RATE_LIMIT_ENABLED:
        return True, RATE_LIMIT_REQUESTS_PER_HOUR, 3600
    
    current_time = time.time()
    hour_ago = current_time - 3600  # 1 hour in seconds
    
    # Clean up old entries (older than 1 hour)
    if ip in rate_limit_store:
        rate_limit_store[ip] = [
            timestamp for timestamp in rate_limit_store[ip]
            if timestamp > hour_ago
        ]
    
    # Count requests in the last hour
    request_count = len(rate_limit_store[ip])
    
    if request_count >= RATE_LIMIT_REQUESTS_PER_HOUR:
        # Calculate when the oldest request will expire
        if rate_limit_store[ip]:
            oldest_request = min(rate_limit_store[ip])
            reset_time = int(3600 - (current_time - oldest_request))
        else:
            reset_time = 3600
        return False, 0, reset_time
    
    # Add current request timestamp
    rate_limit_store[ip].append(current_time)
    remaining = RATE_LIMIT_REQUESTS_PER_HOUR - request_count - 1
    return True, remaining, 3600

async def rate_limit_dependency(request: Request):
    """Dependency to check rate limit for AI endpoints"""
    ip = get_client_ip(request)
    is_allowed, remaining, reset_time = check_rate_limit(ip)
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for IP: {ip} (limit: {RATE_LIMIT_REQUESTS_PER_HOUR}/hour)")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_REQUESTS_PER_HOUR} requests per hour. Please try again in {reset_time} seconds.",
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS_PER_HOUR),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + reset_time),
                "Retry-After": str(reset_time)
            }
        )
    
    # Log rate limit usage for monitoring
    if remaining < 3:
        logger.info(f"Rate limit warning for IP: {ip} - {remaining} requests remaining")
    
    # Add rate limit headers to successful responses
    # Note: For streaming responses, headers are set in the response object
    return {
        "X-RateLimit-Limit": RATE_LIMIT_REQUESTS_PER_HOUR,
        "X-RateLimit-Remaining": remaining,
        "X-RateLimit-Reset": int(time.time()) + reset_time
    }

# ============== MODELS ==============

class Task(BaseModel):
    id: str
    title: str
    description: str
    acceptance_criteria: List[str]
    difficulty: str
    expected_iterations: Dict[str, int]
    prompt_template: str

class Iteration(BaseModel):
    iteration_number: int
    context_size: int
    tokens_used: int
    time_taken_ms: int = 0  # Time taken for this iteration
    status: str  # 'success', 'failure', 'partial'
    code_snippet: str
    message: str
    timestamp: str

class AgentState(BaseModel):
    agent_type: str  # 'traditional' or 'ralph'
    status: str  # 'idle', 'running', 'completed', 'failed'
    iterations: List[Iteration] = []
    total_tokens: int = 0
    success_count: int = 0
    failure_count: int = 0
    current_context_size: int = 0
    total_time_ms: int = 0  # Total time spent

class Battle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    traditional_agent: AgentState
    ralph_agent: AgentState
    status: str = "idle"  # idle, running, completed
    winner: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BattleCreate(BaseModel):
    task_id: str

# ============== TASK DEFINITIONS ==============

TASKS: List[Task] = [
    Task(
        id="rest-api",
        title="Build a REST API",
        description="Create a Node.js REST API with 3 endpoints: GET /users, POST /users, DELETE /users/:id",
        acceptance_criteria=[
            "All 3 endpoints work correctly",
            "Proper HTTP status codes",
            "Basic validation implemented"
        ],
        difficulty="medium",
        expected_iterations={"traditional": 8, "ralph": 4},
        prompt_template="""Create a Node.js Express REST API with the following endpoints:
- GET /users - returns array of users
- POST /users - creates a new user (accepts name, email)
- DELETE /users/:id - deletes user by id

Include proper error handling and validation. Use an in-memory array for storage."""
    ),
    Task(
        id="todo-component",
        title="React Todo Component",
        description="Build a functional React Todo component with add, complete, and delete functionality",
        acceptance_criteria=[
            "Can add new todos",
            "Can mark todos complete",
            "Can delete todos",
            "Proper state management"
        ],
        difficulty="easy",
        expected_iterations={"traditional": 6, "ralph": 3},
        prompt_template="""Create a React functional component called TodoApp that:
- Has an input field to add new todos
- Displays a list of todos
- Each todo can be marked as complete (strikethrough)
- Each todo has a delete button
- Uses useState for state management
- Has clean, readable code"""
    ),
    Task(
        id="data-processor",
        title="Data Processing Script",
        description="Write a Python script that processes CSV data and generates statistics",
        acceptance_criteria=[
            "Reads CSV file correctly",
            "Calculates mean, median, mode",
            "Handles missing values",
            "Outputs clean report"
        ],
        difficulty="medium",
        expected_iterations={"traditional": 7, "ralph": 4},
        prompt_template="""Write a Python script that:
1. Reads a CSV file with columns: id, name, age, salary
2. Calculates statistics: mean, median, mode for numeric columns
3. Handles missing/invalid values gracefully
4. Prints a formatted report of the statistics
Use pandas library. Include error handling."""
    ),
    Task(
        id="unit-tests",
        title="Unit Test Suite",
        description="Write comprehensive unit tests for a calculator class",
        acceptance_criteria=[
            "Tests all basic operations",
            "Edge cases covered",
            "Error cases tested",
            "Good test structure"
        ],
        difficulty="easy",
        expected_iterations={"traditional": 5, "ralph": 3},
        prompt_template="""Write unit tests for a Calculator class with methods: add, subtract, multiply, divide.
- Test basic functionality for each method
- Test edge cases (zero, negative numbers, large numbers)
- Test error handling (division by zero)
- Use pytest framework
- Include clear test names and docstrings"""
    ),
    Task(
        id="auth-middleware",
        title="Authentication Middleware",
        description="Create JWT authentication middleware for Express.js",
        acceptance_criteria=[
            "Validates JWT tokens",
            "Handles expired tokens",
            "Proper error responses",
            "Protects routes correctly"
        ],
        difficulty="hard",
        expected_iterations={"traditional": 10, "ralph": 5},
        prompt_template="""Create an Express.js JWT authentication middleware that:
1. Extracts JWT from Authorization header (Bearer token)
2. Validates the token signature
3. Checks token expiration
4. Attaches decoded user info to request
5. Returns appropriate error responses
Use jsonwebtoken library. Include helper functions for token generation."""
    )
]

# In-memory storage for active battles
active_battles: Dict[str, Dict[str, Any]] = {}

# ============== CLAUDE INTEGRATION ==============

async def call_claude_streaming(
    messages: List[Dict], 
    system_message: str, 
    session_id: str
) -> AsyncGenerator[str, None]:
    """Call Claude API with streaming response"""
    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        
        # Convert messages to Anthropic format
        anthropic_messages = []
        for m in messages:
            if m['role'] == 'user':
                anthropic_messages.append({"role": "user", "content": m['content']})
            elif m['role'] == 'assistant':
                anthropic_messages.append({"role": "assistant", "content": m['content']})
        
        # Stream the response
        async with client.messages.stream(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system_message,
            messages=anthropic_messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
            
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise

async def call_claude(messages: List[Dict], system_message: str, session_id: str) -> Dict:
    """Call Claude API directly via Anthropic SDK"""
    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        
        # Convert messages to Anthropic format
        anthropic_messages = []
        for m in messages:
            if m['role'] == 'user':
                anthropic_messages.append({"role": "user", "content": m['content']})
            elif m['role'] == 'assistant':
                anthropic_messages.append({"role": "assistant", "content": m['content']})
        
        # Call the API
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system_message,
            messages=anthropic_messages
        )
        
        # Extract text content
        content = ""
        if response.content:
            for block in response.content:
                if hasattr(block, 'text'):
                    content += block.text
                elif isinstance(block, dict) and 'text' in block:
                    content += block['text']
                elif block.type == 'text':
                    content += block.text
        
        return {
            "content": content,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens
        }
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI API error: {str(e)}")

def evaluate_response(response: str, task: Task) -> str:
    """Evaluate if the response meets the task criteria"""
    response_lower = response.lower()
    
    # Simple heuristic evaluation
    criteria_met = 0
    for criterion in task.acceptance_criteria:
        keywords = criterion.lower().split()
        if any(kw in response_lower for kw in keywords if len(kw) > 3):
            criteria_met += 1
    
    has_code = "```" in response or "def " in response or "function " in response or "const " in response
    
    if criteria_met >= len(task.acceptance_criteria) * 0.7 and has_code:
        return "success"
    elif criteria_met >= len(task.acceptance_criteria) * 0.4 and has_code:
        return "partial"
    else:
        return "failure"

def extract_code_snippet(response: str) -> str:
    """Extract code from response"""
    if "```" in response:
        parts = response.split("```")
        if len(parts) >= 2:
            code = parts[1]
            lines = code.split("\n")
            if lines and not lines[0].strip().startswith(("def", "function", "const", "import", "from")):
                lines = lines[1:]
            return "\n".join(lines[:20])
    
    return response[:300] + "..." if len(response) > 300 else response

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Ralph Loop Arena API"}

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks():
    return TASKS

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    for task in TASKS:
        if task.id == task_id:
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@api_router.post("/battles", response_model=Battle)
async def create_battle(battle_create: BattleCreate):
    task = None
    for t in TASKS:
        if t.id == battle_create.task_id:
            task = t
            break
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    battle = Battle(
        task_id=battle_create.task_id,
        traditional_agent=AgentState(agent_type="traditional", status="idle"),
        ralph_agent=AgentState(agent_type="ralph", status="idle"),
        status="idle"
    )
    
    active_battles[battle.id] = {
        "battle": battle.model_dump(),
        "traditional_history": [],
        "ralph_state_file": ""
    }
    
    battle_doc = battle.model_dump()
    
    # Insert into PostgreSQL
    ensure_db_pool()
    async with db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO battles (id, task_id, traditional_agent, ralph_agent, status, winner, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, 
            battle.id,
            battle.task_id,
            json.dumps(battle_doc["traditional_agent"]),
            json.dumps(battle_doc["ralph_agent"]),
            battle.status,
            battle.winner,
            datetime.fromisoformat(battle.created_at.replace('Z', '+00:00'))
        )
    
    return battle

@api_router.get("/battles/{battle_id}")
async def get_battle(battle_id: str):
    if battle_id in active_battles:
        return active_battles[battle_id]["battle"]
    
    # Get from PostgreSQL
    ensure_db_pool()
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT id, task_id, traditional_agent, ralph_agent, status, winner, created_at
            FROM battles
            WHERE id = $1
        """, battle_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Battle not found")
        
        battle = {
            "id": row["id"],
            "task_id": row["task_id"],
            "traditional_agent": row["traditional_agent"],
            "ralph_agent": row["ralph_agent"],
            "status": row["status"],
            "winner": row["winner"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }
    
    return battle

@api_router.get("/battles/{battle_id}/iterate/{agent_type}/stream")
async def iterate_agent_stream(
    battle_id: str, 
    agent_type: str,
    request: Request,
    rate_limit_info: dict = Depends(rate_limit_dependency)
):
    """Stream iteration response using SSE"""
    if battle_id not in active_battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    if agent_type not in ["traditional", "ralph"]:
        raise HTTPException(status_code=400, detail="Invalid agent type")
    
    battle_data = active_battles[battle_id]
    battle = battle_data["battle"]
    
    task = None
    for t in TASKS:
        if t.id == battle["task_id"]:
            task = t
            break
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    agent_key = f"{agent_type}_agent"
    agent_state = battle[agent_key]
    current_iteration = len(agent_state["iterations"]) + 1
    
    async def generate_stream():
        start_time = time.time()
        full_response = ""
        
        # Heartbeat infrastructure for Render service keep-alive
        heartbeat_queue = asyncio.Queue()
        streaming_active = True
        heartbeat_task = None
        
        # Background task to send heartbeats every 10 minutes (keeps Render service awake)
        async def heartbeat_worker():
            while streaming_active:
                await asyncio.sleep(600)  # 10 minutes (safe margin before 15-min Render sleep)
                if streaming_active:
                    await heartbeat_queue.put(": keep-alive\n\n")
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat_worker())
        
        # Prepare messages
        if agent_type == "traditional":
            history = battle_data["traditional_history"]
            if current_iteration == 1:
                messages = [{"role": "user", "content": task.prompt_template}]
            else:
                messages = [{"role": "user", "content": task.prompt_template}]
                for prev in history:
                    messages.append({"role": "assistant", "content": prev["response"]})
                    messages.append({"role": "user", "content": f"The previous attempt had issues. Status: {prev['status']}. Please fix and improve."})
            
            system_message = """You are a coding assistant. Write clean, functional code. 
Your context includes all previous attempts - use them to improve, but be aware the context is growing."""
        else:
            state_file = battle_data["ralph_state_file"]
            if current_iteration == 1:
                messages = [{"role": "user", "content": task.prompt_template}]
            else:
                messages = [{
                    "role": "user", 
                    "content": f"""TASK: {task.prompt_template}

CURRENT STATE (from state file):
{state_file}

Continue from where you left off. Build on the working parts, fix what's broken."""
                }]
            
            system_message = """You are a coding assistant using the Ralph Loop technique. 
Each iteration is fresh - no conversation history. Only read state from the provided state file.
Write clean, functional code. Be concise and focused."""
        
        session_id = f"{battle_id}_{agent_type}_{current_iteration}"
        
        # Send initial event
        yield f"data: {json.dumps({'type': 'start', 'iteration': current_iteration, 'agent': agent_type})}\n\n"
        
        try:
            # Stream the response with heartbeat checking
            async for chunk in call_claude_streaming(messages, system_message, session_id):
                # Check for pending heartbeats (non-blocking)
                while True:
                    try:
                        heartbeat = heartbeat_queue.get_nowait()
                        yield heartbeat
                    except asyncio.QueueEmpty:
                        break
                
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Calculate final metrics
            end_time = time.time()
            time_taken_ms = int((end_time - start_time) * 1000)
            
            status = evaluate_response(full_response, task)
            code_snippet = extract_code_snippet(full_response)
            
            # Calculate context size
            if agent_type == "traditional":
                context_size = sum(len(m["content"]) for m in messages) + len(full_response)
            else:
                context_size = len(messages[0]["content"]) + len(full_response)
            
            # Estimate tokens
            input_tokens = sum(len(m["content"].split()) for m in messages) * 1.3
            output_tokens = len(full_response.split()) * 1.3
            total_tokens = int(input_tokens + output_tokens)
            
            # Create iteration record
            iteration = Iteration(
                iteration_number=current_iteration,
                context_size=context_size,
                tokens_used=total_tokens,
                time_taken_ms=time_taken_ms,
                status=status,
                code_snippet=code_snippet,
                message=full_response[:500] + "..." if len(full_response) > 500 else full_response,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
            # Update agent state
            agent_state["iterations"].append(iteration.model_dump())
            agent_state["total_tokens"] += total_tokens
            agent_state["total_time_ms"] += time_taken_ms
            agent_state["current_context_size"] = context_size
            agent_state["status"] = "running"
            
            if status == "success":
                agent_state["success_count"] += 1
                agent_state["status"] = "completed"
            elif status == "failure":
                agent_state["failure_count"] += 1
            else:
                agent_state["success_count"] += 0.5
            
            # Update history/state
            if agent_type == "traditional":
                battle_data["traditional_history"].append({
                    "response": full_response,
                    "status": status
                })
            else:
                battle_data["ralph_state_file"] = f"""Iteration {current_iteration} completed.
Status: {status}
Working code so far:
{code_snippet}

Notes: {"Task completed successfully" if status == "success" else "Continue improving the implementation"}"""
            
            # Update battle state
            battle[agent_key] = agent_state
            
            # Check for winner
            if agent_state["status"] == "completed":
                other_agent = "ralph_agent" if agent_type == "traditional" else "traditional_agent"
                if battle[other_agent]["status"] != "completed":
                    battle["winner"] = agent_type
                battle["status"] = "completed" if battle[other_agent]["status"] == "completed" else "running"
            
            # Update in database
            async with db_pool.acquire() as conn:
                await conn.execute("""
                    UPDATE battles
                    SET traditional_agent = $1, ralph_agent = $2, status = $3, winner = $4
                    WHERE id = $5
                """,
                    json.dumps(battle["traditional_agent"]),
                    json.dumps(battle["ralph_agent"]),
                    battle["status"],
                    battle.get("winner"),
                    battle_id
                )
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'iteration': iteration.model_dump(), 'agent_state': agent_state, 'battle_status': battle['status'], 'winner': battle.get('winner')})}\n\n"
        
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        finally:
            # Cleanup: stop heartbeat task to prevent it from running after stream ends
            streaming_active = False
            if heartbeat_task and not heartbeat_task.done():
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
    
    # Add rate limit headers to streaming response
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-RateLimit-Limit": str(rate_limit_info.get("X-RateLimit-Limit", RATE_LIMIT_REQUESTS_PER_HOUR)),
        "X-RateLimit-Remaining": str(rate_limit_info.get("X-RateLimit-Remaining", 0)),
        "X-RateLimit-Reset": str(rate_limit_info.get("X-RateLimit-Reset", int(time.time()) + 3600))
    }
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers=headers
    )

@api_router.post("/battles/{battle_id}/iterate/{agent_type}")
async def iterate_agent(
    battle_id: str, 
    agent_type: str,
    request: Request,
    response: Response,
    rate_limit_info: dict = Depends(rate_limit_dependency)
):
    """Run one iteration for an agent (non-streaming)"""
    if battle_id not in active_battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    if agent_type not in ["traditional", "ralph"]:
        raise HTTPException(status_code=400, detail="Invalid agent type")
    
    battle_data = active_battles[battle_id]
    battle = battle_data["battle"]
    
    task = None
    for t in TASKS:
        if t.id == battle["task_id"]:
            task = t
            break
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    agent_key = f"{agent_type}_agent"
    agent_state = battle[agent_key]
    current_iteration = len(agent_state["iterations"]) + 1
    
    start_time = time.time()
    
    # Prepare messages based on agent type
    if agent_type == "traditional":
        history = battle_data["traditional_history"]
        
        if current_iteration == 1:
            messages = [{"role": "user", "content": task.prompt_template}]
        else:
            messages = [{"role": "user", "content": task.prompt_template}]
            for prev in history:
                messages.append({"role": "assistant", "content": prev["response"]})
                messages.append({"role": "user", "content": f"The previous attempt had issues. Status: {prev['status']}. Please fix and improve."})
        
        system_message = """You are a coding assistant. Write clean, functional code. 
Your context includes all previous attempts - use them to improve, but be aware the context is growing."""
        
    else:
        state_file = battle_data["ralph_state_file"]
        
        if current_iteration == 1:
            messages = [{"role": "user", "content": task.prompt_template}]
        else:
            messages = [{
                "role": "user", 
                "content": f"""TASK: {task.prompt_template}

CURRENT STATE (from state file):
{state_file}

Continue from where you left off. Build on the working parts, fix what's broken."""
            }]
        
        system_message = """You are a coding assistant using the Ralph Loop technique. 
Each iteration is fresh - no conversation history. Only read state from the provided state file.
Write clean, functional code. Be concise and focused."""
    
    # Call Claude
    session_id = f"{battle_id}_{agent_type}_{current_iteration}"
    response = await call_claude(messages, system_message, session_id)
    
    end_time = time.time()
    time_taken_ms = int((end_time - start_time) * 1000)
    
    # Evaluate response
    status = evaluate_response(response["content"], task)
    code_snippet = extract_code_snippet(response["content"])
    
    # Calculate context size
    if agent_type == "traditional":
        context_size = sum(len(m["content"]) for m in messages) + len(response["content"])
    else:
        context_size = len(messages[0]["content"]) + len(response["content"])
    
    # Create iteration record
    iteration = Iteration(
        iteration_number=current_iteration,
        context_size=context_size,
        tokens_used=response["total_tokens"],
        time_taken_ms=time_taken_ms,
        status=status,
        code_snippet=code_snippet,
        message=response["content"][:500] + "..." if len(response["content"]) > 500 else response["content"],
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    
    # Update agent state
    agent_state["iterations"].append(iteration.model_dump())
    agent_state["total_tokens"] += response["total_tokens"]
    agent_state["total_time_ms"] += time_taken_ms
    agent_state["current_context_size"] = context_size
    agent_state["status"] = "running"
    
    if status == "success":
        agent_state["success_count"] += 1
        agent_state["status"] = "completed"
    elif status == "failure":
        agent_state["failure_count"] += 1
    else:
        agent_state["success_count"] += 0.5
    
    # Update history/state
    if agent_type == "traditional":
        battle_data["traditional_history"].append({
            "response": response["content"],
            "status": status
        })
    else:
        battle_data["ralph_state_file"] = f"""Iteration {current_iteration} completed.
Status: {status}
Working code so far:
{code_snippet}

Notes: {"Task completed successfully" if status == "success" else "Continue improving the implementation"}"""
    
    # Update battle state
    battle[agent_key] = agent_state
    
    # Check for winner
    if agent_state["status"] == "completed":
        other_agent = "ralph_agent" if agent_type == "traditional" else "traditional_agent"
        if battle[other_agent]["status"] != "completed":
            battle["winner"] = agent_type
        battle["status"] = "completed" if battle[other_agent]["status"] == "completed" else "running"
    
    # Update in database
    async with db_pool.acquire() as conn:
        await conn.execute("""
            UPDATE battles
            SET traditional_agent = $1, ralph_agent = $2, status = $3, winner = $4
            WHERE id = $5
        """,
            json.dumps(battle["traditional_agent"]),
            json.dumps(battle["ralph_agent"]),
            battle["status"],
            battle.get("winner"),
            battle_id
        )
    
    # Add rate limit headers to response
    response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("X-RateLimit-Limit", RATE_LIMIT_REQUESTS_PER_HOUR))
    response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("X-RateLimit-Remaining", 0))
    response.headers["X-RateLimit-Reset"] = str(rate_limit_info.get("X-RateLimit-Reset", int(time.time()) + 3600))
    
    return {
        "iteration": iteration.model_dump(),
        "agent_state": agent_state,
        "battle_status": battle["status"],
        "winner": battle.get("winner")
    }

@api_router.post("/battles/{battle_id}/start")
async def start_battle(battle_id: str):
    if battle_id not in active_battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    battle = active_battles[battle_id]["battle"]
    battle["status"] = "running"
    battle["traditional_agent"]["status"] = "running"
    battle["ralph_agent"]["status"] = "running"
    
    async with db_pool.acquire() as conn:
        await conn.execute("""
            UPDATE battles
            SET status = $1
            WHERE id = $2
        """, "running", battle_id)
    
    return {"message": "Battle started", "battle_id": battle_id}

@api_router.post("/battles/{battle_id}/reset")
async def reset_battle(battle_id: str):
    if battle_id not in active_battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    battle = active_battles[battle_id]["battle"]
    
    battle["traditional_agent"] = AgentState(agent_type="traditional", status="idle").model_dump()
    battle["ralph_agent"] = AgentState(agent_type="ralph", status="idle").model_dump()
    battle["status"] = "idle"
    battle["winner"] = None
    
    active_battles[battle_id]["traditional_history"] = []
    active_battles[battle_id]["ralph_state_file"] = ""
    
    async with db_pool.acquire() as conn:
        await conn.execute("""
            UPDATE battles
            SET traditional_agent = $1, ralph_agent = $2, status = $3, winner = $4
            WHERE id = $5
        """,
            json.dumps(battle["traditional_agent"]),
            json.dumps(battle["ralph_agent"]),
            battle["status"],
            battle["winner"],
            battle_id
        )
    
    return battle

@api_router.get("/battles")
async def list_battles():
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, task_id, traditional_agent, ralph_agent, status, winner, created_at
            FROM battles
            ORDER BY created_at DESC
            LIMIT 50
        """)
        
        battles = []
        for row in rows:
            battles.append({
                "id": row["id"],
                "task_id": row["task_id"],
                "traditional_agent": row["traditional_agent"],
                "ralph_agent": row["ralph_agent"],
                "status": row["status"],
                "winner": row["winner"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            })
    
    return battles

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()

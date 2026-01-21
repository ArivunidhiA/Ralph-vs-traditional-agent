from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Get API key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Build the full message from context
        full_message = "\n\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])
        
        user_message = UserMessage(text=full_message)
        
        # Get the response (emergentintegrations doesn't support streaming, so we simulate it)
        response = await chat.send_message(user_message)
        
        # Simulate streaming by yielding chunks
        chunk_size = 50
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i+chunk_size]
            yield chunk
            await asyncio.sleep(0.02)  # Small delay for streaming effect
            
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise

async def call_claude(messages: List[Dict], system_message: str, session_id: str) -> Dict:
    """Call Claude API via emergentintegrations"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Build the full message from context
        full_message = "\n\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])
        
        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)
        
        # Estimate tokens (rough approximation)
        input_tokens = len(full_message.split()) * 1.3
        output_tokens = len(response.split()) * 1.3
        
        return {
            "content": response,
            "input_tokens": int(input_tokens),
            "output_tokens": int(output_tokens),
            "total_tokens": int(input_tokens + output_tokens)
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
    await db.battles.insert_one(battle_doc)
    
    return battle

@api_router.get("/battles/{battle_id}")
async def get_battle(battle_id: str):
    if battle_id in active_battles:
        return active_battles[battle_id]["battle"]
    
    battle = await db.battles.find_one({"id": battle_id}, {"_id": 0})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    return battle

@api_router.get("/battles/{battle_id}/iterate/{agent_type}/stream")
async def iterate_agent_stream(battle_id: str, agent_type: str):
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
            # Stream the response
            async for chunk in call_claude_streaming(messages, system_message, session_id):
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
            await db.battles.update_one(
                {"id": battle_id},
                {"$set": battle}
            )
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'iteration': iteration.model_dump(), 'agent_state': agent_state, 'battle_status': battle['status'], 'winner': battle.get('winner')})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@api_router.post("/battles/{battle_id}/iterate/{agent_type}")
async def iterate_agent(battle_id: str, agent_type: str):
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
    await db.battles.update_one(
        {"id": battle_id},
        {"$set": battle}
    )
    
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
    
    await db.battles.update_one(
        {"id": battle_id},
        {"$set": {"status": "running"}}
    )
    
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
    
    await db.battles.update_one(
        {"id": battle_id},
        {"$set": battle}
    )
    
    return battle

@api_router.get("/battles")
async def list_battles():
    battles = await db.battles.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

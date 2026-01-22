import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useArenaStore = create((set, get) => ({
  // State
  tasks: [],
  selectedTask: null,
  battle: null,
  battles: [],
  isRunning: false,
  isPaused: false,
  maxIterations: 10,
  theme: localStorage.getItem('theme') || 'dark',
  error: null,
  loading: false,
  rateLimitShown: false, // Track if rate limit notification has been shown
  
  // Streaming state - support multiple agents streaming simultaneously
  streamingAgents: {}, // { 'traditional': content, 'ralph': content }

  // Actions
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  setMaxIterations: (max) => set({ maxIterations: max }),
  setStreamingContent: (agent, content) => set((state) => ({
    streamingAgents: { ...state.streamingAgents, [agent]: content }
  })),
  appendStreamingContent: (agent, content) => {
    set((state) => ({
      streamingAgents: {
        ...state.streamingAgents,
        [agent]: (state.streamingAgents[agent] || '') + content
      }
    }));
  },
  clearStreaming: (agent) => {
    if (agent) {
      set((state) => {
        const newAgents = { ...state.streamingAgents };
        delete newAgents[agent];
        return { streamingAgents: newAgents };
      });
    } else {
      set({ streamingAgents: {} });
    }
  },

  fetchTasks: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API}/tasks`);
      set({ tasks: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchBattles: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API}/battles`);
      set({ battles: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  selectTask: (task) => {
    set({ selectedTask: task, battle: null, isRunning: false });
  },

  createBattle: async () => {
    const { selectedTask } = get();
    if (!selectedTask) {
      toast.error('Please select a task first');
      return;
    }

    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${API}/battles`, {
        task_id: selectedTask.id
      });
      set({ battle: response.data, loading: false, error: null });
      toast.success('Battle created successfully');
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to create battle';
      console.error('Create battle error:', error);
      toast.error(errorMsg);
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  startBattle: async () => {
    const { battle, createBattle } = get();
    
    let currentBattle = battle;
    if (!currentBattle) {
      try {
        currentBattle = await createBattle();
      } catch (error) {
        const errorMsg = error.response?.data?.detail || error.message || 'Failed to create battle';
        toast.error(errorMsg);
        set({ error: errorMsg });
        return;
      }
    }

    if (!currentBattle) {
      toast.error('No battle available. Please select a task first.');
      return;
    }

    try {
      await axios.post(`${API}/battles/${currentBattle.id}/start`);
      set({ isRunning: true, isPaused: false, error: null, rateLimitShown: false });
      get().runBattleLoop();
      toast.success('Battle started!');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to start battle';
      toast.error(errorMsg);
      set({ error: errorMsg, isRunning: false });
      console.error('Start battle error:', error);
    }
  },

  pauseBattle: () => {
    set({ isPaused: true });
  },

  resumeBattle: () => {
    set({ isPaused: false });
    get().runBattleLoop();
  },

  resetBattle: async () => {
    const { battle } = get();
    if (!battle) return;

    try {
      set({ loading: true });
      const response = await axios.post(`${API}/battles/${battle.id}/reset`);
      set({ 
        battle: response.data, 
        isRunning: false, 
        isPaused: false,
        loading: false,
        streamingAgents: {}
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  runBattleLoop: async () => {
    // Use a small delay to prevent immediate re-execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { battle, isRunning, isPaused } = get();
    
    if (!battle || !isRunning || isPaused) return;

    // Get fresh battle state
    const currentBattle = get().battle;
    if (!currentBattle || currentBattle.id !== battle.id) return;

    const traditionalDone = currentBattle.traditional_agent?.status === 'completed';
    const ralphDone = currentBattle.ralph_agent?.status === 'completed';

    if (traditionalDone && ralphDone) {
      set({ isRunning: false });
      return;
    }

    // Run both agents in parallel with streaming - they execute simultaneously
    const promises = [];
    let rateLimitHit = false;
    
    if (!traditionalDone) {
      promises.push(get().iterateAgentWithStream('traditional').catch(err => {
        console.error('Traditional agent error:', err);
        if (err.response?.status === 429 || err.message?.includes('rate limit')) {
          rateLimitHit = true;
          const { rateLimitShown } = get();
          if (!rateLimitShown) {
            const retryAfter = err.response?.headers?.['retry-after'] || '60';
            toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
            set({ rateLimitShown: true, isRunning: false });
          }
        } else {
          const errorMsg = err.response?.data?.detail || err.message || 'Traditional agent failed';
          toast.error(`Traditional agent error: ${errorMsg}`);
        }
        return null;
      }));
    }
    
    if (!ralphDone) {
      promises.push(get().iterateAgentWithStream('ralph').catch(err => {
        console.error('Ralph agent error:', err);
        if (err.response?.status === 429 || err.message?.includes('rate limit')) {
          rateLimitHit = true;
          const { rateLimitShown } = get();
          if (!rateLimitShown) {
            const retryAfter = err.response?.headers?.['retry-after'] || '60';
            toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
            set({ rateLimitShown: true, isRunning: false });
          }
        } else {
          const errorMsg = err.response?.data?.detail || err.message || 'Ralph agent failed';
          toast.error(`Ralph agent error: ${errorMsg}`);
        }
        return null;
      }));
    }

    // Wait for both agents to complete (they run in parallel)
    await Promise.all(promises);

    // Stop battle loop if rate limit was hit
    if (rateLimitHit) {
      return;
    }

    // Check if we should continue
    const finalState = get();
    if (!finalState.isRunning || finalState.isPaused) return;

    // Continue loop if still running and not paused
    if (get().isRunning && !get().isPaused) {
      // Use setTimeout to prevent stack overflow
      setTimeout(() => {
        get().runBattleLoop();
      }, 0);
    }
  },

  iterateAgentWithStream: async (agentType) => {
    const { battle } = get();
    if (!battle) return;

    try {
      // Use SSE for streaming
      const eventSource = new EventSource(
        `${API}/battles/${battle.id}/iterate/${agentType}/stream`
      );

      return new Promise((resolve, reject) => {
        let streamingContentBuffer = '';
        let isComplete = false;

        eventSource.onmessage = (event) => {
          if (isComplete) return; // Prevent multiple completions
          
          const data = JSON.parse(event.data);
          
          if (data.type === 'start') {
            set((state) => ({
              streamingAgents: { ...state.streamingAgents, [agentType]: '' }
            }));
            streamingContentBuffer = '';
          } else if (data.type === 'chunk') {
            streamingContentBuffer += data.content;
            // Update streaming content for this specific agent
            get().appendStreamingContent(agentType, data.content);
          } else if (data.type === 'attempt_complete') {
            // Update battle state but continue streaming (retry loop)
            const currentState = get();
            const latestBattle = currentState.battle;
            
            if (latestBattle && latestBattle.id === battle.id) {
              set((state) => {
                if (!state.battle || state.battle.id !== battle.id) {
                  return state;
                }
                
                const updatedBattle = { ...state.battle };
                const agentKey = `${agentType}_agent`;
                updatedBattle[agentKey] = data.agent_state;
                updatedBattle.status = data.battle_status;

                return { battle: updatedBattle };
              });
            }
            // Clear streaming content for next attempt
            set((state) => ({
              streamingAgents: { ...state.streamingAgents, [agentType]: '' }
            }));
            streamingContentBuffer = '';
          } else if (data.type === 'complete') {
            isComplete = true;
            
            // Fetch latest battle state to avoid stale updates
            const currentState = get();
            const latestBattle = currentState.battle;
            
            if (latestBattle && latestBattle.id === battle.id) {
              // Update battle state atomically
              set((state) => {
                // Only update if battle ID matches (prevent stale updates)
                if (!state.battle || state.battle.id !== battle.id) {
                  return state;
                }
                
                const updatedBattle = { ...state.battle };
                const agentKey = `${agentType}_agent`;
                updatedBattle[agentKey] = data.agent_state;
                updatedBattle.status = data.battle_status;
                updatedBattle.winner = data.winner;

                // Remove this agent from streaming
                const newStreamingAgents = { ...state.streamingAgents };
                delete newStreamingAgents[agentType];

                return { 
                  battle: updatedBattle,
                  streamingAgents: newStreamingAgents
                };
              });
            }
            
            eventSource.close();
            resolve(data);
          } else if (data.type === 'error') {
            isComplete = true;
            eventSource.close();
            reject(new Error(data.message));
          }
        };

        eventSource.onerror = (error) => {
          if (isComplete) return;
          isComplete = true;
          eventSource.close();
          
          // Check if it's a rate limit error (EventSource doesn't provide status, but we can try the fallback)
          // The fallback will handle rate limit errors properly
          get().iterateAgent(agentType)
            .then(resolve)
            .catch((err) => {
              console.error(`EventSource error for ${agentType}:`, err);
              // Don't show duplicate notifications - iterateAgent already handles rate limit toasts
              reject(err);
            });
        };
      });
    } catch (error) {
      console.error(`Error iterating ${agentType}:`, error);
      // Fallback to non-streaming
      return get().iterateAgent(agentType);
    }
  },

  iterateAgent: async (agentType) => {
    const { battle } = get();
    if (!battle) return;

    try {
      const response = await axios.post(
        `${API}/battles/${battle.id}/iterate/${agentType}`
      );

      set((state) => {
        const updatedBattle = { ...state.battle };
        const agentKey = `${agentType}_agent`;
        updatedBattle[agentKey] = response.data.agent_state;
        updatedBattle.status = response.data.battle_status;
        updatedBattle.winner = response.data.winner;

        return { battle: updatedBattle };
      });

      return response.data;
    } catch (error) {
      console.error(`Error iterating ${agentType}:`, error);
      const errorMsg = error.response?.data?.detail || error.message || `Failed to iterate ${agentType} agent`;
      
      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        const { rateLimitShown } = get();
        if (!rateLimitShown) {
          const retryAfter = error.response.headers['retry-after'] || '60';
          toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
          set({ rateLimitShown: true, isRunning: false });
        }
      } else {
        toast.error(errorMsg);
      }
      
      set({ error: errorMsg });
      throw error; // Re-throw so caller can handle it
    }
  },

  // Metrics helpers
  getMetrics: () => {
    const { battle } = get();
    if (!battle) return null;

    const traditional = battle.traditional_agent;
    const ralph = battle.ralph_agent;

    return {
      traditional: {
        totalTokens: traditional.total_tokens || 0,
        totalTimeMs: traditional.total_time_ms || 0,
        finalStatus: traditional.final_status || '',
        status: traditional.status
      },
      ralph: {
        totalTokens: ralph.total_tokens || 0,
        totalTimeMs: ralph.total_time_ms || 0,
        finalStatus: ralph.final_status || '',
        status: ralph.status
      }
    };
  }
}));

// Initialize theme on load
if (typeof window !== 'undefined') {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

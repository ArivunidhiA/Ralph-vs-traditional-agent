import { create } from 'zustand';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useArenaStore = create((set, get) => ({
  // State
  tasks: [],
  selectedTask: null,
  battle: null,
  battles: [],
  isRunning: false,
  isPaused: false,
  speed: 'normal',
  maxIterations: 10,
  theme: localStorage.getItem('theme') || 'dark',
  error: null,
  loading: false,
  
  // Streaming state - support multiple agents streaming simultaneously
  streamingAgents: {}, // { 'traditional': content, 'ralph': content }

  // Speed delays in ms
  speedDelays: {
    slow: 2000,
    normal: 1000,
    fast: 300
  },

  // Actions
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  setSpeed: (speed) => set({ speed }),
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
    if (!selectedTask) return;

    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${API}/battles`, {
        task_id: selectedTask.id
      });
      set({ battle: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  startBattle: async () => {
    const { battle, createBattle } = get();
    
    let currentBattle = battle;
    if (!currentBattle) {
      currentBattle = await createBattle();
    }

    if (!currentBattle) return;

    try {
      await axios.post(`${API}/battles/${currentBattle.id}/start`);
      set({ isRunning: true, isPaused: false });
      get().runBattleLoop();
    } catch (error) {
      set({ error: error.message });
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
    
    const { battle, isRunning, isPaused, speed, speedDelays } = get();
    
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
    
    if (!traditionalDone) {
      promises.push(get().iterateAgentWithStream('traditional').catch(err => {
        console.error('Traditional agent error:', err);
        return null;
      }));
    }
    
    if (!ralphDone) {
      promises.push(get().iterateAgentWithStream('ralph').catch(err => {
        console.error('Ralph agent error:', err);
        return null;
      }));
    }

    // Wait for both agents to complete (they run in parallel)
    await Promise.all(promises);

    // Check if we should continue
    const finalState = get();
    if (!finalState.isRunning || finalState.isPaused) return;

    // Wait before next iteration (only if both are still running)
    await new Promise(resolve => setTimeout(resolve, speedDelays[speed]));

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
          // Fallback to non-streaming endpoint
          get().iterateAgent(agentType).then(resolve).catch(reject);
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
      set({ error: error.message });
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
        iterations: traditional.iterations.length,
        successRate: traditional.iterations.length > 0 
          ? ((traditional.success_count / traditional.iterations.length) * 100).toFixed(1)
          : 0,
        totalTokens: traditional.total_tokens,
        totalTimeMs: traditional.total_time_ms || 0,
        contextSizes: traditional.iterations.map(i => i.context_size),
        tokensPerIteration: traditional.iterations.map(i => i.tokens_used),
        timePerIteration: traditional.iterations.map(i => i.time_taken_ms || 0),
        status: traditional.status
      },
      ralph: {
        iterations: ralph.iterations.length,
        successRate: ralph.iterations.length > 0 
          ? ((ralph.success_count / ralph.iterations.length) * 100).toFixed(1)
          : 0,
        totalTokens: ralph.total_tokens,
        totalTimeMs: ralph.total_time_ms || 0,
        contextSizes: ralph.iterations.map(i => i.context_size),
        tokensPerIteration: ralph.iterations.map(i => i.tokens_used),
        timePerIteration: ralph.iterations.map(i => i.time_taken_ms || 0),
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

import { create } from 'zustand';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useArenaStore = create((set, get) => ({
  // State
  tasks: [],
  selectedTask: null,
  battle: null,
  isRunning: false,
  isPaused: false,
  speed: 'normal', // 'slow', 'normal', 'fast'
  maxIterations: 10,
  theme: localStorage.getItem('theme') || 'dark',
  error: null,
  loading: false,

  // Speed delays in ms
  speedDelays: {
    slow: 3000,
    normal: 1500,
    fast: 500
  },

  // Actions
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  setSpeed: (speed) => set({ speed }),
  setMaxIterations: (max) => set({ maxIterations: max }),

  fetchTasks: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API}/tasks`);
      set({ tasks: response.data, loading: false });
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
        loading: false 
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  runBattleLoop: async () => {
    const { battle, isRunning, isPaused, maxIterations, speed, speedDelays } = get();
    
    if (!battle || !isRunning || isPaused) return;

    const traditionalDone = battle.traditional_agent.status === 'completed' || 
                           battle.traditional_agent.iterations.length >= maxIterations;
    const ralphDone = battle.ralph_agent.status === 'completed' || 
                     battle.ralph_agent.iterations.length >= maxIterations;

    if (traditionalDone && ralphDone) {
      set({ isRunning: false });
      return;
    }

    // Run both agents in parallel
    const promises = [];
    
    if (!traditionalDone) {
      promises.push(get().iterateAgent('traditional'));
    }
    
    if (!ralphDone) {
      promises.push(get().iterateAgent('ralph'));
    }

    await Promise.all(promises);

    // Wait before next iteration
    await new Promise(resolve => setTimeout(resolve, speedDelays[speed]));

    // Continue loop if still running
    if (get().isRunning && !get().isPaused) {
      get().runBattleLoop();
    }
  },

  iterateAgent: async (agentType) => {
    const { battle } = get();
    if (!battle) return;

    try {
      const response = await axios.post(
        `${API}/battles/${battle.id}/iterate/${agentType}`
      );

      // Update battle state
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
        contextSizes: traditional.iterations.map(i => i.context_size),
        status: traditional.status
      },
      ralph: {
        iterations: ralph.iterations.length,
        successRate: ralph.iterations.length > 0 
          ? ((ralph.success_count / ralph.iterations.length) * 100).toFixed(1)
          : 0,
        totalTokens: ralph.total_tokens,
        contextSizes: ralph.iterations.map(i => i.context_size),
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

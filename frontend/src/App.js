import { useEffect } from 'react';
import { Header } from './components/Header';
import { TaskSelector } from './components/TaskSelector';
import { Arena } from './components/Arena';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ControlPanel } from './components/ControlPanel';
import { Toaster } from './components/ui/sonner';
import { useArenaStore } from './store/arenaStore';
import './App.css';

function App() {
  const { theme } = useArenaStore();

  useEffect(() => {
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen bg-background" data-testid="app-container">
      <Header />
      
      <main className="pb-32">
        {/* Hero Section */}
        <section className="py-12 border-b border-border/40" data-testid="hero-section">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Traditional vs{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500">
                Ralph Loop
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch two AI coding agents battle side-by-side. See why fresh context 
              beats accumulated context for complex coding tasks.
            </p>
          </div>
        </section>

        {/* Task Selection */}
        <TaskSelector />

        {/* Battle Arena */}
        <Arena />

        {/* Metrics Dashboard */}
        <MetricsDashboard />
      </main>

      {/* Floating Control Panel */}
      <ControlPanel />

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;

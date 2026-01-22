import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { TaskSelector } from './components/TaskSelector';
import { Arena } from './components/Arena';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ControlPanel } from './components/ControlPanel';
import { BattleHistory } from './components/BattleHistory';
import { Toaster } from './components/ui/sonner';
import { EtherealShadow } from './components/ui/ethereal-shadow';
import { useArenaStore } from './store/arenaStore';
import './App.css';

function HomePage() {
  return (
    <>
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
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto italic font-normal">
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
    </>
  );
}

function App() {
  const { theme } = useArenaStore();

  useEffect(() => {
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen relative" data-testid="app-container" style={{ background: 'transparent' }}>
      {/* Ethereal Shadow Background - Dark Moving Shadows */}
      <EtherealShadow
        color="rgba(30, 30, 50, 0.9)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 0.05, scale: 1.2 }}
        sizing="fill"
      />
      
      {/* Content Layer */}
      <div className="relative z-10" style={{ background: 'transparent' }}>
        <Header />
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<BattleHistory />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster position="top-right" />
      </div>
    </div>
  );
}

export default App;

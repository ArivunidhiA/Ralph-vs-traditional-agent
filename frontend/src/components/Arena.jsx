import { useArenaStore } from '../store/arenaStore';
import { AgentPanel } from './AgentPanel';
import { Trophy, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export function Arena() {
  const { battle, selectedTask, maxIterations } = useArenaStore();

  if (!selectedTask) {
    return (
      <section className="py-8" data-testid="arena-empty">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="rounded-xl border-2 border-dashed border-border/50 p-12 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Select a Task to Begin</h3>
            <p className="text-muted-foreground">
              Choose a coding task above to start the AI battle
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8" data-testid="arena">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        {/* Arena Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Battle Arena</h2>
            <p className="text-muted-foreground">
              {selectedTask.title} - Watch the agents compete
            </p>
          </div>

          {/* Winner Badge */}
          {battle?.winner && (
            <div 
              data-testid="winner-badge"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-semibold animate-slide-up",
                battle.winner === 'ralph' 
                  ? "bg-green-500/20 text-green-500 glow-green"
                  : "bg-blue-500/20 text-blue-500 glow-blue"
              )}
            >
              <Trophy className="w-5 h-5" />
              {battle.winner === 'ralph' ? 'Ralph Loop Wins!' : 'Traditional Wins!'}
            </div>
          )}
        </div>

        {/* VS Indicator for Mobile */}
        <div className="lg:hidden flex items-center justify-center mb-4">
          <div className="px-4 py-1 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
            VS
          </div>
        </div>

        {/* Agent Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 relative">
          {/* Traditional Agent */}
          <AgentPanel 
            agent={battle?.traditional_agent}
            type="traditional"
            maxIterations={maxIterations}
          />

          {/* VS Divider for Desktop */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center font-bold text-muted-foreground">
              VS
            </div>
          </div>

          {/* Ralph Loop Agent */}
          <AgentPanel 
            agent={battle?.ralph_agent}
            type="ralph"
            maxIterations={maxIterations}
          />
        </div>
      </div>
    </section>
  );
}

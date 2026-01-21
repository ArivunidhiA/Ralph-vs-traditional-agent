import { Play, Pause, RotateCcw, Gauge, Hash } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from './ui/tooltip';
import { useArenaStore } from '../store/arenaStore';
import { cn } from '../lib/utils';

export function ControlPanel() {
  const { 
    isRunning, 
    isPaused, 
    battle,
    selectedTask,
    speed, 
    maxIterations,
    setSpeed,
    setMaxIterations,
    startBattle,
    pauseBattle,
    resumeBattle,
    resetBattle,
    loading
  } = useArenaStore();

  const canStart = selectedTask && (!battle || battle.status !== 'running');
  const canPause = isRunning && !isPaused;
  const canResume = isRunning && isPaused;
  const canReset = battle && battle.status !== 'idle';

  return (
    <TooltipProvider>
      <div 
        data-testid="control-panel"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-background/90 backdrop-blur-xl shadow-2xl"
      >
        {/* Play/Pause Button */}
        {canResume ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-white"
                onClick={resumeBattle}
                data-testid="resume-button"
              >
                <Play className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resume Battle</TooltipContent>
          </Tooltip>
        ) : canPause ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={pauseBattle}
                data-testid="pause-button"
              >
                <Pause className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pause Battle</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full",
                  canStart 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "bg-muted text-muted-foreground"
                )}
                onClick={startBattle}
                disabled={!canStart || loading}
                data-testid="start-button"
              >
                <Play className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canStart ? 'Start Battle' : 'Select a task first'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Reset Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full"
              onClick={resetBattle}
              disabled={!canReset || loading}
              data-testid="reset-button"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Battle</TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={speed} 
                  onValueChange={setSpeed}
                  disabled={isRunning && !isPaused}
                >
                  <SelectTrigger 
                    className="w-24 h-9"
                    data-testid="speed-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>Animation Speed</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Max Iterations */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium w-6 text-center">
                  {maxIterations}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Max Iterations</TooltipContent>
          </Tooltip>
          <Slider
            value={[maxIterations]}
            onValueChange={([value]) => setMaxIterations(value)}
            min={3}
            max={15}
            step={1}
            className="w-24"
            disabled={isRunning && !isPaused}
            data-testid="max-iterations-slider"
          />
        </div>

        {/* Status Badge */}
        {battle && (
          <>
            <div className="w-px h-8 bg-border" />
            <div 
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                battle.status === 'running' && "bg-yellow-500/20 text-yellow-500",
                battle.status === 'completed' && "bg-green-500/20 text-green-500",
                battle.status === 'idle' && "bg-muted text-muted-foreground"
              )}
              data-testid="battle-status"
            >
              {battle.status === 'running' ? 'Battle in Progress' : 
               battle.status === 'completed' ? 'Battle Complete' : 'Ready'}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

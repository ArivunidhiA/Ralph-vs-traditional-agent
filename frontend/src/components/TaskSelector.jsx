import { useEffect } from 'react';
import { Code, FileCode, Database, TestTube, Shield, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useArenaStore } from '../store/arenaStore';
import { Badge } from './ui/badge';

const taskIcons = {
  'rest-api': Code,
  'todo-component': FileCode,
  'data-processor': Database,
  'unit-tests': TestTube,
  'auth-middleware': Shield,
};

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function TaskSelector() {
  const { tasks, selectedTask, fetchTasks, selectTask, loading } = useArenaStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading && tasks.length === 0) {
    return (
      <section className="py-8" data-testid="task-selector-loading">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <h2 className="text-2xl font-bold mb-6">Select a Coding Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="h-48 rounded-xl border border-border/50 bg-card animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8" data-testid="task-selector">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Select a Coding Task</h2>
            <p className="text-muted-foreground mt-1">
              Choose a task for the AI agents to compete on
            </p>
          </div>
          {selectedTask && (
            <Badge variant="outline" className="text-sm">
              Selected: {selectedTask.title}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tasks.map((task) => {
            const Icon = taskIcons[task.id] || Code;
            const isSelected = selectedTask?.id === task.id;

            return (
              <button
                key={task.id}
                onClick={() => selectTask(task)}
                data-testid={`task-card-${task.id}`}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card p-5 text-left transition-all duration-300 hover:shadow-lg cursor-pointer",
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/50"
                    : "border-border/50 hover:border-primary/50"
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="font-semibold mb-2 line-clamp-1">{task.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {task.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", difficultyColors[task.difficulty])}
                  >
                    {task.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ~{task.expected_iterations.ralph} iters
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';

const statusIcons = {
  success: CheckCircle2,
  failure: XCircle,
  partial: AlertCircle,
};

const statusColors = {
  success: 'text-green-500',
  failure: 'text-red-500',
  partial: 'text-yellow-500',
};

export function AgentPanel({ agent, type, maxIterations = 10 }) {
  const isTraditional = type === 'traditional';
  const iterations = agent?.iterations || [];
  const contextSize = agent?.current_context_size || 0;
  const maxContext = isTraditional ? 50000 : 10000; // Traditional grows, Ralph stays small
  const contextPercent = Math.min((contextSize / maxContext) * 100, 100);

  return (
    <div 
      data-testid={`agent-panel-${type}`}
      className={cn(
        "h-[600px] flex flex-col rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden",
        isTraditional ? "border-blue-500/20" : "border-green-500/20"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border/50 flex justify-between items-center",
        isTraditional 
          ? "bg-gradient-to-r from-blue-500/10 to-transparent" 
          : "bg-gradient-to-r from-green-500/10 to-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isTraditional ? "bg-blue-500/20" : "bg-green-500/20"
          )}>
            {isTraditional ? (
              <Bot className={cn("w-5 h-5", "text-blue-500")} />
            ) : (
              <Sparkles className={cn("w-5 h-5", "text-green-500")} />
            )}
          </div>
          <div>
            <h3 className="font-semibold">
              {isTraditional ? 'Traditional Agent' : 'Ralph Loop Agent'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isTraditional ? 'Accumulating context' : 'Fresh context each time'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              agent?.status === 'completed' && "bg-green-500/10 text-green-500 border-green-500/20",
              agent?.status === 'running' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
              agent?.status === 'idle' && "bg-muted text-muted-foreground"
            )}
          >
            {agent?.status === 'running' && (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            )}
            {agent?.status || 'idle'}
          </Badge>
        </div>
      </div>

      {/* Context Size Bar */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Context Size</span>
          <span className={cn(
            "text-xs font-mono",
            isTraditional && contextPercent > 70 ? "text-red-500" : "text-muted-foreground"
          )}>
            {contextSize.toLocaleString()} chars
          </span>
        </div>
        <Progress 
          value={contextPercent} 
          className={cn(
            "h-2",
            isTraditional ? "[&>div]:bg-blue-500" : "[&>div]:bg-green-500"
          )}
        />
        {isTraditional && contextPercent > 70 && (
          <p className="text-xs text-red-500 mt-1">
            Context filling up - quality may degrade
          </p>
        )}
      </div>

      {/* Iterations List */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence mode="popLayout">
          {iterations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Waiting to start...
            </div>
          ) : (
            <div className="space-y-3">
              {[...iterations].reverse().map((iteration, idx) => {
                const StatusIcon = statusIcons[iteration.status] || AlertCircle;
                
                return (
                  <motion.div
                    key={iteration.iteration_number}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx === 0 ? 0 : 0 }}
                    data-testid={`iteration-card-${type}-${iteration.iteration_number}`}
                    className={cn(
                      "p-4 rounded-lg border bg-card",
                      iteration.status === 'success' && "border-green-500/30",
                      iteration.status === 'failure' && "border-red-500/30",
                      iteration.status === 'partial' && "border-yellow-500/30"
                    )}
                  >
                    {/* Iteration Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Iteration {iteration.iteration_number}
                        </span>
                        <StatusIcon className={cn(
                          "w-4 h-4",
                          statusColors[iteration.status]
                        )} />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {iteration.tokens_used} tokens
                      </span>
                    </div>

                    {/* Code Snippet */}
                    <div className="bg-muted/50 rounded-md p-3 mb-3 overflow-hidden">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-hidden">
                        {iteration.code_snippet}
                      </pre>
                    </div>

                    {/* Iteration Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Context: {iteration.context_size.toLocaleString()} chars</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          iteration.status === 'success' && "bg-green-500/10 text-green-500 border-green-500/20",
                          iteration.status === 'failure' && "bg-red-500/10 text-red-500 border-red-500/20",
                          iteration.status === 'partial' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}
                      >
                        {iteration.status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border/50 bg-muted/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{iterations.length}</p>
            <p className="text-xs text-muted-foreground">Iterations</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-500">{agent?.success_count || 0}</p>
            <p className="text-xs text-muted-foreground">Successes</p>
          </div>
          <div>
            <p className="text-lg font-bold">{(agent?.total_tokens || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
}

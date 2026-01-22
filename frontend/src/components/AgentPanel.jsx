import { Bot, Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useArenaStore } from '../store/arenaStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

// Helper function to detect code language from snippet
const detectLanguage = (code) => {
  if (!code) return 'javascript';
  
  const codeLower = code.toLowerCase();
  
  // Python detection
  if (codeLower.includes('def ') || codeLower.includes('import pandas') || 
      codeLower.includes('import numpy') || codeLower.includes('pytest')) {
    return 'python';
  }
  
  // JavaScript/TypeScript detection
  if (codeLower.includes('function') || codeLower.includes('const ') || 
      codeLower.includes('import ') || codeLower.includes('export ') ||
      codeLower.includes('require(') || codeLower.includes('module.exports')) {
    return 'javascript';
  }
  
  // JSX/React detection
  if (codeLower.includes('jsx') || codeLower.includes('react') || 
      codeLower.includes('usestate') || codeLower.includes('useeffect')) {
    return 'jsx';
  }
  
  // Default to JavaScript
  return 'javascript';
};

export function AgentPanel({ agent, type }) {
  const { streamingAgents, theme } = useArenaStore();
  const isTraditional = type === 'traditional';
  const contextSize = agent?.final_context_size || 0;
  // Use the same max context for both agents to make progress bars comparable
  // Traditional accumulates context, Ralph uses fresh context, but we want visual consistency
  const maxContext = 50000; // Same max for both to show accurate relative usage
  const contextPercent = Math.min((contextSize / maxContext) * 100, 100);
  const isStreaming = streamingAgents && streamingAgents[type] !== undefined;
  const streamingContent = streamingAgents?.[type] || '';
  const finalCode = agent?.final_code_snippet || '';
  const finalStatus = agent?.final_status || '';

  return (
    <div 
      data-testid={`agent-panel-${type}`}
      className={cn(
        "h-[600px] flex flex-col rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden transition-all w-full max-w-full min-w-0",
        isTraditional ? "border-blue-500/20" : "border-green-500/20",
        isStreaming && (isTraditional ? "glow-blue" : "glow-green")
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border/50 flex justify-between items-center min-w-0 w-full",
        isTraditional 
          ? "bg-gradient-to-r from-blue-500/10 to-transparent" 
          : "bg-gradient-to-r from-green-500/10 to-transparent"
      )}>
        <div className={cn("flex items-center gap-3 min-w-0 flex-1", isTraditional && "ml-2")}>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            isTraditional ? "bg-blue-500/20" : "bg-green-500/20"
          )}>
            {isTraditional ? (
              <Bot className={cn("w-5 h-5", "text-blue-500")} />
            ) : (
              <Sparkles className={cn("w-5 h-5", "text-green-500")} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">
              {isTraditional ? 'Traditional Agent' : 'Ralph Loop Agent'}
            </h3>
            <p className="text-xs text-muted-foreground italic font-normal truncate">
              {isTraditional ? 'Accumulating context' : 'Fresh context each time'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isStreaming && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Generating
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              agent?.status === 'completed' && "bg-green-500/10 text-green-500 border-green-500/20",
              agent?.status === 'running' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
              agent?.status === 'idle' && "bg-muted text-muted-foreground"
            )}
          >
            {agent?.status === 'running' && !isStreaming && (
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

      {/* Final Code Display */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isStreaming && streamingContent ? (
          // Streaming Preview - Fills entire space with green neon border
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            <div className="flex-1 flex flex-col min-h-0 border-2 border-green-500/30 rounded-lg bg-card p-4">
              <div className="px-0 py-2 flex items-center gap-2 flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Generating response...</span>
              </div>
              {/* Code Section - Takes remaining space, scrollable */}
              <div className="flex-1 overflow-hidden min-h-0 mb-3">
                <div className="bg-muted/50 rounded-md p-3 h-full overflow-y-auto overflow-x-hidden w-full max-w-full">
                  <div className="w-full max-w-full min-w-0">
                    <SyntaxHighlighter
                      language="javascript"
                      style={theme === 'dark' ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: 'transparent',
                        fontSize: '10px',
                        lineHeight: '1.4',
                        fontFamily: 'JetBrains Mono, monospace',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'visible',
                        display: 'block'
                      }}
                      PreTag="div"
                      showLineNumbers={false}
                      wrapLines={true}
                      wrapLongLines={true}
                    >
                      {streamingContent.slice(-500) + '▊'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
              {/* Footer - Fixed at bottom, never moves */}
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 min-w-0 flex-shrink-0 border-t border-border/30 pt-3 pb-0">
                <span className="truncate">Context: {contextSize.toLocaleString()} chars</span>
                <Badge 
                  variant="outline" 
                  className="text-xs flex-shrink-0 bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                >
                  generating
                </Badge>
              </div>
            </div>
          </div>
        ) : finalCode ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            <div className="flex-1 flex flex-col min-h-0 border-2 border-green-500/30 rounded-lg bg-card p-4">
              {/* Header */}
              <div className="px-0 py-2 flex items-center justify-between gap-2 min-w-0 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0 shrink">
                  <span className="text-sm font-semibold whitespace-nowrap">
                    Final Code
                  </span>
                  {finalStatus && (() => {
                    const StatusIcon = statusIcons[finalStatus] || AlertCircle;
                    return (
                      <StatusIcon className={cn(
                        "w-4 h-4 flex-shrink-0",
                        statusColors[finalStatus]
                      )} />
                    );
                  })()}
                </div>
              </div>

              {/* Code Snippet - Takes remaining space, scrollable inside */}
              <div className="flex-1 overflow-hidden min-h-0 mb-3">
                <div className="bg-muted/50 rounded-md p-3 h-full overflow-y-auto overflow-x-hidden w-full max-w-full">
                  <div className="w-full max-w-full min-w-0">
                    <SyntaxHighlighter
                      language={detectLanguage(finalCode)}
                      style={theme === 'dark' ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: 'transparent',
                        fontSize: '10px',
                        lineHeight: '1.4',
                        fontFamily: 'JetBrains Mono, monospace',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'visible',
                        display: 'block'
                      }}
                      PreTag="div"
                      showLineNumbers={false}
                      wrapLines={true}
                      wrapLongLines={true}
                    >
                      {finalCode || '// No code generated'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed at bottom, never moves */}
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 min-w-0 flex-shrink-0 border-t border-border/30 pt-3 pb-0">
                <span className="truncate">Context: {contextSize.toLocaleString()} chars</span>
                {finalStatus && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs flex-shrink-0",
                      finalStatus === 'success' && "bg-green-500/10 text-green-500 border-green-500/20",
                      finalStatus === 'failure' && "bg-red-500/10 text-red-500 border-red-500/20",
                      finalStatus === 'partial' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    )}
                  >
                    {finalStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Waiting to start...
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-border/50 bg-muted/10">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">{(agent?.total_tokens || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Tokens</p>
          </div>
          <div>
            <p className="text-lg font-bold">{((agent?.total_time_ms || 0) / 1000).toFixed(1)}s</p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </div>
          <div>
            <p className="text-lg font-bold">{finalStatus ? finalStatus : 'pending'}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </div>
      </div>
    </div>
  );
}

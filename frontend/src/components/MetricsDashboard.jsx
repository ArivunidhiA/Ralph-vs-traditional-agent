import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Legend 
} from 'recharts';
import { TrendingUp, Zap, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useArenaStore } from '../store/arenaStore';

export function MetricsDashboard() {
  const { battle, selectedTask } = useArenaStore();

  const metrics = useMemo(() => {
    if (!battle) return null;

    const traditional = battle.traditional_agent;
    const ralph = battle.ralph_agent;

    // Prepare context size data for chart
    const maxLength = Math.max(
      traditional.iterations?.length || 0,
      ralph.iterations?.length || 0
    );

    const contextData = [];
    const tokensData = [];
    
    for (let i = 0; i < maxLength; i++) {
      contextData.push({
        iteration: i + 1,
        Traditional: traditional.iterations?.[i]?.context_size || 0,
        Ralph: ralph.iterations?.[i]?.context_size || 0,
      });
      
      // Tokens per iteration - KEY comparison showing Traditional grows, Ralph stays flat
      tokensData.push({
        iteration: i + 1,
        Traditional: traditional.iterations?.[i]?.tokens_used || 0,
        Ralph: ralph.iterations?.[i]?.tokens_used || 0,
      });
    }

    // Calculate averages
    const traditionalAvgTokens = traditional.iterations?.length > 0
      ? Math.round(traditional.iterations.reduce((sum, i) => sum + i.tokens_used, 0) / traditional.iterations.length)
      : 0;
    
    const ralphAvgTokens = ralph.iterations?.length > 0
      ? Math.round(ralph.iterations.reduce((sum, i) => sum + i.tokens_used, 0) / ralph.iterations.length)
      : 0;

    const traditionalAvgTime = traditional.iterations?.length > 0
      ? Math.round(traditional.iterations.reduce((sum, i) => sum + (i.time_taken_ms || 0), 0) / traditional.iterations.length)
      : 0;
    
    const ralphAvgTime = ralph.iterations?.length > 0
      ? Math.round(ralph.iterations.reduce((sum, i) => sum + (i.time_taken_ms || 0), 0) / ralph.iterations.length)
      : 0;

    // Token efficiency: success per token
    const traditionalEfficiency = traditional.total_tokens > 0 
      ? ((traditional.success_count / traditional.total_tokens) * 10000).toFixed(2)
      : 0;
    
    const ralphEfficiency = ralph.total_tokens > 0 
      ? ((ralph.success_count / ralph.total_tokens) * 10000).toFixed(2)
      : 0;

    return {
      traditional: {
        iterations: traditional.iterations?.length || 0,
        successRate: traditional.iterations?.length > 0
          ? ((traditional.success_count / traditional.iterations.length) * 100).toFixed(0)
          : 0,
        totalTokens: traditional.total_tokens || 0,
        avgTokens: traditionalAvgTokens,
        avgTime: traditionalAvgTime,
        efficiency: traditionalEfficiency,
        avgContext: traditional.iterations?.length > 0
          ? Math.round(
              traditional.iterations.reduce((sum, i) => sum + i.context_size, 0) / 
              traditional.iterations.length
            )
          : 0,
      },
      ralph: {
        iterations: ralph.iterations?.length || 0,
        successRate: ralph.iterations?.length > 0
          ? ((ralph.success_count / ralph.iterations.length) * 100).toFixed(0)
          : 0,
        totalTokens: ralph.total_tokens || 0,
        avgTokens: ralphAvgTokens,
        avgTime: ralphAvgTime,
        efficiency: ralphEfficiency,
        avgContext: ralph.iterations?.length > 0
          ? Math.round(
              ralph.iterations.reduce((sum, i) => sum + i.context_size, 0) / 
              ralph.iterations.length
            )
          : 0,
      },
      contextData,
      tokensData,
    };
  }, [battle]);

  if (!selectedTask) return null;

  return (
    <section className="py-8" data-testid="metrics-dashboard">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <h2 className="text-2xl font-bold mb-6">Battle Metrics</h2>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Iterations Comparison */}
          <Card data-testid="metric-iterations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Iterations</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {metrics?.traditional.iterations || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {metrics?.ralph.iterations || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Tokens per Iteration */}
          <Card data-testid="metric-avg-tokens">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Tokens/Iter</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {(metrics?.traditional.avgTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {(metrics?.ralph.avgTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
              {metrics?.traditional.avgTokens > metrics?.ralph.avgTokens && (
                <p className="text-xs text-green-500 mt-2">
                  Ralph uses {Math.round(((metrics.traditional.avgTokens - metrics.ralph.avgTokens) / metrics.traditional.avgTokens) * 100)}% fewer tokens
                </p>
              )}
            </CardContent>
          </Card>

          {/* Avg Time per Iteration */}
          <Card data-testid="metric-avg-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time/Iter</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {((metrics?.traditional.avgTime || 0) / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {((metrics?.ralph.avgTime || 0) / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Efficiency */}
          <Card data-testid="metric-efficiency">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Token Efficiency</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {metrics?.traditional.efficiency || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {metrics?.ralph.efficiency || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Success per 10k tokens
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Context Size Over Time */}
          <Card data-testid="chart-context-size">
            <CardHeader>
              <CardTitle className="text-lg">Context Size Growth</CardTitle>
              <p className="text-sm text-muted-foreground">
                Traditional context bloats, Ralph stays lean
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {metrics?.contextData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.contextData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="iteration" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{ value: 'Iteration', position: 'bottom', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Characters', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => [`${value.toLocaleString()} chars`, '']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="Traditional" 
                        stroke="#3b82f6" 
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Ralph" 
                        stroke="#22c55e" 
                        fill="#22c55e"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Start the battle to see metrics
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tokens per Iteration - The KEY insight chart */}
          <Card data-testid="chart-tokens-per-iteration">
            <CardHeader>
              <CardTitle className="text-lg">Tokens per Iteration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Traditional uses more tokens as context grows
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {metrics?.tokensData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.tokensData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="iteration" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{ value: 'Iteration', position: 'bottom', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value.toLocaleString()}
                        label={{ value: 'Tokens', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => [`${value.toLocaleString()} tokens`, '']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Traditional" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Ralph" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Start the battle to see metrics
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

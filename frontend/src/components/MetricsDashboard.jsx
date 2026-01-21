import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
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
    for (let i = 0; i < maxLength; i++) {
      contextData.push({
        iteration: i + 1,
        Traditional: traditional.iterations?.[i]?.context_size || 0,
        Ralph: ralph.iterations?.[i]?.context_size || 0,
      });
    }

    // Success rate comparison
    const successData = [
      {
        name: 'Traditional',
        Success: traditional.success_count || 0,
        Failure: traditional.failure_count || 0,
      },
      {
        name: 'Ralph Loop',
        Success: ralph.success_count || 0,
        Failure: ralph.failure_count || 0,
      },
    ];

    return {
      traditional: {
        iterations: traditional.iterations?.length || 0,
        successRate: traditional.iterations?.length > 0
          ? ((traditional.success_count / traditional.iterations.length) * 100).toFixed(0)
          : 0,
        totalTokens: traditional.total_tokens || 0,
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
        avgContext: ralph.iterations?.length > 0
          ? Math.round(
              ralph.iterations.reduce((sum, i) => sum + i.context_size, 0) / 
              ralph.iterations.length
            )
          : 0,
      },
      contextData,
      successData,
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

          {/* Success Rate */}
          <Card data-testid="metric-success-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {metrics?.traditional.successRate || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {metrics?.ralph.successRate || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Tokens */}
          <Card data-testid="metric-tokens">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {(metrics?.traditional.totalTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {(metrics?.ralph.totalTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Context Size */}
          <Card data-testid="metric-context">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Context</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {(metrics?.traditional.avgContext || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {(metrics?.ralph.avgContext || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Context Size Over Time */}
          <Card data-testid="chart-context-size">
            <CardHeader>
              <CardTitle className="text-lg">Context Size Over Iterations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {metrics?.contextData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.contextData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="iteration" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Traditional" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Ralph" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', strokeWidth: 2 }}
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

          {/* Success/Failure Comparison */}
          <Card data-testid="chart-success-rate">
            <CardHeader>
              <CardTitle className="text-lg">Success vs Failure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {metrics?.successData?.some(d => d.Success > 0 || d.Failure > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.successData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Bar dataKey="Success" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Failure" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
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

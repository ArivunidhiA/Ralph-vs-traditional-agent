import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { Zap, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useArenaStore } from '../store/arenaStore';

export function MetricsDashboard() {
  const { battle, selectedTask } = useArenaStore();

  const metrics = useMemo(() => {
    if (!battle) return null;

    const traditional = battle.traditional_agent;
    const ralph = battle.ralph_agent;

    // Calculate success rate based on final status
    const traditionalSuccess = traditional.final_status === 'success' ? 1 : 0;
    const ralphSuccess = ralph.final_status === 'success' ? 1 : 0;

    // Prepare data for charts
    const tokensData = [
      {
        name: 'Tokens',
        Traditional: traditional.total_tokens || 0,
        Ralph: ralph.total_tokens || 0,
      }
    ];

    const timeData = [
      {
        name: 'Time (s)',
        Traditional: (traditional.total_time_ms || 0) / 1000,
        Ralph: (ralph.total_time_ms || 0) / 1000,
      }
    ];

    const contextData = [
      {
        name: 'Context Size',
        Traditional: traditional.final_context_size || 0,
        Ralph: ralph.final_context_size || 0,
      }
    ];

    const successData = [
      {
        name: 'Success',
        Traditional: traditionalSuccess ? 100 : 0,
        Ralph: ralphSuccess ? 100 : 0,
      }
    ];

    return {
      traditional: {
        totalTokens: traditional.total_tokens || 0,
        totalTime: traditional.total_time_ms || 0,
        success: traditionalSuccess,
        finalStatus: traditional.final_status || '',
        finalContextSize: traditional.final_context_size || 0,
      },
      ralph: {
        totalTokens: ralph.total_tokens || 0,
        totalTime: ralph.total_time_ms || 0,
        success: ralphSuccess,
        finalStatus: ralph.final_status || '',
        finalContextSize: ralph.final_context_size || 0,
      },
      tokensData,
      timeData,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Total Tokens */}
          <Card data-testid="metric-total-tokens">
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
                  <p className="text-xs text-muted-foreground italic font-normal">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {(metrics?.ralph.totalTokens || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground italic font-normal">Ralph</p>
                </div>
              </div>
              {metrics?.traditional.totalTokens > metrics?.ralph.totalTokens && (
                <p className="text-xs text-green-500 mt-2">
                  Ralph uses {Math.round(((metrics.traditional.totalTokens - metrics.ralph.totalTokens) / metrics.traditional.totalTokens) * 100)}% fewer tokens
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Time */}
          <Card data-testid="metric-total-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-500">
                    {((metrics?.traditional.totalTime || 0) / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground italic font-normal">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {((metrics?.ralph.totalTime || 0) / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground italic font-normal">Ralph</p>
                </div>
              </div>
              {metrics?.traditional.totalTime > metrics?.ralph.totalTime && (
                <p className="text-xs text-green-500 mt-2">
                  Ralph is {Math.round(((metrics.traditional.totalTime - metrics.ralph.totalTime) / metrics.traditional.totalTime) * 100)}% faster
                </p>
              )}
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
                    {metrics?.traditional.success ? '100%' : '0%'}
                  </p>
                  <p className="text-xs text-muted-foreground italic font-normal">Traditional</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {metrics?.ralph.success ? '100%' : '0%'}
                  </p>
                  <p className="text-xs text-muted-foreground italic font-normal">Ralph</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Tokens Comparison */}
          <Card data-testid="chart-total-tokens">
            <CardHeader>
              <CardTitle className="text-lg">Total Tokens Comparison</CardTitle>
              <p className="text-sm text-muted-foreground italic font-normal">
                Compare total token usage between agents
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {metrics?.tokensData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.tokensData} margin={{ top: 10, right: 10, bottom: 10, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => value.toLocaleString()}
                        label={{ value: 'Tokens', angle: -90, position: 'insideLeft', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
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
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '30px',
                          paddingBottom: '10px',
                          paddingLeft: '70px'
                        }}
                        iconType="rect"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Bar 
                        dataKey="Ralph" 
                        fill="#22c55e" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="Traditional" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]}
                      />
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

          {/* Total Time Comparison */}
          <Card data-testid="chart-total-time">
            <CardHeader>
              <CardTitle className="text-lg">Total Time Comparison</CardTitle>
              <p className="text-sm text-muted-foreground italic font-normal">
                Compare total execution time between agents
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {metrics?.timeData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.timeData} margin={{ top: 10, right: 10, bottom: 10, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => [`${value}s`, '']}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '30px',
                          paddingBottom: '10px',
                          paddingLeft: '70px'
                        }}
                        iconType="rect"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Bar 
                        dataKey="Ralph" 
                        fill="#22c55e" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="Traditional" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]}
                      />
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

          {/* Context Size Comparison */}
          <Card data-testid="chart-context-size">
            <CardHeader>
              <CardTitle className="text-lg">Final Context Size Comparison</CardTitle>
              <p className="text-sm text-muted-foreground italic font-normal">
                Compare final context size between agents
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {metrics?.contextData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.contextData} margin={{ top: 10, right: 10, bottom: 10, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Characters', angle: -90, position: 'insideLeft', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
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
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '30px',
                          paddingBottom: '10px',
                          paddingLeft: '70px'
                        }}
                        iconType="rect"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Bar 
                        dataKey="Ralph" 
                        fill="#22c55e" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="Traditional" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]}
                      />
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

          {/* Success Rate Comparison */}
          <Card data-testid="chart-success-rate">
            <CardHeader>
              <CardTitle className="text-lg">Success Rate Comparison</CardTitle>
              <p className="text-sm text-muted-foreground italic font-normal">
                Compare success rates between agents
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {metrics?.successData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.successData} margin={{ top: 10, right: 10, bottom: 10, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        domain={[0, 100]}
                        label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', offset: -10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value) => [`${value}%`, '']}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '30px',
                          paddingBottom: '10px',
                          paddingLeft: '70px'
                        }}
                        iconType="rect"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Bar 
                        dataKey="Ralph" 
                        fill="#22c55e" 
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="Traditional" 
                        fill="#3b82f6" 
                        radius={[8, 8, 0, 0]}
                      />
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

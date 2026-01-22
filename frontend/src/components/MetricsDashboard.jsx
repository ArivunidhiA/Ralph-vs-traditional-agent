import { useMemo } from 'react';
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

    return {
      traditional: {
        totalTokens: traditional.total_tokens || 0,
        totalTime: traditional.total_time_ms || 0,
        success: traditionalSuccess,
        finalStatus: traditional.final_status || '',
      },
      ralph: {
        totalTokens: ralph.total_tokens || 0,
        totalTime: ralph.total_time_ms || 0,
        success: ralphSuccess,
        finalStatus: ralph.final_status || '',
      },
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
      </div>
    </section>
  );
}

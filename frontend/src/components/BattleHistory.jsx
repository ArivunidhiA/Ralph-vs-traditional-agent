import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useArenaStore } from '../store/arenaStore';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { exportBattleToPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import axios from 'axios';

const statusIcons = {
  completed: CheckCircle2,
  running: Loader2,
  idle: AlertCircle,
};

const statusColors = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  running: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  idle: 'bg-muted text-muted-foreground',
};

const winnerColors = {
  traditional: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ralph: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const taskNames = {
  'rest-api': 'REST API',
  'todo-component': 'React Todo Component',
  'data-processor': 'Data Processing Script',
  'unit-tests': 'Unit Test Suite',
  'auth-middleware': 'Authentication Middleware',
};

export function BattleHistory() {
  const { battles, fetchBattles, loading, tasks } = useArenaStore();
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  useEffect(() => {
    fetchBattles();
  }, [fetchBattles]);

  const handleExportBattle = async (battle) => {
    try {
      // Fetch full battle details
      const response = await axios.get(`${API}/battles/${battle.id}`);
      const fullBattle = response.data;
      
      // Find task details
      const task = tasks.find(t => t.id === fullBattle.task_id);
      
      exportBattleToPDF(fullBattle, task);
      toast.success('Battle report exported successfully');
    } catch (error) {
      toast.error('Failed to export battle report: ' + error.message);
    }
  };

  const getTaskName = (taskId) => {
    return taskNames[taskId] || taskId;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (loading && battles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="pb-32">
          <section className="py-8" data-testid="battle-history-loading">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold">Battle History</h1>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-32">
        <section className="py-8" data-testid="battle-history">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Battle History</h1>
                <p className="text-muted-foreground">
                  View past battles and their results
                </p>
              </div>
            </div>

            {/* Battles List */}
            {battles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No battles yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a battle to see it appear here
                  </p>
                  <Button asChild>
                    <Link to="/">Start a Battle</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {battles.map((battle) => {
                  const StatusIcon = statusIcons[battle.status] || AlertCircle;
                  const traditional = battle.traditional_agent || {};
                  const ralph = battle.ralph_agent || {};

                  return (
                    <Card
                      key={battle.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">
                              {getTaskName(battle.task_id)}
                            </CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <StatusIcon
                                className={cn(
                                  "w-4 h-4",
                                  battle.status === 'completed' && "text-green-500",
                                  battle.status === 'running' && "text-yellow-500 animate-spin",
                                  battle.status === 'idle' && "text-muted-foreground"
                                )}
                              />
                              <Badge
                                variant="outline"
                                className={cn("text-xs", statusColors[battle.status])}
                              >
                                {battle.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {battle.winner && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs", winnerColors[battle.winner])}
                              >
                                <Trophy className="w-3 h-3 mr-1" />
                                {battle.winner === 'ralph' ? 'Ralph Wins' : 'Traditional Wins'}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportBattle(battle);
                              }}
                              title="Export as PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Traditional</p>
                              <p className="font-semibold">
                                {(traditional.total_tokens || 0).toLocaleString()} tokens
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {traditional.final_status || 'pending'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Ralph Loop</p>
                              <p className="font-semibold">
                                {(ralph.total_tokens || 0).toLocaleString()} tokens
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ralph.final_status || 'pending'}
                              </p>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(battle.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

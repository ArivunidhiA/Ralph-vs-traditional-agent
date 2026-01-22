import { Moon, Sun, Swords, History } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useArenaStore } from '../store/arenaStore';
import { cn } from '../lib/utils';

export function Header() {
  const { theme, setTheme } = useArenaStore();
  const location = useLocation();
  const isHistoryPage = location.pathname === '/history';

  return (
    <header 
      data-testid="header"
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3" data-testid="logo">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Ralph Loop Arena
            </h1>
            <p className="text-xs text-muted-foreground italic font-normal">
              AI Coding Battle Visualizer
            </p>
          </div>
        </Link>

        {/* Navigation & Theme Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={isHistoryPage ? "default" : "ghost"}
            size="sm"
            asChild
            className={cn(
              "h-9",
              isHistoryPage && "bg-primary text-primary-foreground"
            )}
          >
            <Link to="/history">
              <History className="h-4 w-4 mr-2" />
              History
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="theme-toggle"
            className="h-10 w-10 rounded-full"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 transition-all" />
            ) : (
              <Moon className="h-5 w-5 transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

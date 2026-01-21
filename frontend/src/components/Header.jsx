import { Moon, Sun, Swords } from 'lucide-react';
import { Button } from './ui/button';
import { useArenaStore } from '../store/arenaStore';

export function Header() {
  const { theme, setTheme } = useArenaStore();

  return (
    <header 
      data-testid="header"
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3" data-testid="logo">
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
            <p className="text-xs text-muted-foreground">
              AI Coding Battle Visualizer
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
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
    </header>
  );
}

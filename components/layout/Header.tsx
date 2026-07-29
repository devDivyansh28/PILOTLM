"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>Search sources, notebooks...</span>
        </div>

        <ModeToggle />

        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
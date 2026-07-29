"use client";

import React from "react";
import { Menu, Search, Notebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [notebooks, setNotebooks] = React.useState<{ id: string; title: string }[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (open) {
      fetch("/api/notebooks")
        .then((r) => r.json())
        .then(setNotebooks)
        .catch(() => {});
    }
  }, [open]);

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
        <button
          onClick={() => setOpen(true)}
          className="hidden sm:flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-muted-foreground hover:bg-accent/80 transition-colors"
          aria-label="Search notebooks"
        >
          <Search className="h-4 w-4" />
          <span>Search notebooks... </span>
          <kbd className="ml-auto hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl+K
          </kbd>
        </button>

        <ModeToggle />

        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search notebooks and sources..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Notebooks">
            {notebooks.map((nb) => (
              <CommandItem
                key={nb.id}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/notebooks/${nb.id}`);
                }}
              >
                <Notebook className="mr-2 h-4 w-4" />
                <span>{nb.title}</span>
              </CommandItem>
            ))}
            {notebooks.length === 0 && (
              <CommandItem disabled>No notebooks yet</CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

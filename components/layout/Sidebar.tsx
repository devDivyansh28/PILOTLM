"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Plus, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@clerk/nextjs";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const navigation = [
    { name: "Notebooks", href: "/notebooks", icon: FolderOpen },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-lg transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-4 border-b">
            <Link href="/dashboard/notebooks" className="flex items-center gap-2 font-semibold text-lg">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span>PilotLM</span>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t">
            <Dialog>
              <DialogTrigger>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  New Notebook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Notebook</DialogTitle>
                </DialogHeader>
                <CreateNotebookForm onClose={onClose} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-3 border-t">
            <SignOutButton redirectUrl="/sign-in">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </aside>
    </>
  );
}

function CreateNotebookForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (res.ok) {
        const notebook = await res.json();
        setTitle("");
        onClose();
        window.location.href = `/dashboard/notebooks/${notebook.id}`;
      }
    } catch (error) {
      console.error("Failed to create notebook:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-4">
        <Label htmlFor="title" className="block mb-2">
          Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Research Notebook"
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim()}>
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
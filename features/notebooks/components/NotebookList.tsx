"use client";

import React from "react";
import { Plus, Trash2, Edit } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface NotebookListProps {
  notebooks: Array<{
    id: string;
    title: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    _count: { sources: number; chats: number };
  }>;
}

export function NotebookList({ notebooks }: NotebookListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");

  const handleEdit = (notebook: NotebookListProps["notebooks"][0]) => {
    setEditingId(notebook.id);
    setEditTitle(notebook.title);
  };

  const handleSave = async (id: string) => {
    if (!editTitle.trim()) return;
    
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      
      if (res.ok) {
        setEditingId(null);
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update notebook:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notebook? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
    } catch (error) {
      console.error("Failed to delete notebook:", error);
    }
  };

  if (notebooks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No notebooks yet</p>
        <Dialog>
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Notebook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notebook</DialogTitle>
            </DialogHeader>
            <CreateNotebookForm />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {notebooks.map((notebook) => (
        <Card key={notebook.id} className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            {editingId === notebook.id ? (
              <div className="flex gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave(notebook.id)}
                  onBlur={() => handleSave(notebook.id)}
                  autoFocus
                />
                <Button size="sm" onClick={() => handleSave(notebook.id)}>
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg truncate">{notebook.title}</CardTitle>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleEdit(notebook); }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(notebook.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{notebook._count.sources} sources</span>
              <span>{notebook._count.chats} chats</span>
              <span>{format(new Date(notebook.updatedAt instanceof Date ? notebook.updatedAt : new Date(notebook.updatedAt)), "MMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateNotebookForm() {
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
        <Button type="button" variant="outline" onClick={() => setTitle("")}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim()}>
          Create
        </Button>
      </DialogFooter>
    </form>
  );
}
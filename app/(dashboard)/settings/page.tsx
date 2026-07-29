"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>{user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-lg">{user?.fullName || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            <Badge variant="outline" className="mt-1">Signed in via Clerk</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
          </div>
          <ModeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>OpenAI</span>
            <Badge variant="outline">Configured server-side</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Cohere (Reranker)</span>
            <Badge variant="outline">Configured server-side</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Qdrant (Vector DB)</span>
            <Badge variant="outline">Connected server-side</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CreateEventFormProps {
  createdBy: string;
}

export function CreateEventForm({ createdBy }: CreateEventFormProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: formData.get("title"),
        date: new Date(String(formData.get("date"))).toISOString(),
        location: formData.get("location"),
        createdBy,
      }),
    });

    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    setMessage(result?.message ?? (response.ok ? "Event created. Refresh to see latest data." : "Unable to create event."));

    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-lg font-semibold text-white">Create event</p>
        <p className="text-sm text-slate-400">Admins can create events for the full team.</p>
      </div>
      <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
        <Input name="title" placeholder="Summer reception" required />
        <Input name="date" type="datetime-local" required />
        <Input name="location" placeholder="Mumbai Convention Hall" required />
        <div className="md:col-span-3 flex items-center gap-3">
          <Button type="submit">Save event</Button>
          {message ? <p className="text-sm text-slate-400">{message}</p> : null}
        </div>
      </form>
    </Card>
  );
}

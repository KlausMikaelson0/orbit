"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/utils";
import { useChannelTasks } from "@/src/hooks/use-channel-tasks";
import type { OrbitTaskStatus } from "@/src/types/orbit";

interface ChannelTasksPanelProps {
  channelId: string | null;
  profileId: string | null;
}

const taskStatuses: OrbitTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function statusLabel(status: OrbitTaskStatus) {
  if (status === "TODO") return "Todo";
  if (status === "IN_PROGRESS") return "In Progress";
  return "Done";
}

export function ChannelTasksPanel({ channelId, profileId }: ChannelTasksPanelProps) {
  const { tasks, loadingTasks, taskError, addTask, setTaskStatus, removeTask } =
    useChannelTasks(channelId, profileId);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    const map: Record<OrbitTaskStatus, typeof tasks> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of tasks) {
      map[task.status].push(task);
    }
    return map;
  }, [tasks]);

  async function onAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    const result = await addTask(newTask);
    if (result.error) {
      setActionError(result.error);
      setSaving(false);
      return;
    }
    setNewTask("");
    setSaving(false);
  }

  async function onSetTaskStatus(taskId: string, status: OrbitTaskStatus) {
    setActionError(null);
    setBusyTaskId(taskId);
    const result = await setTaskStatus(taskId, status);
    if (result.error) {
      setActionError(result.error);
    }
    setBusyTaskId(null);
  }

  async function onRemoveTask(taskId: string) {
    setActionError(null);
    setBusyTaskId(taskId);
    const result = await removeTask(taskId);
    if (result.error) {
      setActionError(result.error);
    }
    setBusyTaskId(null);
  }

  if (!channelId) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-zinc-400">
        Select a channel to open channel tasks.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Productivity</p>
        <h3 className="text-lg font-semibold text-violet-100">Channel Tasks</h3>
      </div>

      <form className="mb-3 flex items-center gap-2" onSubmit={onAddTask}>
        <Input
          className="h-11 rounded-xl border-white/15 bg-black/35"
          onChange={(event) => setNewTask(event.target.value)}
          placeholder="Add a task for this channel..."
          value={newTask}
        />
        <Button
          className="h-11 rounded-xl px-4"
          disabled={saving || !newTask.trim()}
          type="submit"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add
        </Button>
      </form>

      {taskError || actionError ? (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {taskError ?? actionError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/25 p-3">
        {loadingTasks ? (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : (
          <div className="grid min-h-0 gap-3 md:grid-cols-3">
            {taskStatuses.map((status) => (
              <section
                className="min-h-[220px] rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                key={status}
              >
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">
                  {statusLabel(status)} · {groupedTasks[status].length}
                </p>

                <div className="space-y-2">
                  {groupedTasks[status].map((task) => {
                    const creator =
                      task.creator?.full_name ??
                      task.creator?.username ??
                      "Orbit User";
                    const isBusy = busyTaskId === task.id;
                    return (
                      <article
                        className="rounded-lg border border-white/10 bg-black/30 p-2.5"
                        key={task.id}
                      >
                        <p className="mb-1 text-sm text-zinc-100">{task.content}</p>
                        <p className="mb-2 text-[11px] text-zinc-500">
                          by {creator} · {formatTime(task.created_at)}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {taskStatuses.map((nextStatus) => (
                            <Button
                              className="h-7 rounded-full px-2.5 text-[11px]"
                              disabled={isBusy}
                              key={nextStatus}
                              onClick={() => void onSetTaskStatus(task.id, nextStatus)}
                              size="sm"
                              type="button"
                              variant={task.status === nextStatus ? "default" : "secondary"}
                            >
                              {nextStatus === "DONE" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Circle className="h-3.5 w-3.5" />
                              )}
                              {statusLabel(nextStatus)}
                            </Button>
                          ))}
                          <Button
                            className="h-7 rounded-full px-2.5 text-[11px]"
                            disabled={isBusy}
                            onClick={() => void onRemoveTask(task.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {groupedTasks[status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-8 text-center text-xs text-zinc-500">
                    No tasks
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

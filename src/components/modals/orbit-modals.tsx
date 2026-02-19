"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useModal } from "@/src/hooks/use-modal";
import type { ChannelType } from "@/src/types/orbit";

interface ActionResult {
  error?: string;
}

interface OrbitModalsProps {
  createServer: (values: {
    name: string;
    imageUrl?: string;
  }) => Promise<ActionResult>;
  createChannel: (values: {
    serverId: string;
    name: string;
    type: ChannelType;
  }) => Promise<ActionResult>;
  joinServerByInvite: (inviteCode: string) => Promise<ActionResult>;
}

export function OrbitModals({
  createServer,
  createChannel,
  joinServerByInvite,
}: OrbitModalsProps) {
  const { isOpen, type, data, onClose } = useModal();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverName, setServerName] = useState("");
  const [serverImage, setServerImage] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("TEXT");
  const [inviteCode, setInviteCode] = useState("");

  const createServerOpen = isOpen && type === "createServer";
  const createChannelOpen = isOpen && type === "createChannel";
  const joinServerOpen = isOpen && type === "joinServer";

  const modalServerId = useMemo(() => data.serverId ?? null, [data.serverId]);

  function resetAndClose() {
    setError(null);
    setSubmitting(false);
    setServerName("");
    setServerImage("");
    setChannelName("");
    setChannelType("TEXT");
    setInviteCode("");
    onClose();
  }

  async function submitCreateServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createServer({
      name: serverName,
      imageUrl: serverImage,
    });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  async function submitCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalServerId) {
      setError("No server selected.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createChannel({
      serverId: modalServerId,
      name: channelName,
      type: channelType,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  async function submitJoinServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await joinServerByInvite(inviteCode);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  return (
    <>
      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={createServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new Orbit server</DialogTitle>
            <DialogDescription>
              Start a collaboration hub with instant invite sharing.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitCreateServer}>
            <Input
              onChange={(event) => setServerName(event.target.value)}
              placeholder="Server name"
              value={serverName}
            />
            <Input
              onChange={(event) => setServerImage(event.target.value)}
              placeholder="Image URL (optional)"
              value={serverImage}
            />
            {error ? (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button onClick={resetAndClose} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={createChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create channel</DialogTitle>
            <DialogDescription>
              Add text, audio, or video channels to your server.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitCreateChannel}>
            <Input
              onChange={(event) => setChannelName(event.target.value)}
              placeholder="Channel name"
              value={channelName}
            />
            <div className="grid grid-cols-3 gap-2">
              {(["TEXT", "AUDIO", "VIDEO"] as ChannelType[]).map((typeOption) => (
                <Button
                  className="rounded-lg"
                  key={typeOption}
                  onClick={() => setChannelType(typeOption)}
                  type="button"
                  variant={channelType === typeOption ? "default" : "secondary"}
                >
                  {typeOption}
                </Button>
              ))}
            </div>
            {error ? (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button onClick={resetAndClose} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={joinServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a server</DialogTitle>
            <DialogDescription>
              Enter an invite code to join an Orbit workspace.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitJoinServer}>
            <Input
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              value={inviteCode}
            />
            {error ? (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button onClick={resetAndClose} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Join
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, MessageCircle, Pin, RefreshCw, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import type { OrbitForumPost, OrbitForumReply, OrbitForumTag } from "@/src/types/orbit";

interface OrbitForumViewProps {
  serverId: string;
  channelId: string;
  profileId: string | null;
}

interface ForumPostTagRow {
  post_id: string;
  tag_id: string;
}

function slugifyTagLabel(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function OrbitForumView({ serverId, channelId, profileId }: OrbitForumViewProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [posts, setPosts] = useState<OrbitForumPost[]>([]);
  const [tags, setTags] = useState<OrbitForumTag[]>([]);
  const [replies, setReplies] = useState<OrbitForumReply[]>([]);
  const [postTagRows, setPostTagRows] = useState<ForumPostTagRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagLabel, setTagLabel] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])) as Record<string, OrbitForumTag>,
    [tags],
  );
  const postTagsByPostId = useMemo(() => {
    const grouped: Record<string, OrbitForumTag[]> = {};
    postTagRows.forEach((row) => {
      const tag = tagsById[row.tag_id];
      if (!tag) {
        return;
      }
      grouped[row.post_id] = [...(grouped[row.post_id] ?? []), tag];
    });
    return grouped;
  }, [postTagRows, tagsById]);
  const repliesByPostId = useMemo(() => {
    const grouped: Record<string, OrbitForumReply[]> = {};
    replies.forEach((reply) => {
      grouped[reply.post_id] = [...(grouped[reply.post_id] ?? []), reply];
    });
    return grouped;
  }, [replies]);

  const fetchForumState = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [postsResult, tagsResult] = await Promise.all([
      supabase
        .from("forum_posts")
        .select("*")
        .eq("channel_id", channelId)
        .order("pinned", { ascending: false })
        .order("last_activity_at", { ascending: false }),
      supabase.from("forum_tags").select("*").eq("server_id", serverId).order("label"),
    ]);

    if (postsResult.error) {
      setError(postsResult.error.message);
      setLoading(false);
      return;
    }
    if (tagsResult.error) {
      setError(tagsResult.error.message);
      setLoading(false);
      return;
    }

    const nextPosts = (postsResult.data ?? []) as OrbitForumPost[];
    setPosts(nextPosts);
    setTags((tagsResult.data ?? []) as OrbitForumTag[]);

    const postIds = nextPosts.map((post) => post.id);
    if (!postIds.length) {
      setPostTagRows([]);
      setReplies([]);
      setLoading(false);
      return;
    }

    const [postTagsResult, repliesResult] = await Promise.all([
      supabase.from("forum_post_tags").select("post_id, tag_id").in("post_id", postIds),
      supabase.from("forum_replies").select("*").in("post_id", postIds).order("created_at"),
    ]);

    if (postTagsResult.error) {
      setError(postTagsResult.error.message);
      setLoading(false);
      return;
    }
    if (repliesResult.error) {
      setError(repliesResult.error.message);
      setLoading(false);
      return;
    }

    setPostTagRows((postTagsResult.data ?? []) as ForumPostTagRow[]);
    setReplies((repliesResult.data ?? []) as OrbitForumReply[]);
    setLoading(false);
  }, [channelId, serverId, supabase]);

  useEffect(() => {
    void fetchForumState();
  }, [fetchForumState]);

  async function createTag() {
    const normalizedLabel = tagLabel.trim();
    if (!normalizedLabel || !profileId) {
      return;
    }

    const baseSlug = slugifyTagLabel(normalizedLabel);
    if (!baseSlug) {
      setError("Tag label must contain letters or numbers.");
      return;
    }

    setWorkingKey("create-tag");
    setError(null);
    setSuccess(null);

    const { error: insertError } = await supabase.from("forum_tags").insert({
      server_id: serverId,
      slug: baseSlug,
      label: normalizedLabel,
      created_by: profileId,
    });

    if (insertError) {
      setError(insertError.message);
      setWorkingKey(null);
      return;
    }

    setTagLabel("");
    setSuccess("Tag created.");
    await fetchForumState();
    setWorkingKey(null);
  }

  async function createPost() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody || !profileId) {
      return;
    }

    setWorkingKey("create-post");
    setError(null);
    setSuccess(null);

    const { data: post, error: postError } = await supabase
      .from("forum_posts")
      .insert({
        server_id: serverId,
        channel_id: channelId,
        author_profile_id: profileId,
        title: trimmedTitle,
        body: trimmedBody,
      })
      .select("*")
      .single();

    if (postError || !post) {
      setError(postError?.message ?? "Unable to create forum post.");
      setWorkingKey(null);
      return;
    }

    if (selectedTagIds.length) {
      const { error: tagsError } = await supabase.from("forum_post_tags").insert(
        selectedTagIds.map((tagId) => ({
          post_id: post.id,
          tag_id: tagId,
        })),
      );
      if (tagsError) {
        setError(tagsError.message);
        setWorkingKey(null);
        return;
      }
    }

    setTitle("");
    setBody("");
    setSelectedTagIds([]);
    setSuccess("Thread created.");
    await fetchForumState();
    setWorkingKey(null);
  }

  async function createReply(postId: string) {
    const draft = (replyDrafts[postId] ?? "").trim();
    if (!draft || !profileId) {
      return;
    }

    setWorkingKey(`reply:${postId}`);
    setError(null);
    setSuccess(null);

    const { error: replyError } = await supabase.from("forum_replies").insert({
      post_id: postId,
      author_profile_id: profileId,
      body: draft,
    });

    if (replyError) {
      setError(replyError.message);
      setWorkingKey(null);
      return;
    }

    setReplyDrafts((current) => ({ ...current, [postId]: "" }));
    await fetchForumState();
    setWorkingKey(null);
  }

  async function togglePostField(post: OrbitForumPost, field: "pinned" | "locked") {
    setWorkingKey(`${field}:${post.id}`);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from("forum_posts")
      .update({ [field]: !post[field] })
      .eq("id", post.id);

    if (updateError) {
      setError(updateError.message);
      setWorkingKey(null);
      return;
    }

    await fetchForumState();
    setWorkingKey(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Forum Channel</p>
            <p className="text-sm text-zinc-200">
              Post structured discussions with tags, threads, and async replies.
            </p>
          </div>
          <Button
            className="rounded-full"
            disabled={loading}
            onClick={() => void fetchForumState()}
            size="sm"
            type="button"
            variant="secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            onChange={(event) => setTagLabel(event.target.value)}
            placeholder="Create tag (e.g. roadmap)"
            value={tagLabel}
          />
          <Button
            className="rounded-lg"
            disabled={!profileId || workingKey === "create-tag"}
            onClick={() => void createTag()}
            type="button"
            variant="secondary"
          >
            <Tags className="h-4 w-4" />
            Add tag
          </Button>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          <Input
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Thread title"
            value={title}
          />
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    selected
                      ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                  }`}
                  key={tag.id}
                  onClick={() =>
                    setSelectedTagIds((current) =>
                      current.includes(tag.id)
                        ? current.filter((id) => id !== tag.id)
                        : [...current, tag.id],
                    )
                  }
                  type="button"
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
        <Textarea
          className="mt-2 min-h-24 rounded-xl border-white/15 bg-black/35"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your discussion details..."
          value={body}
        />
        <div className="mt-2">
          <Button
            className="rounded-full"
            disabled={!profileId || workingKey === "create-post"}
            onClick={() => void createPost()}
            type="button"
          >
            <MessageCircle className="h-4 w-4" />
            Publish thread
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-zinc-300">
          Loading forum threads...
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {!posts.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
              No forum threads yet. Start the first discussion.
            </div>
          ) : null}
          {posts.map((post) => (
            <article className="rounded-2xl border border-white/10 bg-black/25 p-3" key={post.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{post.title}</p>
                  <p className="text-xs text-zinc-300">{post.body}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    className="h-8 rounded-full px-2.5"
                    onClick={() => void togglePostField(post, "pinned")}
                    size="sm"
                    type="button"
                    variant={post.pinned ? "default" : "secondary"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {post.pinned ? "Pinned" : "Pin"}
                  </Button>
                  <Button
                    className="h-8 rounded-full px-2.5"
                    onClick={() => void togglePostField(post, "locked")}
                    size="sm"
                    type="button"
                    variant={post.locked ? "destructive" : "secondary"}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {post.locked ? "Locked" : "Lock"}
                  </Button>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {(postTagsByPostId[post.id] ?? []).map((tag) => (
                  <span
                    className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-300"
                    key={`${post.id}:${tag.id}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-black/30 p-2">
                {(repliesByPostId[post.id] ?? []).map((reply) => (
                  <p className="text-xs text-zinc-300" key={reply.id}>
                    {reply.body}
                  </p>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    className="h-8 rounded-lg border-white/15 bg-black/40 text-xs"
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [post.id]: event.target.value,
                      }))
                    }
                    placeholder={post.locked ? "Thread is locked" : "Reply..."}
                    value={replyDrafts[post.id] ?? ""}
                  />
                  <Button
                    className="h-8 rounded-lg"
                    disabled={
                      post.locked ||
                      !profileId ||
                      workingKey === `reply:${post.id}` ||
                      !(replyDrafts[post.id] ?? "").trim()
                    }
                    onClick={() => void createReply(post.id)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {success}
        </p>
      ) : null}
    </div>
  );
}

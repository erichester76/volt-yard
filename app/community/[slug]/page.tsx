"use client";

import Link from "@/app/locale-link";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";

type Author = {
  id: string;
  display_name: string | null;
  membership_tier: "free" | "member" | "premium";
  verified_partner_specialty: string | null;
};
type Topic = {
  id: string;
  title: string;
  body: string;
  score: number;
  moderation_state: string;
  created_at: string;
  author_id: string | null;
  community_categories: { name: string } | null;
};
type Post = {
  id: string;
  body: string;
  score: number;
  created_at: string;
  author_id: string | null;
  parent_post_id: string | null;
};
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
const authorName = (id: string | null, authors: Record<string, Author>) =>
  id ? authors[id]?.display_name || "Community member" : "Community member";
const authorBadges = (id: string | null, authors: Record<string, Author>) => {
  const author = id ? authors[id] : undefined;
  if (!author) return null;
  return (
    <span
      className="author-badges"
      aria-label={`${author.membership_tier} membership${author.verified_partner_specialty ? `, verified ${author.verified_partner_specialty} partner` : ""}`}
    >
      <span className="author-badge membership">{author.membership_tier}</span>
      {author.verified_partner_specialty && (
        <span className="author-badge partner">
          Verified {author.verified_partner_specialty}
        </span>
      )}
    </span>
  );
};

export default function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [topicVote, setTopicVote] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [status, setStatus] = useState("Loading conversation...");
  const load = async (slug: string) => {
    if (!isSupabaseConfigured) return setStatus("Community is not configured.");
    const db = createBrowserSupabaseClient();
    const { data, error } = await db
      .from("community_topics")
      .select(
        "id,title,body,score,moderation_state,created_at,author_id,community_categories(name)",
      )
      .eq("slug", slug)
      .in("moderation_state", ["published", "locked"])
      .maybeSingle();
    if (error || !data) return setStatus("This topic is unavailable.");
    const loadedTopic = data as unknown as Topic;
    setTopic(loadedTopic);
    const [postResult, authResult] = await Promise.all([
      db
        .from("community_posts")
        .select("id,body,score,created_at,author_id,parent_post_id")
        .eq("topic_id", loadedTopic.id)
        .eq("moderation_state", "published")
        .order("created_at"),
      db.auth.getUser(),
    ]);
    if (postResult.error) return setStatus("Replies could not be loaded.");
    const loadedPosts = (postResult.data ?? []) as Post[];
    const authorIds = [
      ...new Set(
        [
          loadedTopic.author_id,
          ...loadedPosts.map((post) => post.author_id),
        ].flatMap((id) => (id ? [id] : [])),
      ),
    ];
    const [authorResult, topicVoteResult, postVoteResult] = await Promise.all([
      authorIds.length
        ? db
            .rpc("community_author_profiles_for_ids", { author_ids: authorIds })
        : Promise.resolve({ data: [], error: null }),
      authResult.data.user
        ? db
            .from("community_topic_votes")
            .select("value")
            .eq("topic_id", loadedTopic.id)
            .eq("user_id", authResult.data.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      authResult.data.user && loadedPosts.length
        ? db
            .from("community_post_votes")
            .select("post_id,value")
            .eq("user_id", authResult.data.user.id)
            .in(
              "post_id",
              loadedPosts.map((post) => post.id),
            )
        : Promise.resolve({ data: [] }),
    ]);
    if (authorResult.error) return setStatus(authorResult.error.message);
    setPosts(loadedPosts);
    setAuthors(
      Object.fromEntries(
        ((authorResult.data ?? []) as Author[]).map((author) => [
          author.id,
          author,
        ]),
      ),
    );
    setTopicVote(topicVoteResult.data?.value ?? null);
    setVotes(
      Object.fromEntries(
        (postVoteResult.data ?? []).map((vote) => [vote.post_id, vote.value]),
      ),
    );
    setStatus("");
  };
  useEffect(() => {
    void params.then(({ slug }) => load(slug));
  }, [params]);
  async function vote(kind: "topic" | "post", id: string, value: number) {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user)
      return setStatus("Sign in with a Member or Premium account to vote.");
    const current = kind === "topic" ? topicVote : (votes[id] ?? null);
    const { error } = await db.rpc("community_set_vote", {
      target_kind: kind,
      target_id: id,
      vote_value: current === value ? null : value,
    });
    if (error) return setStatus(error.message);
    void params.then(({ slug }) => load(slug));
  }
  async function reply(event: FormEvent) {
    event.preventDefault();
    if (!topic || !isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return setStatus("Sign in to add a reply.");
    const { error } = await db
      .from("community_posts")
      .insert({
        topic_id: topic.id,
        author_id: auth.user.id,
        body: body.trim(),
        parent_post_id: replyTo?.id ?? null,
        moderation_state: "pending",
      });
    if (error) return setStatus(error.message);
    setBody("");
    setReplyTo(null);
    setStatus("Reply submitted for moderator review.");
  }
  const voteButtons = (
    kind: "topic" | "post",
    id: string,
    score: number,
    current: number | null,
  ) => (
    <div className="vote-controls">
      <button
        type="button"
        aria-label="Upvote"
        className={current === 1 ? "selected" : ""}
        onClick={() => vote(kind, id, 1)}
      >
        +
      </button>
      <strong>{score}</strong>
      <button
        type="button"
        aria-label="Downvote"
        className={current === -1 ? "selected" : ""}
        onClick={() => vote(kind, id, -1)}
      >
        −
      </button>
    </div>
  );
  const byId = Object.fromEntries(posts.map((post) => [post.id, post]));
  const depth = (post: Post) => {
    let count = 0;
    let parent = post.parent_post_id ? byId[post.parent_post_id] : undefined;
    const seen = new Set([post.id]);
    while (parent && count < 3 && !seen.has(parent.id)) {
      seen.add(parent.id);
      count += 1;
      parent = parent.parent_post_id ? byId[parent.parent_post_id] : undefined;
    }
    return count;
  };
  if (!topic)
    return (
      <main className="content-page wrap">
        <p>{status}</p>
      </main>
    );
  return (
    <main className="content-page wrap">
      <article className="topic-article">
        <Link className="back-link" href="/community">
          ← All discussions
        </Link>
        <div className="topic-kicker">
          <span>{topic.community_categories?.name || "Community"}</span>
          <span>
            {topic.moderation_state === "locked"
              ? "Closed conversation"
              : "Open discussion"}
          </span>
        </div>
        <div className="topic-title-row">
          <h1>{topic.title}</h1>
          {voteButtons("topic", topic.id, topic.score, topicVote)}
        </div>
        <div className="topic-byline">
          Started by <strong>{authorName(topic.author_id, authors)}</strong>
          {authorBadges(topic.author_id, authors)}
          <span>·</span>
          <time dateTime={topic.created_at}>{shortDate(topic.created_at)}</time>
          <span>·</span>
          <span>
            {posts.length} {posts.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <div className="topic-body">
          <p>{topic.body}</p>
        </div>
        <div className="topic-actions">
          <Link
            className="inline-cta"
            href={`/issues?source_topic=${topic.id}`}
          >
            Turn into a service case
          </Link>
          <span>Community votes help surface useful experience.</span>
        </div>
      </article>
      <section className="reply-thread" aria-label="Discussion replies">
        <div className="reply-thread-heading">
          <p className="eyebrow">Conversation</p>
          <h2>
            {posts.length} {posts.length === 1 ? "reply" : "replies"}
          </h2>
        </div>
        {posts.map((post) => (
          <article
            className="thread-reply"
            key={post.id}
            style={{ "--reply-depth": depth(post) } as CSSProperties}
          >
            <div className="thread-reply-content">
              <header>
                <strong>{authorName(post.author_id, authors)}</strong>
                {authorBadges(post.author_id, authors)}
                <time dateTime={post.created_at}>
                  {shortDate(post.created_at)}
                </time>
              </header>
              <p>{post.body}</p>
              <button
                className="thread-reply-button"
                type="button"
                onClick={() => {
                  setReplyTo(post);
                  document.getElementById("reply-body")?.focus();
                }}
              >
                Reply
              </button>
            </div>
            {voteButtons("post", post.id, post.score, votes[post.id] ?? null)}
          </article>
        ))}
        {topic.moderation_state === "locked" ? (
          <p className="empty-copy">
            This conversation is closed to new replies.
          </p>
        ) : (
          <form className="community-form reply-form" onSubmit={reply}>
            {replyTo && (
              <div className="replying-to">
                Replying to {authorName(replyTo.author_id, authors)}
                <button type="button" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </div>
            )}
            <label>
              {replyTo ? "Your response" : "Add your experience"}
              <textarea
                id="reply-body"
                required
                minLength={2}
                maxLength={10000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share what worked, or ask a useful follow-up."
              />
            </label>
            <button type="submit">Submit reply</button>
          </form>
        )}
        <p className="directory-status" aria-live="polite">
          {status}
        </p>
      </section>
    </main>
  );
}

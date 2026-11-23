"use client";

import Link from "@/app/locale-link";
import { FormEvent, useEffect, useState } from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { Button, PageHeader } from "@/app/page-primitives";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};
type Author = {
  id: string;
  display_name: string | null;
  membership_tier: "free" | "member" | "premium";
  verified_partner_specialty: string | null;
};
type Topic = {
  id: string;
  slug: string;
  title: string;
  score: number;
  is_pinned: boolean;
  moderation_state: string;
  created_at: string;
  last_activity_at: string;
  author_id: string | null;
  community_categories: Category | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
const authorName = (
  authorId: string | null,
  authors: Record<string, Author>,
) =>
  authorId
    ? authors[authorId]?.display_name || "Community member"
    : "Community member";
const authorBadges = (
  authorId: string | null,
  authors: Record<string, Author>,
) => {
  const author = authorId ? authors[authorId] : undefined;
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

export default function CommunityPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [status, setStatus] = useState("Loading conversations...");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function startQuestion() {
    if (!isSupabaseConfigured) return setStatus("Community is not configured.");
    const { data } = await createBrowserSupabaseClient().auth.getUser();
    if (!data.user) {
      window.dispatchEvent(new CustomEvent("volt-yard-open-auth", { detail: { mode: "sign-up", returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}` } }));
      return;
    }
    setShowForm((value) => !value);
  }

  const load = async () => {
    if (!isSupabaseConfigured) return setStatus("Community is not configured.");
    const db = createBrowserSupabaseClient();
    const [categoryResult, topicResult] = await Promise.all([
      db
        .from("community_categories")
        .select("id,name,slug,description")
        .eq("active", true)
        .order("sort_order")
        .order("name"),
      db
        .from("community_topics")
        .select(
          "id,slug,title,score,is_pinned,moderation_state,created_at,last_activity_at,author_id,community_categories(id,name,slug,description)",
        )
        .in("moderation_state", ["published", "locked"])
        .order("is_pinned", { ascending: false })
        .order("score", { ascending: false })
        .order("last_activity_at", { ascending: false }),
    ]);
    if (categoryResult.error || topicResult.error)
      return setStatus(
        (categoryResult.error || topicResult.error)?.message ??
          "Conversations could not be loaded.",
      );
    const loadedTopics = (topicResult.data ?? []) as unknown as Topic[];
    const authorIds = [
      ...new Set(
        loadedTopics.flatMap((topic) =>
          topic.author_id ? [topic.author_id] : [],
        ),
      ),
    ];
    const authorResult = await (authorIds.length
      ? db.rpc("community_author_profiles_for_ids", { author_ids: authorIds })
      : Promise.resolve({ data: [], error: null }));
    if (authorResult.error)
      return setStatus(
        authorResult.error.message ?? "Conversations could not be loaded.",
      );
    setAuthors(
      Object.fromEntries(
        ((authorResult.data ?? []) as Author[]).map((author) => [
          author.id,
          author,
        ]),
      ),
    );
    const loadedCategories = (categoryResult.data ?? []) as Category[];
    setCategories(loadedCategories);
    setCategoryId((value) => value || loadedCategories[0]?.id || "");
    setTopics(loadedTopics);
    setStatus("");
  };

  useEffect(() => {
    void load();
  }, []);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return setStatus("Sign in to ask the community.");
    if (!categoryId) return setStatus("Choose a category.");
    const { error } = await db
      .from("community_topics")
      .insert({
        author_id: auth.user.id,
        title: title.trim(),
        body: body.trim(),
        category_id: categoryId,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        moderation_state: "pending",
      });
    if (error) return setStatus(error.message);
    setTitle("");
    setBody("");
    setShowForm(false);
    setStatus("Question submitted for moderator review.");
  }

  const visibleTopics = filter
    ? topics.filter((topic) => topic.community_categories?.id === filter)
    : topics;
  return (
    <main className="content-page wrap">
      <PageHeader className="content-head community-head" eyebrow="Amped Up Network community" title="Ask owners who have been there." intro="Compare notes, learn what is normal, and know when it is time to bring in a specialist." actions={<Button
          onClick={() => void startQuestion()}
          aria-expanded={showForm}
        >
          Ask the community
        </Button>} />
      {showForm && (
        <form className="community-form" onSubmit={publish}>
          <label>
            Question title
            <input
              required
              minLength={8}
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What are you trying to solve?"
            />
          </label>
          <label>
            Category
            <select
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Details
            <textarea
              required
              minLength={20}
              maxLength={10000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Include your vehicle, symptoms, and what you have already checked."
            />
          </label>
          <Button type="submit">Submit question</Button>
        </form>
      )}
      <div className="community-toolbar">
        <label>
          Filter topics
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <span>{visibleTopics.length} discussions</span>
      </div>
      <p className="directory-status" aria-live="polite">
        {status}
      </p>
      <section
        className="community-category-list"
        aria-label="Community discussions"
      >
        {categories
          .filter((category) => !filter || category.id === filter)
          .map((category) => {
            const categoryTopics = visibleTopics.filter(
              (topic) => topic.community_categories?.id === category.id,
            );
            return (
              <section className="community-category" key={category.id}>
                <header>
                  <div>
                    <p className="eyebrow">{categoryTopics.length} topics</p>
                    <h2>{category.name}</h2>
                    {category.description && <p>{category.description}</p>}
                  </div>
                </header>
                {categoryTopics.length ? (
                  <div className="discussion-rows">
                    {categoryTopics.map((topic) => (
                      <article className="discussion-row" key={topic.id}>
                        <div className="discussion-row-main">
                          <div className="discussion-labels">
                            {topic.is_pinned && <span>Pinned</span>}
                            {topic.moderation_state === "locked" && (
                              <span>Closed</span>
                            )}
                          </div>
                          <h3>
                            <Link href={`/community/${topic.slug}`}>
                              {topic.title}
                            </Link>
                          </h3>
                          <p>
                            Started by {authorName(topic.author_id, authors)}
                            {authorBadges(topic.author_id, authors)} ·{" "}
                            {shortDate(topic.created_at)}
                          </p>
                        </div>
                        <dl className="discussion-stats">
                          <div>
                            <dt>Score</dt>
                            <dd>
                              {topic.score >= 0 ? "+" : ""}
                              {topic.score}
                            </dd>
                          </div>
                          <div>
                            <dt>Activity</dt>
                            <dd>{shortDate(topic.last_activity_at)}</dd>
                          </div>
                        </dl>
                        <Link
                          className="discussion-open"
                          href={`/community/${topic.slug}`}
                          aria-label={`Open discussion: ${topic.title}`}
                        >
                          Open
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-copy">
                    No discussions in this category yet.
                  </p>
                )}
              </section>
            );
          })}
      </section>
    </main>
  );
}

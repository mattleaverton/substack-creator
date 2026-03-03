import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { getDrafts, getPosts } from "../lib/db";
import type { DraftState, PostHistoryItem } from "../lib/types";

export default function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostHistoryItem[]>([]);
  const [drafts, setDrafts] = useState<DraftState[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostHistoryItem | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      const [latestPosts, latestDrafts] = await Promise.all([
        getPosts(),
        getDrafts(),
      ]);
      setPosts(latestPosts);
      setDrafts(latestDrafts);
      if (latestPosts.length > 0) {
        setSelectedPost(latestPosts[0]);
      }
    };

    void load();
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Start a new post, explore trends, or resume prior work.</p>
      </header>

      <div className="actions">
        <button
          className="primary"
          type="button"
          onClick={() => navigate("/new-post")}
          data-testid="dashboard-new-post"
        >
          New Post
        </button>
        <button
          className="primary"
          type="button"
          onClick={() => navigate("/trending")}
          data-testid="dashboard-trending-topics"
        >
          Trending Topics
        </button>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          data-testid="dashboard-settings-link"
        >
          Settings
        </button>
        <button type="button" onClick={() => navigate("/demo")}>
          Demo Mode
        </button>
      </div>

      <div className="grid-two">
        <Card title="Drafts" className="dashboard-drafts">
          {drafts.length === 0 ? (
            <p className="subtle">No drafts yet.</p>
          ) : null}
          {drafts.map((draft) => (
            <div key={draft.id} className="status-row">
              <div>
                <strong>{draft.topicLabel || "Untitled draft"}</strong>
                <p className="subtle">Step: {draft.currentStep}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate("/new-post", {
                    state: {
                      draftId: draft.id,
                    },
                  })
                }
              >
                Resume
              </button>
            </div>
          ))}
        </Card>

        <Card title="Post History" className="dashboard-posts">
          {posts.length === 0 ? (
            <p className="subtle">No published posts yet.</p>
          ) : null}
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPost(post)}
            >
              {post.title}
            </button>
          ))}
        </Card>
      </div>

      {selectedPost ? (
        <Card title="Post Viewer" className="dashboard-viewer">
          <article
            className="serif-preview"
            data-testid="dashboard-post-viewer"
          >
            <h2>{selectedPost.title}</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {selectedPost.markdown}
            </pre>
          </article>
        </Card>
      ) : null}
    </div>
  );
}

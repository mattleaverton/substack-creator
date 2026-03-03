import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { getSetupCompletion } from "./lib/db";
import Dashboard from "./pages/Dashboard";
import DemoMode from "./pages/DemoMode";
import NewPost from "./pages/NewPost";
import Settings from "./pages/Settings";
import TrendingTopics from "./pages/TrendingTopics";

function HomeRoute(): JSX.Element {
  const [target, setTarget] = useState<"loading" | "settings" | "dashboard">(
    "loading",
  );

  useEffect(() => {
    const decide = async () => {
      const completion = await getSetupCompletion();
      const ready =
        completion.apiKey &&
        completion.company &&
        completion.voice &&
        completion.guardrails;
      setTarget(ready ? "dashboard" : "settings");
    };

    void decide();
  }, []);

  if (target === "loading") {
    return <p>Loading...</p>;
  }

  return <Navigate to={`/${target}`} replace />;
}

export default function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">Substack Creator Engine</div>
        <nav className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/new-post">New Post</Link>
          <Link to="/trending">Trending</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/demo">Demo</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trending" element={<TrendingTopics />} />
        <Route path="/new-post" element={<NewPost />} />
        <Route path="/demo" element={<DemoMode />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

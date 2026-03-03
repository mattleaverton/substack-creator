import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { DemoCacheMissError } from "../lib/llm";
import {
  getReplayFramesForSession,
  listReplaySessions,
  resolveDemoLlmResponse,
  seedBundledDemoSession,
} from "../lib/demo";
import type { DemoReplayFrame, RecordedSession } from "../lib/types";

export default function DemoMode(): JSX.Element {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<RecordedSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [frames, setFrames] = useState<DemoReplayFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [showAttachments, setShowAttachments] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      await seedBundledDemoSession();
      const loadedSessions = await listReplaySessions();
      setSessions(loadedSessions);
      if (loadedSessions.length > 0) {
        const first = loadedSessions[0];
        setSelectedSessionId(first.id);
        const firstFrames = await getReplayFramesForSession(first.id);
        setFrames(firstFrames);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    setShowAttachments(false);
    const timeout = window.setTimeout(() => {
      setShowAttachments(true);
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [frameIndex]);

  const currentFrame = frames[frameIndex];

  const complete = useMemo(
    () => frameIndex >= frames.length - 1 && frames.length > 0,
    [frameIndex, frames],
  );

  const selectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setError("");
    setFrameIndex(0);
    const replayFrames = await getReplayFramesForSession(sessionId);
    setFrames(replayFrames);
  };

  const simulateCacheMiss = async () => {
    if (!selectedSessionId) {
      return;
    }

    try {
      await resolveDemoLlmResponse(
        selectedSessionId,
        "intentional_cache_miss_probe",
        "this-key-is-not-in-cache",
      );
      setError("");
    } catch (cacheError) {
      if (cacheError instanceof DemoCacheMissError) {
        setError(cacheError.message);
      } else {
        setError(
          cacheError instanceof Error
            ? cacheError.message
            : "Unknown demo error",
        );
      }
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1>Demo Mode</h1>
        <p>
          Replay recorded sessions from cache. Cache misses show an error and
          never call live APIs.
        </p>
      </header>

      <Card title="Session Picker" className="demo-picker">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => {
              void selectSession(session.id);
            }}
            data-testid="demo-session-picker-item"
          >
            {session.name}
          </button>
        ))}
        {!sessions.length ? (
          <p className="subtle">No sessions available.</p>
        ) : null}
      </Card>

      {selectedSessionId ? (
        <Card title="Replay" className="demo-replay">
          {currentFrame ? (
            <>
              <p className="kicker">Step</p>
              <h3>{currentFrame.step}</h3>
              {currentFrame.prefill ? (
                <div className="prefill-fade-in" data-testid="demo-prefill">
                  <p>{currentFrame.prefill}</p>
                </div>
              ) : null}

              {showAttachments &&
              currentFrame.attachments &&
              currentFrame.attachments.length > 0 ? (
                <ul>
                  {currentFrame.attachments.map((attachment) => (
                    <li key={attachment.name}>{attachment.name}</li>
                  ))}
                </ul>
              ) : null}

              <div className="actions">
                <button
                  type="button"
                  onClick={() =>
                    setFrameIndex((value) => Math.max(value - 1, 0))
                  }
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={`primary ${currentFrame.highlightedAction ? "demo-highlight" : ""}`}
                  onClick={() =>
                    setFrameIndex((value) =>
                      Math.min(value + 1, frames.length - 1),
                    )
                  }
                  data-testid="demo-next-highlight"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/new-post", {
                      state: {
                        prefillTopic: frames[0]?.prefill ?? "",
                        demoSessionId: selectedSessionId,
                      },
                    })
                  }
                >
                  Replay in New Post Flow
                </button>
              </div>
            </>
          ) : (
            <p className="subtle">No replay frames for this session.</p>
          )}

          {complete ? (
            <p className="subtle">
              Replay complete. Return to Dashboard when ready.
            </p>
          ) : null}

          <div className="actions">
            <button type="button" onClick={() => void simulateCacheMiss()}>
              Simulate Cache Miss
            </button>
            <button type="button" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
          </div>

          {error ? (
            <p className="error" data-testid="demo-cache-miss-error">
              {error}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

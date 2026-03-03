import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import { getConfiguration } from "../lib/db";
import { LlmClient } from "../lib/llm";
import { promptSchema, trendSchema } from "../lib/llm-schemas";
import type { TrendItem, WritingPrompt } from "../lib/types";

interface TrendResponse {
  trends: Array<{
    label: string;
    score: number;
    summary: string;
    sources: Array<{
      url: string;
      title: string;
      author: string;
      publicationDate: string;
      snippet: string;
    }>;
  }>;
}

interface PromptResponse {
  prompts: Array<{
    title: string;
    rationale: string;
    topicPrefill: string;
  }>;
}

const TREND_QUERIES = [
  "Research major consumer trends in the last 30 days with source-backed summaries.",
  "Research fast-growing category shifts and supporting publications.",
  "Research narrative opportunities for long-form brand newsletters with sourced evidence.",
];

export default function TrendingTopics(): JSX.Element {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topTrend = useMemo(() => {
    if (trends.length === 0) {
      return null;
    }
    return [...trends].sort((a, b) => b.score - a.score)[0];
  }, [trends]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setProgress(10);
      setError("");

      try {
        const config = await getConfiguration();
        if (!config.apiKey) {
          throw new Error(
            "Add an API key in Settings to research trending topics.",
          );
        }

        const client = new LlmClient(config.apiKey);
        const responses = await Promise.all(
          TREND_QUERIES.map((query) =>
            client.runJson<TrendResponse>({
              prompt: query,
              schema: trendSchema,
              schemaName: "trending_research",
              taskType: "fast",
              useSearchGrounding: true,
              maxRetries: 4,
            }),
          ),
        );

        setProgress(55);

        const merged = responses
          .flatMap((response) => response.trends)
          .map((trend, index) => ({
            id: `trend_${index}`,
            label: trend.label,
            score: trend.score,
            summary: trend.summary,
            sources: trend.sources.map((source, sourceIndex) => ({
              id: `trend_${index}_source_${sourceIndex}`,
              highlight: false,
              ...source,
            })),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        setTrends(merged);

        const synthesisPrompt = [
          "Create exactly 3 writing prompts for a Substack post using these trend notes.",
          merged
            .map((trend) => `- ${trend.label}: ${trend.summary}`)
            .join("\n"),
        ].join("\n");

        const promptResponse = await client.runJson<PromptResponse>({
          prompt: synthesisPrompt,
          schema: promptSchema,
          schemaName: "trending_prompt_synthesis",
          taskType: "important",
          maxRetries: 4,
        });

        setPrompts(
          promptResponse.prompts.slice(0, 3).map((prompt, index) => ({
            id: `prompt_${index}`,
            ...prompt,
          })),
        );
        setProgress(100);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load trends",
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1>Trending Topics</h1>
        <p>
          Search-grounded trend research powered by Gemini 3 Flash, then prompt
          synthesis in Gemini 3.1 Pro.
        </p>
      </header>

      {loading ? (
        <ProgressBar progress={progress} label="Building trend map" />
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="grid-two">
        <Card title="Trend Visualization" className="trend-visualization">
          {trends.map((trend) => (
            <div key={trend.id}>
              <div className="status-row">
                <strong>{trend.label}</strong>
                <span>{trend.score.toFixed(1)}</span>
              </div>
              <ProgressBar progress={Math.min(100, trend.score * 10)} />
              <p className="subtle">{trend.summary}</p>
            </div>
          ))}
          {!trends.length && !loading ? (
            <p className="subtle">No trend data yet.</p>
          ) : null}
        </Card>

        <Card title="Suggested Prompts" className="trend-prompts">
          {prompts.map((prompt) => (
            <article
              key={prompt.id}
              className="source-card"
              data-testid="trend-prompt-card"
            >
              <h3>{prompt.title}</h3>
              <p className="subtle">{prompt.rationale}</p>
              <button
                type="button"
                onClick={() =>
                  navigate("/new-post", {
                    state: {
                      prefillTopic: prompt.topicPrefill,
                    },
                  })
                }
              >
                Use This Prompt
              </button>
            </article>
          ))}
          {!prompts.length && !loading ? (
            <p className="subtle">No prompts generated.</p>
          ) : null}
        </Card>
      </div>

      {topTrend ? (
        <Card title="Top Source Highlights">
          {topTrend.sources.slice(0, 3).map((source) => (
            <article className="source-card" key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <p className="subtle">
                {source.author} · {source.publicationDate}
              </p>
              <p>{source.snippet}</p>
            </article>
          ))}
        </Card>
      ) : null}

      <div className="actions">
        <button type="button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

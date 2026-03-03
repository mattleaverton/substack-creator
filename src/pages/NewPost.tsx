import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import StepIndicator from "../components/StepIndicator";
import {
  appendSessionCache,
  appendSessionEvent,
  createId,
  deleteDraft,
  getConfiguration,
  getDraft,
  saveDraft,
  savePost,
  saveSession,
  toIsoTimestamp,
} from "../lib/db";
import { resolveDemoLlmResponse } from "../lib/demo";
import { LlmClient } from "../lib/llm";
import { outlineSchema, researchSchema, writeSchema } from "../lib/llm-schemas";
import type {
  ConfigurationState,
  DraftState,
  NewPostStep,
  RecordedSession,
  ResearchSource,
  RichInputValue,
  SessionEventType,
} from "../lib/types";
import CompleteStep from "./new-post/CompleteStep";
import OutlineStep from "./new-post/OutlineStep";
import ResearchStep from "./new-post/ResearchStep";
import TopicStep from "./new-post/TopicStep";
import WriteStep from "./new-post/WriteStep";
import { emptyRichInput } from "../components/RichInput";

interface LocationState {
  prefillTopic?: string;
  draftId?: string;
  demoSessionId?: string;
}

interface ResearchResponse {
  sources: Array<{
    url: string;
    title: string;
    author: string;
    publicationDate: string;
    snippet: string;
  }>;
}

interface OutlineResponse {
  outline: string;
}

interface WriteResponse {
  markdown: string;
  citationMap: Record<string, string>;
}

const STEP_ORDER: NewPostStep[] = [
  "topic",
  "research",
  "outline",
  "write",
  "complete",
];
const STEP_LABELS = ["Topic", "Research", "Outline", "Write", "Complete"];

function stepIndex(step: NewPostStep): number {
  return STEP_ORDER.indexOf(step);
}

export default function NewPost(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? null;

  const [config, setConfig] = useState<ConfigurationState | null>(null);
  const [draftId, setDraftId] = useState<string>(
    locationState?.draftId ?? createId("draft"),
  );
  const [topic, setTopic] = useState<RichInputValue>(() => ({
    ...emptyRichInput(),
    text: locationState?.prefillTopic ?? "",
  }));
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [outline, setOutline] = useState("");
  const [writeDraft, setWriteDraft] = useState("");
  const [editedDraft, setEditedDraft] = useState("");
  const [guardrailedDraft, setGuardrailedDraft] = useState("");
  const [citationMap, setCitationMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<NewPostStep>("topic");
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [writeCycle, setWriteCycle] = useState<
    "write" | "edit" | "guardrails" | "done"
  >("write");
  const [writeProgress, setWriteProgress] = useState(0);
  const startedWriteRef = useRef(false);

  const currentStepIndex = useMemo(() => stepIndex(step), [step]);

  const sessionName = useMemo(() => {
    const topicLabel = topic.text.trim().slice(0, 40);
    return topicLabel ? `Post: ${topicLabel}` : "Newsletter Session";
  }, [topic.text]);

  const recordEvent = async (
    type: SessionEventType,
    payload: Record<string, unknown>,
  ) => {
    if (!sessionId) {
      return;
    }

    await appendSessionEvent(sessionId, {
      id: createId("event"),
      type,
      timestamp: toIsoTimestamp(),
      payload,
    });
  };

  const persistDraftState = async (nextStep: NewPostStep) => {
    const payload: DraftState = {
      id: draftId,
      topic,
      topicLabel: topic.text.slice(0, 80),
      researchSources,
      outline,
      writeDraft,
      editedDraft,
      guardrailedDraft,
      attribution: {
        citationMap,
        sources: researchSources,
      },
      currentStep: nextStep,
      updatedAt: toIsoTimestamp(),
    };

    await saveDraft(payload);
  };

  useEffect(() => {
    const initialize = async () => {
      const configuration = await getConfiguration();
      setConfig(configuration);

      if (locationState?.draftId) {
        const existing = await getDraft(locationState.draftId);
        if (existing) {
          setDraftId(existing.id);
          setTopic(existing.topic);
          setResearchSources(existing.researchSources);
          setOutline(existing.outline);
          setWriteDraft(existing.writeDraft);
          setEditedDraft(existing.editedDraft);
          setGuardrailedDraft(existing.guardrailedDraft);
          setCitationMap(existing.attribution.citationMap);
          setStep(existing.currentStep);
        }
      }

      const id = createId("session");
      const session: RecordedSession = {
        id,
        name: sessionName,
        createdAt: toIsoTimestamp(),
        mode: locationState?.demoSessionId ? "demo" : "production",
        events: [],
        llmCache: [],
      };

      await saveSession(session);
      setSessionId(id);
    };

    void initialize();
  }, []);

  const buildClient = (): LlmClient => {
    return new LlmClient(config?.apiKey ?? "", {
      onRequest: ({ model, prompt, schemaName }) => {
        void recordEvent("llm-request", {
          model,
          prompt,
          schemaName,
        });
      },
      onResponse: ({ model, response, schemaName }) => {
        void recordEvent("llm-response", {
          model,
          schemaName,
          response,
        });
      },
      demoInterceptor: locationState?.demoSessionId
        ? async ({ prompt, schemaName }) => {
            return resolveDemoLlmResponse(
              locationState.demoSessionId as string,
              schemaName,
              prompt,
            );
          }
        : undefined,
    });
  };

  const runResearch = async () => {
    if (!config?.apiKey) {
      setError("Set your API key in Settings before running research.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const prompt = [
        "Research reliable sources for this newsletter topic.",
        `Topic: ${topic.text}`,
        `Supplementary links: ${topic.links.join(", ") || "none"}`,
        "Return at least 5 sources with metadata and a concise snippet for each.",
      ].join("\n");

      const client = buildClient();
      const response = await client.runJson<ResearchResponse>({
        prompt,
        schema: researchSchema,
        schemaName: "new_post_research",
        taskType: "fast",
        useSearchGrounding: true,
        maxRetries: 4,
      });

      const sources = response.sources.map((source, index) => ({
        id: `source_${index}`,
        highlight: false,
        ...source,
      }));

      setResearchSources(sources);
      setStep("research");
      await recordEvent("state-transition", { step: "research" });
      await persistDraftState("research");
    } catch (researchError) {
      setError(
        researchError instanceof Error
          ? researchError.message
          : "Failed to run research",
      );
    } finally {
      setLoading(false);
    }
  };

  const runOutline = async () => {
    if (!config?.apiKey) {
      setError("Set your API key in Settings before generating an outline.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const highlighted = researchSources.filter((source) => source.highlight);
      const sourceSet = highlighted.length > 0 ? highlighted : researchSources;
      const prompt = [
        "Generate a one-shot outline for a Substack article.",
        `Topic: ${topic.text}`,
        `Company context: ${config.company?.confirmation ?? ""}`,
        `Voice: ${config.voice?.confirmation ?? ""}`,
        `Sources:\n${sourceSet.map((source) => `- ${source.title}: ${source.snippet}`).join("\n")}`,
      ].join("\n");

      const client = buildClient();
      const response = await client.runJson<OutlineResponse>({
        prompt,
        schema: outlineSchema,
        schemaName: "new_post_outline",
        taskType: "important",
        maxRetries: 4,
      });

      setOutline(response.outline);
      await persistDraftState("outline");
    } catch (outlineError) {
      setError(
        outlineError instanceof Error
          ? outlineError.message
          : "Failed to generate outline",
      );
    } finally {
      setLoading(false);
    }
  };

  const runWriteCycles = async () => {
    if (startedWriteRef.current || !config?.apiKey) {
      return;
    }

    startedWriteRef.current = true;
    setLoading(true);
    setError("");
    setWriteProgress(10);

    try {
      const client = buildClient();

      setWriteCycle("write");
      const writePrompt = [
        "Write a complete Substack post in markdown.",
        "Include inline citations like [1], [2] mapped to source IDs in citationMap.",
        "Do not include guardrails yet.",
        `Topic: ${topic.text}`,
        `Outline: ${outline}`,
        `Sources: ${researchSources.map((source) => `${source.id}|${source.title}|${source.url}`).join("\n")}`,
      ].join("\n");

      const writeResponse = await client.runJson<WriteResponse>({
        prompt: writePrompt,
        schema: writeSchema,
        schemaName: "new_post_write_cycle_1",
        taskType: "important",
        maxRetries: 4,
      });
      setWriteDraft(writeResponse.markdown);
      setWriteProgress(40);

      if (sessionId) {
        await appendSessionCache(
          sessionId,
          `new_post_write_cycle_1::${writePrompt.trim()}`,
          writeResponse,
        );
      }

      setWriteCycle("edit");
      const editPrompt = [
        "Revise this markdown for style consistency and readability.",
        `Voice guidance: ${config.voice?.confirmation ?? ""}`,
        "Keep citations intact and best-effort for source-derived claims.",
        writeResponse.markdown,
      ].join("\n");

      const editResponse = await client.runJson<WriteResponse>({
        prompt: editPrompt,
        schema: writeSchema,
        schemaName: "new_post_write_cycle_2",
        taskType: "important",
        maxRetries: 4,
      });
      setEditedDraft(editResponse.markdown);
      setWriteProgress(70);

      if (sessionId) {
        await appendSessionCache(
          sessionId,
          `new_post_write_cycle_2::${editPrompt.trim()}`,
          editResponse,
        );
      }

      setWriteCycle("guardrails");
      const guardrailsPrompt = [
        "Apply guardrails to this markdown and fix any violations.",
        "Only use the guardrails text and the post draft.",
        `Guardrails: ${config.guardrails?.confirmation ?? ""}`,
        editResponse.markdown,
      ].join("\n");

      const guardrailsResponse = await client.runJson<WriteResponse>({
        prompt: guardrailsPrompt,
        schema: writeSchema,
        schemaName: "new_post_write_cycle_3",
        taskType: "important",
        maxRetries: 4,
      });

      setGuardrailedDraft(guardrailsResponse.markdown);
      setCitationMap(guardrailsResponse.citationMap);
      setWriteCycle("done");
      setWriteProgress(100);
      setStep("complete");
      await recordEvent("state-transition", { step: "complete" });
      await persistDraftState("complete");

      if (sessionId) {
        await appendSessionCache(
          sessionId,
          `new_post_write_cycle_3::${guardrailsPrompt.trim()}`,
          guardrailsResponse,
        );
      }
    } catch (writeError) {
      setError(
        writeError instanceof Error ? writeError.message : "Write cycle failed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "write") {
      void runWriteCycles();
    }
  }, [step]);

  const complete = async () => {
    const markdown = guardrailedDraft || editedDraft || writeDraft;
    const titleFromMarkdown = markdown
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("# "));

    const title = titleFromMarkdown
      ? titleFromMarkdown.replace(/^#\s*/, "")
      : topic.text.slice(0, 70);

    await savePost({
      id: createId("post"),
      title: title || "Untitled Post",
      markdown,
      attribution: {
        citationMap,
        sources: researchSources,
      },
      createdAt: toIsoTimestamp(),
      sessionId,
    });

    await deleteDraft(draftId);
    navigate("/dashboard");
  };

  if (!config) {
    return <p>Loading post pipeline...</p>;
  }

  return (
    <div>
      <header className="page-header">
        <h1>New Post</h1>
        <p>Topic → Research → Outline → Write/Edit/Guardrails → Complete.</p>
      </header>

      <StepIndicator steps={STEP_LABELS} currentStep={currentStepIndex} />
      {error ? <p className="error">{error}</p> : null}

      <Card>
        {step === "topic" ? (
          <TopicStep
            value={topic}
            onChange={(value) => {
              setTopic(value);
              void recordEvent("user-input", {
                step: "topic",
                prefill: value.text,
              });
            }}
            onResearch={() => {
              void runResearch();
            }}
            busy={loading}
          />
        ) : null}

        {step === "research" ? (
          <ResearchStep
            sources={researchSources}
            loading={loading}
            onToggleHighlight={(id) => {
              setResearchSources((sources) =>
                sources.map((source) =>
                  source.id === id
                    ? {
                        ...source,
                        highlight: !source.highlight,
                      }
                    : source,
                ),
              );
              void persistDraftState("research");
            }}
            onDelete={(id) => {
              setResearchSources((sources) =>
                sources.filter((source) => source.id !== id),
              );
              void persistDraftState("research");
            }}
            onBack={() => {
              setStep("topic");
              void persistDraftState("topic");
            }}
            onNext={() => {
              setStep("outline");
              void persistDraftState("outline");
            }}
          />
        ) : null}

        {step === "outline" ? (
          <OutlineStep
            outline={outline}
            loading={loading}
            onGenerate={() => {
              void runOutline();
            }}
            onBack={() => {
              setStep("research");
              void persistDraftState("research");
            }}
            onAccept={() => {
              setStep("write");
              void persistDraftState("write");
            }}
          />
        ) : null}

        {step === "write" ? (
          <WriteStep
            cycle={writeCycle}
            progress={writeProgress}
            error={error}
          />
        ) : null}

        {step === "complete" ? (
          <CompleteStep
            markdown={guardrailedDraft || editedDraft || writeDraft}
            citationMap={citationMap}
            sources={researchSources}
            onFinish={() => {
              void complete();
            }}
          />
        ) : null}
      </Card>
    </div>
  );
}

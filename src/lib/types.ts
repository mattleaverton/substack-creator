export type SetupKey = "apiKey" | "company" | "voice" | "guardrails";

export interface Attachment {
  name: string;
  size: number;
  type: string;
}

export interface RichInputValue {
  text: string;
  links: string[];
  attachments: Attachment[];
}

export interface ConfirmedContent {
  raw: RichInputValue;
  confirmation: string;
  confirmedAt: string;
}

export interface ConfigurationState {
  apiKey: string;
  company?: ConfirmedContent;
  voice?: ConfirmedContent;
  guardrails?: ConfirmedContent;
  updatedAt: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  author: string;
  publicationDate: string;
  snippet: string;
  highlight: boolean;
}

export interface CitationReference {
  citationId: string;
  sourceId: string;
}

export interface AttributionLineage {
  citationMap: Record<string, string>;
  sources: ResearchSource[];
}

export interface DraftState {
  id: string;
  topic: RichInputValue;
  topicLabel: string;
  researchSources: ResearchSource[];
  outline: string;
  writeDraft: string;
  editedDraft: string;
  guardrailedDraft: string;
  attribution: AttributionLineage;
  currentStep: NewPostStep;
  updatedAt: string;
}

export interface PostHistoryItem {
  id: string;
  title: string;
  markdown: string;
  attribution: AttributionLineage;
  createdAt: string;
  sessionId: string;
}

export type SessionEventType =
  | "user-input"
  | "llm-request"
  | "llm-response"
  | "state-transition"
  | "user-action";

export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface LlmCacheEntry {
  key: string;
  response: unknown;
}

export interface RecordedSession {
  id: string;
  name: string;
  createdAt: string;
  mode: "production" | "demo";
  events: SessionEvent[];
  llmCache: LlmCacheEntry[];
}

export type NewPostStep =
  | "topic"
  | "research"
  | "outline"
  | "write"
  | "complete";

export interface TrendItem {
  id: string;
  label: string;
  score: number;
  summary: string;
  sources: ResearchSource[];
}

export interface WritingPrompt {
  id: string;
  title: string;
  rationale: string;
  topicPrefill: string;
}

export interface LlmCallRecord {
  model: string;
  prompt: string;
  schemaName: string;
  response?: unknown;
  error?: string;
}

export interface SetupCompletion {
  apiKey: boolean;
  company: boolean;
  voice: boolean;
  guardrails: boolean;
}

export interface DemoReplayFrame {
  step: string;
  prefill?: string;
  attachments?: Attachment[];
  highlightedAction?: string;
}

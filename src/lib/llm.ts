import { GoogleGenerativeAI } from "@google/generative-ai";
import type { JsonSchema } from "./llm-schemas";

export type LlmTaskType = "fast" | "important" | "test";

const MODEL_FAST = "gemini-3-flash-preview";
const MODEL_IMPORTANT = "gemini-3.1-pro-preview";
const MODEL_TEST = "gemini-2.5-flash-lite";

export interface LlmCallOptions {
  prompt: string;
  taskType: LlmTaskType;
  schema: JsonSchema;
  schemaName: string;
  useSearchGrounding?: boolean;
  maxRetries?: number;
}

export interface LlmAttempt {
  attempt: number;
  model: string;
  prompt: string;
  error?: string;
  responseText?: string;
}

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmParseError";
  }
}

export class LlmNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmNetworkError";
  }
}

export class LlmMaxRetriesError extends Error {
  attempts: LlmAttempt[];

  constructor(message: string, attempts: LlmAttempt[]) {
    super(message);
    this.name = "LlmMaxRetriesError";
    this.attempts = attempts;
  }
}

export class DemoCacheMissError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoCacheMissError";
  }
}

interface LlmClientOptions {
  onRequest?: (meta: {
    model: string;
    prompt: string;
    schemaName: string;
  }) => void;
  onResponse?: (meta: {
    model: string;
    response: unknown;
    schemaName: string;
  }) => void;
  demoInterceptor?: (meta: {
    taskType: LlmTaskType;
    prompt: string;
    schemaName: string;
  }) => Promise<unknown | undefined>;
}

function modelForTask(taskType: LlmTaskType): string {
  const forced = import.meta.env.VITE_LLM_TEST_MODEL;
  if (forced) {
    return forced;
  }

  if (import.meta.env.MODE === "test") {
    return MODEL_TEST;
  }

  if (taskType === "test") {
    return MODEL_TEST;
  }

  return taskType === "fast" ? MODEL_FAST : MODEL_IMPORTANT;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withFeedback(
  basePrompt: string,
  failedResponse: string,
  reason: string,
): string {
  return `${basePrompt}\n\nPrevious response was invalid:\n${failedResponse}\n\nReason:\n${reason}\n\nReturn valid JSON matching schema.`;
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LlmParseError("Response must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function validateAgainstSchema(
  schema: JsonSchema,
  value: unknown,
  path = "$",
): void {
  const obj = ensureObject(value);

  for (const key of schema.required ?? []) {
    if (!(key in obj)) {
      throw new LlmParseError(`Missing required key ${path}.${key}`);
    }
  }

  for (const [key, schemaValue] of Object.entries(schema.properties)) {
    if (!(key in obj)) {
      continue;
    }

    const prop = schemaValue as Record<string, unknown>;
    const expectedType = prop.type;
    const current = obj[key];

    if (expectedType === "string" && typeof current !== "string") {
      throw new LlmParseError(`Expected string at ${path}.${key}`);
    }

    if (expectedType === "number" && typeof current !== "number") {
      throw new LlmParseError(`Expected number at ${path}.${key}`);
    }

    if (expectedType === "array") {
      if (!Array.isArray(current)) {
        throw new LlmParseError(`Expected array at ${path}.${key}`);
      }

      const itemSchema = (prop.items as JsonSchema | undefined) ?? undefined;
      if (itemSchema) {
        current.forEach((entry, index) => {
          if (itemSchema.type === "object") {
            validateAgainstSchema(
              itemSchema,
              entry,
              `${path}.${key}[${index}]`,
            );
          }
        });
      }
    }

    if (expectedType === "object") {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        throw new LlmParseError(`Expected object at ${path}.${key}`);
      }

      const nested = prop as JsonSchema;
      if (nested.properties) {
        validateAgainstSchema(nested, current, `${path}.${key}`);
      }
    }
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new LlmParseError(message);
  }
}

export class LlmClient {
  private readonly apiKey: string;
  private readonly options: LlmClientOptions;

  constructor(apiKey: string, options: LlmClientOptions = {}) {
    this.apiKey = apiKey;
    this.options = options;
  }

  async runJson<T>(call: LlmCallOptions): Promise<T> {
    if (!this.apiKey) {
      throw new LlmNetworkError(
        "Gemini API key is required before making LLM calls.",
      );
    }

    const demoResponse = await this.options.demoInterceptor?.({
      taskType: call.taskType,
      prompt: call.prompt,
      schemaName: call.schemaName,
    });

    if (typeof demoResponse !== "undefined") {
      validateAgainstSchema(call.schema, demoResponse);
      return demoResponse as T;
    }

    const modelName = modelForTask(call.taskType);
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const maxRetries = call.maxRetries ?? 3;
    const attempts: LlmAttempt[] = [];

    let prompt = call.prompt;
    let delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      this.options.onRequest?.({
        model: modelName,
        prompt,
        schemaName: call.schemaName,
      });

      try {
        const requestPayload: Record<string, unknown> = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: call.schema,
          },
        };

        if (call.useSearchGrounding) {
          requestPayload.tools = [{ googleSearch: {} }];
        }

        if (modelName === MODEL_IMPORTANT) {
          requestPayload.generationConfig = {
            ...(requestPayload.generationConfig as Record<string, unknown>),
            thinkingConfig: {
              thinkingBudget: 1024,
            },
          };
        }

        const response = await model.generateContent(requestPayload as any);
        const text = response.response.text();
        const parsed = parseJson(text);

        validateAgainstSchema(call.schema, parsed);

        this.options.onResponse?.({
          model: modelName,
          response: parsed,
          schemaName: call.schemaName,
        });
        return parsed as T;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown LLM failure";
        const attemptRecord: LlmAttempt = {
          attempt,
          model: modelName,
          prompt,
          error: message,
        };

        attempts.push(attemptRecord);

        if (attempt >= maxRetries) {
          throw new LlmMaxRetriesError(
            `LLM failed after ${maxRetries} attempts.`,
            attempts,
          );
        }

        const failedResponse = attemptRecord.responseText ?? "{}";
        prompt = withFeedback(call.prompt, failedResponse, message);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(Math.min(30000, delayMs) + jitter);
        delayMs = Math.min(30000, delayMs * 2);
      }
    }

    throw new LlmMaxRetriesError("LLM failed unexpectedly.", attempts);
  }
}

export function createLlmCacheKey(schemaName: string, prompt: string): string {
  return `${schemaName}::${prompt.trim()}`;
}

export const LLM_MODELS = {
  fast: MODEL_FAST,
  important: MODEL_IMPORTANT,
  test: MODEL_TEST,
} as const;

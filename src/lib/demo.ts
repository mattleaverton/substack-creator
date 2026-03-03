import bundledSession from "../demo/bundled-session.json";
import { createLlmCacheKey, DemoCacheMissError } from "./llm";
import { getSession, getSessions, seedSessionIfMissing } from "./db";
import type { DemoReplayFrame, RecordedSession } from "./types";
import { getConfiguration, upsertConfiguration } from "./db";

interface BundledSessionFile {
  session: RecordedSession;
  replayFrames: DemoReplayFrame[];
  configSeed?: {
    apiKey: string;
    companyConfirmation: string;
    voiceConfirmation: string;
    guardrailsConfirmation: string;
  };
}

const bundled = bundledSession as BundledSessionFile;

export async function seedBundledDemoSession(): Promise<void> {
  await seedSessionIfMissing(bundled.session);

  if (bundled.configSeed) {
    const current = await getConfiguration();
    if (!current.company || !current.voice || !current.guardrails) {
      await upsertConfiguration({
        apiKey: current.apiKey || bundled.configSeed.apiKey,
        company: {
          raw: {
            text: bundled.configSeed.companyConfirmation,
            links: [],
            attachments: [],
          },
          confirmation: bundled.configSeed.companyConfirmation,
          confirmedAt: new Date().toISOString(),
        },
        voice: {
          raw: {
            text: bundled.configSeed.voiceConfirmation,
            links: [],
            attachments: [],
          },
          confirmation: bundled.configSeed.voiceConfirmation,
          confirmedAt: new Date().toISOString(),
        },
        guardrails: {
          raw: {
            text: bundled.configSeed.guardrailsConfirmation,
            links: [],
            attachments: [],
          },
          confirmation: bundled.configSeed.guardrailsConfirmation,
          confirmedAt: new Date().toISOString(),
        },
      });
    }
  }
}

export async function listReplaySessions(): Promise<RecordedSession[]> {
  await seedBundledDemoSession();
  return getSessions();
}

export async function getReplaySession(
  id: string,
): Promise<RecordedSession | undefined> {
  await seedBundledDemoSession();
  return getSession(id);
}

export async function resolveDemoLlmResponse(
  sessionId: string,
  schemaName: string,
  prompt: string,
): Promise<unknown> {
  const session = await getReplaySession(sessionId);
  if (!session) {
    throw new DemoCacheMissError(`Demo session ${sessionId} was not found.`);
  }

  const key = createLlmCacheKey(schemaName, prompt);
  const cached = session.llmCache.find((entry) => entry.key === key);

  if (!cached) {
    throw new DemoCacheMissError(
      `Cache miss for schema ${schemaName}. Demo mode does not call live APIs.`,
    );
  }

  return cached.response;
}

export function getBundledReplayFrames(): DemoReplayFrame[] {
  return bundled.replayFrames;
}

export async function getReplayFramesForSession(
  sessionId: string,
): Promise<DemoReplayFrame[]> {
  if (sessionId === bundled.session.id) {
    return bundled.replayFrames;
  }

  const sessions = await getSessions();
  const match = sessions.find((entry) => entry.id === sessionId);
  if (!match) {
    return [];
  }

  return match.events
    .filter(
      (event) =>
        event.type === "state-transition" || event.type === "user-input",
    )
    .map((event) => {
      const payload = event.payload;
      const prefill =
        typeof payload.prefill === "string" ? payload.prefill : undefined;
      const step = typeof payload.step === "string" ? payload.step : "replay";
      const highlightedAction =
        typeof payload.highlightedAction === "string"
          ? payload.highlightedAction
          : undefined;

      return {
        step,
        prefill,
        highlightedAction,
        attachments: [],
      };
    });
}

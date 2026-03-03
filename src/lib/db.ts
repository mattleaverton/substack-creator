import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ConfigurationState,
  DraftState,
  PostHistoryItem,
  RecordedSession,
  SessionEvent,
  SetupCompletion,
} from "./types";

const DB_NAME = "substack-creator-v1";
const DB_VERSION = 1;

interface SubstackCreatorDb extends DBSchema {
  config: {
    key: string;
    value: unknown;
  };
  drafts: {
    key: string;
    value: DraftState;
    indexes: { updatedAt: string };
  };
  posts: {
    key: string;
    value: PostHistoryItem;
    indexes: { createdAt: string };
  };
  sessions: {
    key: string;
    value: RecordedSession;
    indexes: { createdAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<SubstackCreatorDb>> | undefined;

async function getDb(): Promise<IDBPDatabase<SubstackCreatorDb>> {
  if (!dbPromise) {
    dbPromise = openDB<SubstackCreatorDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("config")) {
          db.createObjectStore("config");
        }

        if (!db.objectStoreNames.contains("drafts")) {
          const store = db.createObjectStore("drafts", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }

        if (!db.objectStoreNames.contains("posts")) {
          const store = db.createObjectStore("posts", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains("sessions")) {
          const store = db.createObjectStore("sessions", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }

  return dbPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

const DEFAULT_CONFIG: ConfigurationState = {
  apiKey: "",
  updatedAt: "",
};

export async function getConfiguration(): Promise<ConfigurationState> {
  const db = await getDb();
  const [apiKey, company, voice, guardrails, updatedAt] = await Promise.all([
    db.get("config", "apiKey"),
    db.get("config", "company"),
    db.get("config", "voice"),
    db.get("config", "guardrails"),
    db.get("config", "configUpdatedAt"),
  ]);

  return {
    ...DEFAULT_CONFIG,
    apiKey: typeof apiKey === "string" ? apiKey : "",
    company: company as ConfigurationState["company"],
    voice: voice as ConfigurationState["voice"],
    guardrails: guardrails as ConfigurationState["guardrails"],
    updatedAt: typeof updatedAt === "string" ? updatedAt : "",
  };
}

export async function upsertConfiguration(
  partial: Partial<ConfigurationState>,
): Promise<ConfigurationState> {
  const current = await getConfiguration();
  const merged: ConfigurationState = {
    ...current,
    ...partial,
    updatedAt: nowIso(),
  };

  const db = await getDb();
  const tx = db.transaction("config", "readwrite");
  await tx.store.put(merged.apiKey, "apiKey");
  await tx.store.put(merged.company, "company");
  await tx.store.put(merged.voice, "voice");
  await tx.store.put(merged.guardrails, "guardrails");
  await tx.store.put(merged.updatedAt, "configUpdatedAt");
  await tx.done;

  return merged;
}

export async function getSetupCompletion(): Promise<SetupCompletion> {
  const config = await getConfiguration();
  return {
    apiKey: Boolean(config.apiKey),
    company: Boolean(config.company),
    voice: Boolean(config.voice),
    guardrails: Boolean(config.guardrails),
  };
}

export async function saveDraft(draft: DraftState): Promise<void> {
  const db = await getDb();
  await db.put("drafts", {
    ...draft,
    updatedAt: nowIso(),
  });
}

export async function getDraft(id: string): Promise<DraftState | undefined> {
  const db = await getDb();
  return db.get("drafts", id);
}

export async function getDrafts(): Promise<DraftState[]> {
  const db = await getDb();
  const drafts = await db.getAll("drafts");
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("drafts", id);
}

export async function savePost(post: PostHistoryItem): Promise<void> {
  const db = await getDb();
  await db.put("posts", post);
}

export async function getPost(
  id: string,
): Promise<PostHistoryItem | undefined> {
  const db = await getDb();
  return db.get("posts", id);
}

export async function getPosts(): Promise<PostHistoryItem[]> {
  const db = await getDb();
  const posts = await db.getAll("posts");
  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveSession(session: RecordedSession): Promise<void> {
  const db = await getDb();
  await db.put("sessions", session);
}

export async function getSession(
  id: string,
): Promise<RecordedSession | undefined> {
  const db = await getDb();
  return db.get("sessions", id);
}

export async function getSessions(): Promise<RecordedSession[]> {
  const db = await getDb();
  const sessions = await db.getAll("sessions");
  return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function appendSessionEvent(
  sessionId: string,
  event: SessionEvent,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    return;
  }

  const updated: RecordedSession = {
    ...session,
    events: [...session.events, event],
  };

  await saveSession(updated);
}

export async function appendSessionCache(
  sessionId: string,
  key: string,
  response: unknown,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    return;
  }

  const exists = session.llmCache.some((entry) => entry.key === key);
  const llmCache = exists
    ? session.llmCache.map((entry) =>
        entry.key === key ? { key, response } : entry,
      )
    : [...session.llmCache, { key, response }];

  await saveSession({
    ...session,
    llmCache,
  });
}

export async function seedSessionIfMissing(
  session: RecordedSession,
): Promise<void> {
  const existing = await getSession(session.id);
  if (!existing) {
    await saveSession(session);
  }
}

export async function resetEverything(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ["config", "drafts", "posts", "sessions"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("config").clear(),
    tx.objectStore("drafts").clear(),
    tx.objectStore("posts").clear(),
    tx.objectStore("sessions").clear(),
  ]);
  await tx.done;
}

export async function hasAnyData(): Promise<boolean> {
  const db = await getDb();
  const [configKeys, draftCount, postCount, sessionCount] = await Promise.all([
    db.getAllKeys("config"),
    db.count("drafts"),
    db.count("posts"),
    db.count("sessions"),
  ]);

  return (
    configKeys.length > 0 || draftCount > 0 || postCount > 0 || sessionCount > 0
  );
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export function toIsoTimestamp(): string {
  return nowIso();
}

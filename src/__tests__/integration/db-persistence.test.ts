import { describe, expect, it } from "vitest";
import {
  createId,
  getConfiguration,
  getDraft,
  getDrafts,
  getPosts,
  getSessions,
  getSetupCompletion,
  resetEverything,
  saveDraft,
  savePost,
  saveSession,
  toIsoTimestamp,
  upsertConfiguration,
} from "../../lib/db";

describe("integration: indexeddb persistence", () => {
  it("persists configuration, drafts, posts, and sessions", async () => {
    await resetEverything();

    await upsertConfiguration({
      apiKey: "test-key",
      company: {
        raw: { text: "Company", links: [], attachments: [] },
        confirmation: "Confirmed company",
        confirmedAt: toIsoTimestamp(),
      },
      voice: {
        raw: { text: "Voice", links: [], attachments: [] },
        confirmation: "Confirmed voice",
        confirmedAt: toIsoTimestamp(),
      },
      guardrails: {
        raw: { text: "Guardrails", links: [], attachments: [] },
        confirmation: "Confirmed guardrails",
        confirmedAt: toIsoTimestamp(),
      },
    });

    const completion = await getSetupCompletion();
    expect(completion).toEqual({
      apiKey: true,
      company: true,
      voice: true,
      guardrails: true,
    });

    const draftId = createId("draft");
    await saveDraft({
      id: draftId,
      topic: { text: "Test topic", links: [], attachments: [] },
      topicLabel: "Test topic",
      researchSources: [],
      outline: "",
      writeDraft: "",
      editedDraft: "",
      guardrailedDraft: "",
      attribution: { citationMap: {}, sources: [] },
      currentStep: "topic",
      updatedAt: toIsoTimestamp(),
    });

    const loadedDraft = await getDraft(draftId);
    expect(loadedDraft?.id).toBe(draftId);

    await savePost({
      id: createId("post"),
      title: "Post title",
      markdown: "# Hello",
      attribution: { citationMap: {}, sources: [] },
      createdAt: toIsoTimestamp(),
      sessionId: createId("session"),
    });

    const posts = await getPosts();
    expect(posts.length).toBe(1);

    await saveSession({
      id: "session-a",
      name: "Session A",
      createdAt: toIsoTimestamp(),
      mode: "production",
      events: [],
      llmCache: [],
    });

    const sessions = await getSessions();
    expect(sessions.some((session) => session.id === "session-a")).toBe(true);

    const config = await getConfiguration();
    expect(config.apiKey).toBe("test-key");

    const drafts = await getDrafts();
    expect(drafts.length).toBe(1);
  });
});

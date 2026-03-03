export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export const confirmationSchema: JsonSchema = {
  type: "object",
  required: ["confirmation", "confidence"],
  properties: {
    confirmation: { type: "string" },
    confidence: { type: "number" },
  },
};

export const researchSchema: JsonSchema = {
  type: "object",
  required: ["sources"],
  properties: {
    sources: {
      type: "array",
      items: {
        type: "object",
        required: ["url", "title", "author", "publicationDate", "snippet"],
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          author: { type: "string" },
          publicationDate: { type: "string" },
          snippet: { type: "string" },
        },
      },
    },
  },
};

export const trendSchema: JsonSchema = {
  type: "object",
  required: ["trends"],
  properties: {
    trends: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "score", "summary", "sources"],
        properties: {
          label: { type: "string" },
          score: { type: "number" },
          summary: { type: "string" },
          sources: {
            type: "array",
            items: {
              type: "object",
              required: [
                "url",
                "title",
                "author",
                "publicationDate",
                "snippet",
              ],
              properties: {
                url: { type: "string" },
                title: { type: "string" },
                author: { type: "string" },
                publicationDate: { type: "string" },
                snippet: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const promptSchema: JsonSchema = {
  type: "object",
  required: ["prompts"],
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "rationale", "topicPrefill"],
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          topicPrefill: { type: "string" },
        },
      },
    },
  },
};

export const outlineSchema: JsonSchema = {
  type: "object",
  required: ["outline"],
  properties: {
    outline: { type: "string" },
  },
};

export const writeSchema: JsonSchema = {
  type: "object",
  required: ["markdown", "citationMap"],
  properties: {
    markdown: { type: "string" },
    citationMap: { type: "string" },
  },
};

import { useMemo, useState } from "react";
import RichInput, { emptyRichInput } from "../../components/RichInput";
import Card from "../../components/Card";
import { LlmClient } from "../../lib/llm";
import { confirmationSchema } from "../../lib/llm-schemas";
import type { ConfirmedContent, RichInputValue } from "../../lib/types";

interface ConfirmedRichStepProps {
  title: string;
  testId: string;
  configApiKey: string;
  existing?: ConfirmedContent;
  onSave: (value: ConfirmedContent) => Promise<void>;
}

interface ConfirmationResponse {
  confirmation: string;
  confidence: number;
}

export default function ConfirmedRichStep({
  title,
  testId,
  configApiKey,
  existing,
  onSave,
}: ConfirmedRichStepProps): JSX.Element {
  const [input, setInput] = useState<RichInputValue>(
    existing?.raw ?? emptyRichInput(),
  );
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [confirmation, setConfirmation] = useState(
    existing?.confirmation ?? "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canConfirm = useMemo(() => input.text.trim().length > 20, [input.text]);

  const runConfirmation = async () => {
    if (!configApiKey) {
      setError("Save API key before running confirmation.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const prompt = [
        `You are confirming ${title.toLowerCase()} for a newsletter engine.`,
        "Summarize this input into one actionable paragraph and include confidence 0-1.",
        `Text: ${input.text}`,
        `Links: ${input.links.join(", ") || "none"}`,
        `Attachments: ${input.attachments.map((file) => file.name).join(", ") || "none"}`,
      ].join("\n");

      const client = new LlmClient(configApiKey);
      const response = await client.runJson<ConfirmationResponse>({
        prompt,
        schema: confirmationSchema,
        schemaName: `${title.toLowerCase().replace(/\s+/g, "_")}_confirmation`,
        taskType: "important",
        maxRetries: 4,
      });

      setConfirmation(response.confirmation);
      setStage("confirm");
    } catch (llmError) {
      setError(
        llmError instanceof Error ? llmError.message : "Failed to confirm",
      );
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const confirmed: ConfirmedContent = {
      raw: input,
      confirmation,
      confirmedAt: new Date().toISOString(),
    };

    setBusy(true);
    setError("");
    try {
      await onSave(confirmed);
      setStage("input");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save confirmation",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={title}>
      {stage === "input" ? (
        <>
          <RichInput
            label={`Define ${title.toLowerCase()}`}
            value={input}
            onChange={setInput}
            placeholder={`Describe ${title.toLowerCase()} in detail`}
            testId={testId}
          />
          <div className="actions">
            <button
              type="button"
              onClick={runConfirmation}
              disabled={!canConfirm || busy}
            >
              Confirm with Gemini 3.1 Pro
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{confirmation}</p>
          <div className="actions">
            <button type="button" onClick={() => setStage("input")}>
              Back
            </button>
            <button
              type="button"
              className="primary"
              onClick={save}
              disabled={busy}
            >
              Save Confirmation
            </button>
          </div>
        </>
      )}
      {error ? <p className="error">{error}</p> : null}
    </Card>
  );
}

import ConfirmedRichStep from "./ConfirmedRichStep";
import type { ConfirmedContent } from "../../lib/types";

interface GuardrailsStepProps {
  apiKey: string;
  existing?: ConfirmedContent;
  onSave: (value: ConfirmedContent) => Promise<void>;
}

export default function GuardrailsStep({
  apiKey,
  existing,
  onSave,
}: GuardrailsStepProps): JSX.Element {
  return (
    <ConfirmedRichStep
      title="Guardrails"
      testId="guardrails-rich-input"
      configApiKey={apiKey}
      existing={existing}
      onSave={onSave}
    />
  );
}

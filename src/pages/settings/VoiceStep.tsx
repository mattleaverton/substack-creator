import ConfirmedRichStep from "./ConfirmedRichStep";
import type { ConfirmedContent } from "../../lib/types";

interface VoiceStepProps {
  apiKey: string;
  existing?: ConfirmedContent;
  onSave: (value: ConfirmedContent) => Promise<void>;
}

export default function VoiceStep({
  apiKey,
  existing,
  onSave,
}: VoiceStepProps): JSX.Element {
  return (
    <ConfirmedRichStep
      title="Voice Definition"
      testId="voice-rich-input"
      configApiKey={apiKey}
      existing={existing}
      onSave={onSave}
    />
  );
}

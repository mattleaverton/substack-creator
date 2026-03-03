import ConfirmedRichStep from "./ConfirmedRichStep";
import type { ConfirmedContent } from "../../lib/types";

interface CompanyStepProps {
  apiKey: string;
  existing?: ConfirmedContent;
  onSave: (value: ConfirmedContent) => Promise<void>;
}

export default function CompanyStep({
  apiKey,
  existing,
  onSave,
}: CompanyStepProps): JSX.Element {
  return (
    <ConfirmedRichStep
      title="Company Identity"
      testId="company-rich-input"
      configApiKey={apiKey}
      existing={existing}
      onSave={onSave}
    />
  );
}

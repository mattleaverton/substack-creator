import RichInput from "../../components/RichInput";
import type { RichInputValue } from "../../lib/types";

interface TopicStepProps {
  value: RichInputValue;
  onChange: (next: RichInputValue) => void;
  onResearch: () => void;
  busy: boolean;
}

export default function TopicStep({
  value,
  onChange,
  onResearch,
  busy,
}: TopicStepProps): JSX.Element {
  const canResearch = value.text.trim().length > 20;

  return (
    <div>
      <RichInput
        label="Topic"
        value={value}
        onChange={onChange}
        placeholder="Describe the post topic, key audience, desired angle, and outcomes."
        testId="new-post-topic-input"
      />
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={onResearch}
          disabled={!canResearch || busy}
        >
          Research
        </button>
      </div>
    </div>
  );
}

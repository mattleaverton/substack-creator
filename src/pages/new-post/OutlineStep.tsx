interface OutlineStepProps {
  outline: string;
  loading: boolean;
  onGenerate: () => void;
  onAccept: () => void;
  onBack: () => void;
}

export default function OutlineStep({
  outline,
  loading,
  onGenerate,
  onAccept,
  onBack,
}: OutlineStepProps): JSX.Element {
  return (
    <div>
      {outline ? (
        <pre style={{ whiteSpace: "pre-wrap" }}>{outline}</pre>
      ) : (
        <p className="subtle">No outline yet.</p>
      )}

      <div className="actions">
        <button type="button" onClick={onBack}>
          Back to Research
        </button>
        {!outline ? (
          <button
            type="button"
            className="primary"
            onClick={onGenerate}
            disabled={loading}
          >
            Generate Outline
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={onAccept}
            disabled={loading}
          >
            Accept Outline
          </button>
        )}
      </div>
    </div>
  );
}

import type { ResearchSource } from "../../lib/types";

interface ResearchStepProps {
  sources: ResearchSource[];
  loading: boolean;
  onToggleHighlight: (id: string) => void;
  onDelete: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ResearchStep({
  sources,
  loading,
  onToggleHighlight,
  onDelete,
  onNext,
  onBack,
}: ResearchStepProps): JSX.Element {
  return (
    <div>
      {sources.map((source) => (
        <article
          key={source.id}
          className={`source-card ${source.highlight ? "highlight" : ""}`}
        >
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title}
          </a>
          <p className="subtle">
            {source.author} · {source.publicationDate}
          </p>
          <p>{source.snippet}</p>
          <div className="actions">
            <button type="button" onClick={() => onToggleHighlight(source.id)}>
              {source.highlight ? "Unhighlight" : "Highlight"}
            </button>
            <button type="button" onClick={() => onDelete(source.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}

      {!sources.length && !loading ? (
        <p className="subtle">No sources yet.</p>
      ) : null}

      <div className="actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="primary"
          onClick={onNext}
          disabled={sources.length === 0 || loading}
        >
          Generate Outline
        </button>
      </div>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResearchSource } from "../../lib/types";

interface CompleteStepProps {
  markdown: string;
  sources: ResearchSource[];
  citationMap: Record<string, string>;
  onFinish: () => void;
}

export default function CompleteStep({
  markdown,
  sources,
  citationMap,
  onFinish,
}: CompleteStepProps): JSX.Element {
  return (
    <div>
      <article className="serif-preview" data-testid="complete-post-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>

        <h3>Footnotes</h3>
        <ol>
          {Object.entries(citationMap).map(([citation, sourceId]) => {
            const source = sources.find((entry) => entry.id === sourceId);
            if (!source) {
              return <li key={citation}>[{citation}] Source not available.</li>;
            }

            return (
              <li key={citation}>
                [{citation}] <a href={source.url}>{source.title}</a> —{" "}
                {source.author} ({source.publicationDate})
              </li>
            );
          })}
        </ol>
      </article>

      <div className="actions">
        <button type="button" className="primary" onClick={onFinish}>
          Save and Return to Dashboard
        </button>
      </div>
    </div>
  );
}

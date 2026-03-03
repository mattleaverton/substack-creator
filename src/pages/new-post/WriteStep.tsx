import ProgressBar from "../../components/ProgressBar";

interface WriteStepProps {
  cycle: "write" | "edit" | "guardrails" | "done";
  progress: number;
  error: string;
}

export default function WriteStep({
  cycle,
  progress,
  error,
}: WriteStepProps): JSX.Element {
  return (
    <div>
      <ProgressBar progress={progress} label="Running automated write cycles" />
      <ul>
        <li>
          {cycle === "write" ? "Writing draft..." : "Write cycle complete"}
        </li>
        <li>
          {cycle === "edit"
            ? "Editing for style..."
            : cycle === "guardrails" || cycle === "done"
              ? "Edit cycle complete"
              : "Edit cycle pending"}
        </li>
        <li>
          {cycle === "guardrails"
            ? "Applying guardrails..."
            : cycle === "done"
              ? "Guardrails cycle complete"
              : "Guardrails cycle pending"}
        </li>
      </ul>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

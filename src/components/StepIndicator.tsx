interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function statusForIndex(
  index: number,
  currentStep: number,
): "done" | "current" | "future" {
  if (index < currentStep) {
    return "done";
  }

  if (index === currentStep) {
    return "current";
  }

  return "future";
}

export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps): JSX.Element {
  return (
    <ol className="step-indicator" data-testid="step-indicator">
      {steps.map((step, index) => {
        const status = statusForIndex(index, currentStep);

        return (
          <li key={step} className={`step step-${status}`}>
            <span className="step-dot" aria-hidden="true" />
            <span className="step-label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

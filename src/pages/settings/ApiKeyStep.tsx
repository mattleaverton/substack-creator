import { useState } from "react";

interface ApiKeyStepProps {
  apiKey: string;
  onSave: (key: string) => Promise<void>;
}

export default function ApiKeyStep({
  apiKey,
  onSave,
}: ApiKeyStepProps): JSX.Element {
  const [value, setValue] = useState(apiKey);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await onSave(value.trim());
      setMessage("API key saved locally.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save API key",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="kicker">API key setup</p>
      <input
        className="input"
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Paste your Gemini API key"
        data-testid="api-key-input"
      />
      <div className="actions">
        <button
          type="button"
          onClick={save}
          disabled={saving || value.trim().length === 0}
        >
          Save API Key
        </button>
      </div>
      {message ? <p className="subtle">{message}</p> : null}
    </div>
  );
}

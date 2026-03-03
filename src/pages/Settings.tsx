import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import ApiKeyStep from "./settings/ApiKeyStep";
import CompanyStep from "./settings/CompanyStep";
import GuardrailsStep from "./settings/GuardrailsStep";
import VoiceStep from "./settings/VoiceStep";
import {
  getConfiguration,
  getSetupCompletion,
  resetEverything,
  upsertConfiguration,
} from "../lib/db";
import type { ConfigurationState, SetupCompletion } from "../lib/types";

const EMPTY_COMPLETION: SetupCompletion = {
  apiKey: false,
  company: false,
  voice: false,
  guardrails: false,
};

export default function Settings(): JSX.Element {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigurationState | null>(null);
  const [completion, setCompletion] =
    useState<SetupCompletion>(EMPTY_COMPLETION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    const [latestConfig, latestCompletion] = await Promise.all([
      getConfiguration(),
      getSetupCompletion(),
    ]);
    setConfig(latestConfig);
    setCompletion(latestCompletion);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const readyForDashboard = useMemo(
    () =>
      completion.apiKey &&
      completion.company &&
      completion.voice &&
      completion.guardrails,
    [completion],
  );

  if (loading || !config) {
    return <p>Loading settings...</p>;
  }

  const saveApiKey = async (apiKey: string) => {
    await upsertConfiguration({ apiKey });
    await refresh();
  };

  return (
    <div>
      <header className="page-header">
        <h1>Settings</h1>
        <p>
          Complete setup items in any order. All data is stored locally in
          IndexedDB.
        </p>
      </header>

      <div className="grid-two">
        <Card title="Status" className="settings-status">
          <div className="status-row">
            <span>API Key</span>
            <span
              className={`status-icon ${completion.apiKey ? "complete" : "incomplete"}`}
            />
          </div>
          <div className="status-row">
            <span>Company</span>
            <span
              className={`status-icon ${completion.company ? "complete" : "incomplete"}`}
            />
          </div>
          <div className="status-row">
            <span>Voice</span>
            <span
              className={`status-icon ${completion.voice ? "complete" : "incomplete"}`}
            />
          </div>
          <div className="status-row">
            <span>Guardrails</span>
            <span
              className={`status-icon ${completion.guardrails ? "complete" : "incomplete"}`}
            />
          </div>
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={!readyForDashboard}
              onClick={() => navigate("/dashboard")}
              data-testid="settings-proceed"
            >
              Proceed to Dashboard
            </button>
          </div>
        </Card>

        <Card title="API Key">
          <ApiKeyStep apiKey={config.apiKey} onSave={saveApiKey} />
        </Card>
      </div>

      <div className="grid-two">
        <CompanyStep
          apiKey={config.apiKey}
          existing={config.company}
          onSave={async (company) => {
            await upsertConfiguration({ company });
            await refresh();
          }}
        />

        <VoiceStep
          apiKey={config.apiKey}
          existing={config.voice}
          onSave={async (voice) => {
            await upsertConfiguration({ voice });
            await refresh();
          }}
        />
      </div>

      <GuardrailsStep
        apiKey={config.apiKey}
        existing={config.guardrails}
        onSave={async (guardrails) => {
          await upsertConfiguration({ guardrails });
          await refresh();
        }}
      />

      <Card>
        <p className="subtle">
          Reset everything removes all local data: config, drafts, sessions, and
          post history.
        </p>
        <div className="actions">
          <button
            type="button"
            className="danger"
            onClick={async () => {
              if (!window.confirm("Delete all local data for this app?")) {
                return;
              }
              await resetEverything();
              await refresh();
              setError("All data removed.");
            }}
            data-testid="reset-everything"
          >
            Reset Everything
          </button>
        </div>
      </Card>

      {error ? <p className="subtle">{error}</p> : null}
    </div>
  );
}

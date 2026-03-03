import { useMemo, useState } from "react";
import type { Attachment, RichInputValue } from "../lib/types";

interface RichInputProps {
  label: string;
  value: RichInputValue;
  onChange: (next: RichInputValue) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  fadeIn?: boolean;
}

function parseLinks(input: string): string[] {
  return input
    .split(",")
    .map((link) => link.trim())
    .filter(Boolean);
}

function formatFile(file: File): Attachment {
  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
}

export default function RichInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  testId,
  fadeIn,
}: RichInputProps): JSX.Element {
  const [linkDraft, setLinkDraft] = useState("");

  const classes = useMemo(() => {
    const base = ["rich-input"];
    if (fadeIn) {
      base.push("prefill-fade-in");
    }
    return base.join(" ");
  }, [fadeIn]);

  const addLink = () => {
    const links = parseLinks(linkDraft);
    if (links.length === 0) {
      return;
    }

    onChange({
      ...value,
      links: [...value.links, ...links],
    });
    setLinkDraft("");
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const attachments = Array.from(files).map(formatFile);
    onChange({
      ...value,
      attachments: [...value.attachments, ...attachments],
    });
  };

  const removeLink = (link: string) => {
    onChange({
      ...value,
      links: value.links.filter((entry) => entry !== link),
    });
  };

  const removeAttachment = (name: string) => {
    onChange({
      ...value,
      attachments: value.attachments.filter((entry) => entry.name !== name),
    });
  };

  return (
    <div className={classes} data-testid={testId}>
      <label className="rich-input-label">{label}</label>
      <textarea
        value={value.text}
        onChange={(event) =>
          onChange({
            ...value,
            text: event.target.value,
          })
        }
        placeholder={placeholder}
        disabled={disabled}
        rows={8}
      />
      <div className="rich-input-toolbar">
        <div className="toolbar-row">
          <input
            type="text"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            placeholder="Paste links separated by commas"
            disabled={disabled}
          />
          <button type="button" onClick={addLink} disabled={disabled}>
            Add Link
          </button>
        </div>
        <div className="toolbar-row">
          <label className="attach-label">
            Attach Files
            <input
              type="file"
              multiple
              onChange={(event) => onFilesSelected(event.target.files)}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
      <div className="token-list">
        {value.links.map((link) => (
          <button
            type="button"
            key={link}
            className="token"
            onClick={() => removeLink(link)}
          >
            {link} ×
          </button>
        ))}
        {value.attachments.map((attachment) => (
          <button
            type="button"
            key={attachment.name}
            className="token"
            onClick={() => removeAttachment(attachment.name)}
          >
            {attachment.name} ×
          </button>
        ))}
      </div>
    </div>
  );
}

export function emptyRichInput(): RichInputValue {
  return {
    text: "",
    links: [],
    attachments: [],
  };
}

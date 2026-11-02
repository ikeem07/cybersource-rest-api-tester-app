import { sanitize } from "@cybersource-tester/domain";
import { Button, Segmented, Space, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { JsonTree } from "./JsonTree";

export function RawJsonPanel({ value }: { value: unknown }) {
  const [mode, setMode] = useState<"complete" | "sanitized">("complete");
  const sanitized = useMemo(() => sanitize(value), [value]);
  const shown = mode === "complete" ? value : sanitized;
  const serialized = JSON.stringify(shown, null, 2);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      void message.success("Copied");
    } catch {
      void message.error("The browser did not allow clipboard access.");
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cybersource-response-sanitized.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space wrap>
        <Segmented
          value={mode}
          onChange={(next) => setMode(next as "complete" | "sanitized")}
          options={[
            { label: "Complete response", value: "complete" },
            { label: "Sanitized", value: "sanitized" },
          ]}
        />
        <Button onClick={() => void copy(serialized)}>Copy JSON</Button>
        <Button onClick={() => void copy(JSON.stringify(sanitized, null, 2))}>
          Copy sanitized JSON
        </Button>
        <Button onClick={download}>Export sanitized JSON</Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Sanitized export redacts card numbers, bank account numbers, and card security codes.
        Request IDs and masked prefix or suffix values are kept. The complete view shows the payload
        returned to this application.
      </Typography.Paragraph>
      <JsonTree value={shown} />
    </Space>
  );
}

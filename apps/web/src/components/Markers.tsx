import { Typography } from "antd";
import type { ReactNode } from "react";

export function Missing({ children = "Not returned" }: { children?: ReactNode }) {
  return <Typography.Text type="secondary">{children}</Typography.Text>;
}

export function Derived({ children }: { children: ReactNode }) {
  return (
    <Typography.Text type="secondary" italic>
      Derived: {children}
    </Typography.Text>
  );
}

import { Layout, Menu, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getHealth } from "./api";
import { DetailsPage } from "./pages/DetailsPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  const location = useLocation();
  const [environment, setEnvironment] = useState<string>("");
  const selected = location.pathname.startsWith("/transactions") ? "details" : "search";

  useEffect(() => {
    void getHealth()
      .then((health) => setEnvironment(health.environment ?? ""))
      .catch(() => setEnvironment(""));
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
          Cybersource Transaction Inspector
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ flex: 1, minWidth: 280 }}
          items={[
            { key: "search", label: <Link to="/">Transaction Search</Link> },
            { key: "details", label: <Link to="/transactions">Transaction Details</Link> },
          ]}
        />
        {environment ? <Tag color="blue">{environment}</Tag> : null}
      </Layout.Header>
      <Layout.Content style={{ padding: 24, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/transactions" element={<DetailsPage />} />
          <Route path="/transactions/:id" element={<DetailsPage />} />
        </Routes>
      </Layout.Content>
    </Layout>
  );
}

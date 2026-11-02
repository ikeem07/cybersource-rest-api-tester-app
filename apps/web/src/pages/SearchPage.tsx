import {
  DATE_RANGE_OPTIONS,
  type DateRangePreset,
  REASON_OUTCOME_LABELS,
  type SearchInput,
  type SummaryRow,
  interpretApplicationName,
  interpretReasonCode,
  isRecord,
  readString,
  readTotalCount,
  readTransactionSummaries,
} from "@cybersource-tester/domain";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import type { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchTransactions } from "../api";
import { Missing } from "../components/Markers";
import { RawJsonPanel } from "../components/RawJsonPanel";

interface SearchForm {
  dateRange?: DateRangePreset;
  customStart?: Dayjs;
  customEnd?: Dayjs;
  merchantReferenceNumber?: string;
  requestId?: string;
  amount?: string;
  sort?: string;
  limit?: number;
}

interface FrozenSearch {
  searchedAt: string;
  values: SearchForm;
}

export function SearchPage() {
  const [form] = Form.useForm<SearchForm>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [frozen, setFrozen] = useState<FrozenSearch | null>(null);
  const dateRange = Form.useWatch("dateRange", form) ?? "last_7_days";

  const summaries = useMemo(() => readSummaries(payload), [payload]);
  const total = readTotal(payload);
  const limit = Form.useWatch("limit", form) ?? 20;

  async function run(input: SearchInput, nextPage: number) {
    setLoading(true);
    setError(null);
    try {
      const result = await searchTransactions(input);
      setPayload(result);
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  const columns: TableColumnsType<SummaryRow> = [
    {
      title: "Transaction Date",
      dataIndex: "submitTimeUtc",
      render: (value: string | undefined) => value ?? <Missing />,
    },
    {
      title: "Request ID",
      dataIndex: "id",
      render: (value: string | undefined) =>
        value ? (
          <Link to={`/transactions/${encodeURIComponent(value)}`}>{value}</Link>
        ) : (
          <Missing />
        ),
    },
    {
      title: "Merchant Reference Number",
      dataIndex: "merchantReferenceNumber",
      render: (value: string | undefined) => value ?? <Missing />,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (value: string | undefined) => value ?? <Missing />,
    },
    {
      title: "Currency",
      dataIndex: "currency",
      render: (value: string | undefined) => value ?? <Missing />,
    },
    {
      title: "Applications",
      dataIndex: "applications",
      render: (names: string[], row) =>
        names.length > 0 ? (
          <Space direction="vertical" size={0}>
            {names.map((name) => {
              const known = interpretApplicationName(name);
              const reason = reasonFor(row, name);
              return (
                <span key={name}>
                  {known.known ? `${name} — ${known.label}` : name}
                  {reason?.code ? ` (${REASON_OUTCOME_LABELS[reason.outcome]})` : ""}
                </span>
              );
            })}
          </Space>
        ) : (
          <Missing />
        ),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (value: string | undefined) => value ?? <Missing />,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3}>Transaction Search</Typography.Title>
        <Typography.Paragraph>
          Calls <Typography.Text code>POST /tss/v2/searches</Typography.Text> through the local API.
          Every search uses America/New_York and USD. Relative ranges are calculated when you click
          Search, and paging keeps those boundaries. Transaction status and application name are not
          search fields.
        </Typography.Paragraph>
      </div>
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            dateRange: "last_7_days",
            sort: "submitTimeUtc:desc",
            limit: 20,
          }}
          onFinish={(values) => {
            const searchedAt = new Date().toISOString();
            setFrozen({ searchedAt, values });
            void run(toInput(values, 1, searchedAt), 1);
          }}
        >
          <Space wrap align="start" size="middle">
            <Form.Item label="Date range" name="dateRange">
              <Select options={[...DATE_RANGE_OPTIONS]} style={{ minWidth: 180 }} />
            </Form.Item>
            <Form.Item
              label="Start date"
              name="customStart"
              hidden={dateRange !== "custom"}
              rules={
                dateRange === "custom" ? [{ required: true, message: "Choose a start date." }] : []
              }
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              label="End date"
              name="customEnd"
              hidden={dateRange !== "custom"}
              dependencies={["customStart"]}
              rules={
                dateRange === "custom"
                  ? [
                      { required: true, message: "Choose an end date." },
                      ({ getFieldValue }) => ({
                        validator(_, value: Dayjs | undefined) {
                          const start = getFieldValue("customStart") as Dayjs | undefined;
                          if (!value || !start) {
                            return Promise.resolve();
                          }
                          if (start.format("YYYY-MM-DD") > value.format("YYYY-MM-DD")) {
                            return Promise.reject(
                              new Error("Start date must be on or before the end date."),
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]
                  : []
              }
            >
              <DatePicker />
            </Form.Item>
            <Form.Item label="Merchant reference number" name="merchantReferenceNumber">
              <Input allowClear placeholder="clientReferenceInformation.code" />
            </Form.Item>
            <Form.Item label="Request ID" name="requestId">
              <Input allowClear placeholder="id" />
            </Form.Item>
            <Form.Item label="Amount" name="amount">
              <Input allowClear placeholder="10.00" />
            </Form.Item>
            <Form.Item label="Sort" name="sort">
              <Select
                style={{ minWidth: 220 }}
                options={[
                  { value: "submitTimeUtc:desc", label: "Date, newest first" },
                  { value: "submitTimeUtc:asc", label: "Date, oldest first" },
                  { value: "id:desc", label: "Request ID descending" },
                  { value: "id:asc", label: "Request ID ascending" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Page size" name="limit">
              <Select
                style={{ width: 100 }}
                options={[10, 20, 50, 100].map((value) => ({ value, label: value }))}
              />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Search
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setFrozen(null);
                setPayload(null);
                setError(null);
                setPage(1);
              }}
            >
              Reset filters
            </Button>
          </Space>
        </Form>
      </Card>
      {error ? <Alert type="error" message={error} showIcon /> : null}
      <Table
        rowKey={(row, index) => row.id ?? `row-${index ?? 0}`}
        columns={columns}
        dataSource={summaries}
        loading={loading}
        locale={{ emptyText: payload ? "Cybersource returned no transactions." : "Run a search." }}
        pagination={{
          current: page,
          pageSize: limit,
          total: total ?? summaries.length,
          showSizeChanger: false,
          onChange: (next) => {
            if (!frozen) {
              return;
            }
            void run(toInput(frozen.values, next, frozen.searchedAt), next);
          },
        }}
      />
      {payload ? (
        <Card title="Raw JSON">
          <RawJsonPanel value={isRecord(payload) ? payload.cybersource : payload} />
        </Card>
      ) : null}
    </Space>
  );
}

function toInput(values: SearchForm, page: number, searchedAt: string): SearchInput {
  const limit = values.limit ?? 20;
  const input: SearchInput = {
    dateRange: values.dateRange ?? "last_7_days",
    searchedAt,
    offset: (page - 1) * limit,
    limit,
    sort: values.sort,
    merchantReferenceNumber: blankToUndefined(values.merchantReferenceNumber),
    requestId: blankToUndefined(values.requestId),
    amount: blankToUndefined(values.amount),
  };
  if (values.dateRange === "custom") {
    input.customStartDate = values.customStart?.format("YYYY-MM-DD");
    input.customEndDate = values.customEnd?.format("YYYY-MM-DD");
  }
  return input;
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readSummaries(payload: unknown): SummaryRow[] {
  if (!isRecord(payload)) {
    return [];
  }
  return readTransactionSummaries(payload.cybersource);
}

function readTotal(payload: unknown): number | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  return readTotalCount(payload.cybersource);
}

function reasonFor(row: SummaryRow, name: string) {
  const applications = row.source.applicationInformation;
  if (!isRecord(applications) || !Array.isArray(applications.applications)) {
    return null;
  }
  for (const application of applications.applications) {
    if (isRecord(application) && readString(application.name) === name) {
      return interpretReasonCode(application.reasonCode);
    }
  }
  return null;
}

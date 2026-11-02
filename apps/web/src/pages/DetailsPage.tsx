import {
  HISTORY_LIMITATION,
  REASON_OUTCOME_LABELS,
  describeSettlement,
  getRecord,
  interpretApplications,
  isRecord,
  readDirectHistory,
  readLineItems,
  readMerchantDefinedData,
  readPath,
  readProcessorChecks,
  readString,
} from "@cybersource-tester/domain";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTransaction } from "../api";
import { JsonTree } from "../components/JsonTree";
import { Derived, Missing } from "../components/Markers";
import { RawJsonPanel } from "../components/RawJsonPanel";

export function DetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [requestId, setRequestId] = useState(params.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  useEffect(() => {
    setRequestId(params.id ?? "");
    if (params.id) {
      void load(params.id);
    }
  }, [params.id]);

  async function load(id: string) {
    setLoading(true);
    setError(null);
    try {
      setPayload(await getTransaction(id));
    } catch (caught) {
      setPayload(null);
      setError(caught instanceof Error ? caught.message : "Transaction details failed.");
    } finally {
      setLoading(false);
    }
  }

  const transaction = isRecord(payload) ? payload.cybersource : undefined;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3}>Transaction Details</Typography.Title>
        <Typography.Paragraph>
          Calls <Typography.Text code>GET /tss/v2/transactions/{"{id}"}</Typography.Text>. Sections
          show only objects returned in this response. Derived text is labeled and is not a
          Cybersource field.
        </Typography.Paragraph>
      </div>
      <Form
        layout="inline"
        onFinish={() => {
          const id = requestId.trim();
          if (!id) {
            return;
          }
          navigate(`/transactions/${encodeURIComponent(id)}`);
        }}
      >
        <Form.Item label="Request ID">
          <Input
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            style={{ width: 360 }}
            placeholder="Cybersource request ID"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Retrieve
        </Button>
      </Form>
      {error ? <Alert type="error" message={error} showIcon /> : null}
      {isRecord(transaction) ? <DetailBody transaction={transaction} /> : null}
    </Space>
  );
}

function DetailBody({ transaction }: { transaction: Record<string, unknown> }) {
  const history = readDirectHistory(transaction);
  const applications = interpretApplications(transaction);
  const checks = readProcessorChecks(transaction);
  const lineItems = readLineItems(transaction);
  const merchantData = readMerchantDefinedData(transaction);

  return (
    <Tabs
      items={[
        {
          key: "sections",
          label: "Sections",
          children: (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Alert type="info" showIcon message={describeSettlement(transaction)} />
              <Section
                title="1. Order Information"
                value={getRecord(transaction, "orderInformation")}
              />
              <Card title="2. Transaction History / Related Transaction Identifiers">
                <Alert
                  type="warning"
                  showIcon
                  message={HISTORY_LIMITATION}
                  style={{ marginBottom: 16 }}
                />
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="id">{history.id ?? <Missing />}</Descriptions.Item>
                  <Descriptions.Item label="rootId">
                    {history.rootId ?? <Missing />}
                  </Descriptions.Item>
                  <Descriptions.Item label="reconciliationId">
                    {history.reconciliationId ?? <Missing />}
                  </Descriptions.Item>
                  <Descriptions.Item label="merchantId">
                    {history.merchantId ?? <Missing />}
                  </Descriptions.Item>
                </Descriptions>
                <Typography.Title level={5}>Links returned on this response</Typography.Title>
                {history.links ? (
                  <JsonTree value={history.links} />
                ) : (
                  <Missing>No _links object</Missing>
                )}
                <Typography.Title level={5}>relatedTransactions</Typography.Title>
                {history.related === undefined ? (
                  <Missing>Not returned. A complete history was not inferred.</Missing>
                ) : (
                  <JsonTree value={history.related} />
                )}
              </Card>
              <Section title="3. Customer Information" value={customerValue(transaction)} />
              <Section title="4. Request Information" value={requestValue(transaction)} />
              <Section
                title="5. Payment Information"
                value={getRecord(transaction, "paymentInformation")}
              />
              <Card title="6. Processing Information">
                <Typography.Paragraph>
                  <Derived>
                    AVS and card verification descriptions come from the code tables. Raw processor
                    codes are separate and are not used as the normalized result.
                  </Derived>
                </Typography.Paragraph>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="processorInformation.avs.code">
                    {checks.avsCode ? (
                      <span>
                        {checks.avsCode.code || <Missing />} —{" "}
                        {checks.avsCode.description ?? "Unknown code, original value preserved"}
                      </span>
                    ) : (
                      <Missing />
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="processorInformation.avs.codeRaw">
                    {checks.avsCodeRaw ?? <Missing />}
                  </Descriptions.Item>
                  <Descriptions.Item label="processorInformation.cardVerification.resultCode">
                    {checks.cvnCode ? (
                      <span>
                        {checks.cvnCode.code || <Missing />} —{" "}
                        {checks.cvnCode.description ?? "Unknown code, original value preserved"}
                      </span>
                    ) : (
                      <Missing />
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="processorInformation.cardVerification.resultCodeRaw">
                    {checks.cvnCodeRaw ?? <Missing />}
                  </Descriptions.Item>
                </Descriptions>
                <Typography.Title level={5}>processingInformation</Typography.Title>
                <ObjectBody value={getRecord(transaction, "processingInformation")} />
                <Typography.Title level={5}>processorInformation</Typography.Title>
                <ObjectBody value={getRecord(transaction, "processorInformation")} />
              </Card>
              <Section
                title="7. Point of Sale Information"
                value={getRecord(transaction, "pointOfSaleInformation")}
              />
              <CollectionSection title="8. Line Items" view={lineItems} />
              <CollectionSection title="9. Merchant Defined Data" view={merchantData} />
              <Card title="10. Application Information">
                {applications.length === 0 ? (
                  <Missing>applicationInformation.applications was not returned.</Missing>
                ) : (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey={(row) =>
                      `${row.name}-${row.reconciliationId ?? ""}-${row.reasonCode?.code ?? ""}`
                    }
                    dataSource={applications}
                    columns={[
                      {
                        title: "Application",
                        render: (_, row) => (
                          <span>
                            {row.name || <Missing />}
                            {row.knownName ? ` — ${row.label}` : " (unknown name preserved)"}
                            {row.official && row.official !== row.label ? (
                              <div>
                                <Derived>Services table name: {row.official}</Derived>
                              </div>
                            ) : null}
                          </span>
                        ),
                      },
                      {
                        title: "Reason code",
                        render: (_, row) =>
                          row.reasonCode ? (
                            <span>
                              {row.reasonCode.code || <Missing />}{" "}
                              <Tag>{REASON_OUTCOME_LABELS[row.reasonCode.outcome]}</Tag>
                              <div>
                                {row.reasonCode.description ?? "No documented description."}
                              </div>
                              <Derived>Outcome is interpreted. It is not a response field.</Derived>
                            </span>
                          ) : (
                            <Missing />
                          ),
                      },
                      {
                        title: "Returned flags",
                        render: (_, row) => (
                          <div>
                            <div>rCode: {row.rCode ?? <Missing />}</div>
                            <div>rFlag: {row.rFlag ?? <Missing />}</div>
                            <div>rMessage: {row.rMessage ?? <Missing />}</div>
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
                <ObjectBody value={getRecord(transaction, "applicationInformation")} />
              </Card>
            </Space>
          ),
        },
        {
          key: "raw",
          label: "Raw JSON",
          children: <RawJsonPanel value={transaction} />,
        },
      ]}
    />
  );
}

function Section({ title, value }: { title: string; value: unknown }) {
  return (
    <Card title={title}>
      <ObjectBody value={value} />
    </Card>
  );
}

function ObjectBody({ value }: { value: unknown }) {
  if (value === undefined) {
    return <Missing>Not returned by this response.</Missing>;
  }
  return <JsonTree value={value} />;
}

function CollectionSection({
  title,
  view,
}: {
  title: string;
  view: ReturnType<typeof readLineItems>;
}) {
  return (
    <Card title={title}>
      {view.state === "missing" ? <Missing>Not returned by this response.</Missing> : null}
      {view.state === "empty" ? <Missing>Returned as an empty list.</Missing> : null}
      {view.state === "invalid" ? (
        <Missing>The field was returned in an unexpected shape. See Raw JSON.</Missing>
      ) : null}
      {view.state === "present" ? <JsonTree value={view.items} /> : null}
    </Card>
  );
}

function customerValue(transaction: Record<string, unknown>): Record<string, unknown> | undefined {
  const buyer = getRecord(transaction, "buyerInformation");
  const billTo = readPath(transaction, ["orderInformation", "billTo"]);
  const shipTo = readPath(transaction, ["orderInformation", "shipTo"]);
  if (!buyer && !isRecord(billTo) && !isRecord(shipTo)) {
    return undefined;
  }
  return {
    buyerInformation: buyer ?? "Not returned",
    billTo: isRecord(billTo) ? billTo : "Not returned",
    shipTo: isRecord(shipTo) ? shipTo : "Not returned",
  };
}

function requestValue(transaction: Record<string, unknown>): Record<string, unknown> {
  return {
    id: readString(transaction.id) ?? "Not returned",
    submitTimeUtc: readString(transaction.submitTimeUtc) ?? "Not returned",
    merchantId: readString(transaction.merchantId) ?? "Not returned",
    clientReferenceInformation:
      getRecord(transaction, "clientReferenceInformation") ?? "Not returned",
  };
}

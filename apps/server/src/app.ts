import path from "node:path";
import {
  HISTORY_LIMITATION,
  ValidationError,
  buildSearchRequest,
  describeSettlement,
  interpretApplications,
  parseSearchInput,
  parseTransactionId,
  readLineItems,
  readMerchantDefinedData,
  readProcessorChecks,
  readTotalCount,
  readTransactionSummaries,
} from "@cybersource-tester/domain";
import express, { type ErrorRequestHandler, type Express } from "express";
import { type CybersourceGateway, UpstreamError } from "./cybersource-client.js";

export interface AppOptions {
  readonly client: CybersourceGateway;
  readonly environment: string;
  readonly staticDir?: string;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      service: "cybersource-transaction-inspector",
      environment: options.environment,
    });
  });

  app.post("/api/transactions/search", async (request, response, next) => {
    try {
      const built = buildSearchRequest(parseSearchInput(request.body));
      const result = await options.client.search(built.body);
      response.status(200).json({
        httpStatus: result.status,
        request: {
          method: "POST",
          path: "/tss/v2/searches",
          body: built.body,
        },
        cybersource: result.data,
        summaries: readTransactionSummaries(result.data),
        totalCount: readTotalCount(result.data),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/:id", async (request, response, next) => {
    try {
      const id = parseTransactionId(request.params.id);
      const result = await options.client.getTransaction(id);
      response.status(200).json({
        httpStatus: result.status,
        request: {
          method: "GET",
          path: `/tss/v2/transactions/${id}`,
        },
        cybersource: result.data,
        applications: interpretApplications(result.data),
        settlement: {
          derived: true,
          text: describeSettlement(result.data),
        },
        historyNote: HISTORY_LIMITATION,
        lineItems: readLineItems(result.data),
        merchantDefinedInformation: readMerchantDefinedData(result.data),
        processorChecks: readProcessorChecks(result.data),
      });
    } catch (error) {
      next(error);
    }
  });

  if (options.staticDir) {
    const staticDir = options.staticDir;
    app.use(express.static(staticDir));
    app.get("*", (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(path.join(staticDir, "index.html"), (error) => {
        if (error) {
          next();
        }
      });
    });
  }

  app.use(((error, _request, response, _next) => {
    if (error instanceof ValidationError) {
      response.status(400).json({
        error: { code: "VALIDATION_ERROR", message: error.message, status: 400 },
      });
      return;
    }
    if (error instanceof UpstreamError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
          cybersourceStatus: error.upstreamStatus,
          details: error.details,
        },
      });
      return;
    }
    if (error instanceof SyntaxError) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body must be valid JSON.",
          status: 400,
        },
      });
      return;
    }
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
        status: 500,
      },
    });
  }) as ErrorRequestHandler);

  return app;
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { getCorsOptions } from "./middleware/cors.js";
import { authMiddleware } from "./middleware/auth.js";
import { ServiceError } from "./clients/base.js";
import { router as authRouter } from "./routes/auth.js";
import { router as affiliateRouter } from "./routes/affiliate.js";
import { router as promoGatewayRouter } from "./routes/promoGateway.js";
import { router as orderRouter } from "./routes/order.js";
import { router as dashboardRouter } from "./routes/dashboard.js";

const app = express();

app.use(helmet());
app.use(morgan("combined"));
app.use(cors(getCorsOptions()));
app.use(express.json());
app.use(authMiddleware);

app.use("/bff/auth", authRouter);
app.use("/bff/affiliate", affiliateRouter);
app.use("/bff/promo", promoGatewayRouter);
app.use("/bff/order", orderRouter);
app.use("/bff", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "yutaka-bff" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ServiceError) {
    res.status(err.status).json({ error: err.message, details: err.body });
  } else {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const server = app.listen(config.PORT, () => {
  console.log(`Yutaka BFF (API Gateway) listening on port ${config.PORT}`);
});

export { app, server };

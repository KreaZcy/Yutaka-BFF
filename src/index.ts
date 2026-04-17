import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { getCorsOptions } from "./middleware/cors.js";
import { authMiddleware } from "./middleware/auth.js";
import { router as affiliateRouter } from "./routes/affiliate.js";
import { router as promoRouter } from "./routes/promo.js";
import { router as dashboardRouter } from "./routes/dashboard.js";

const app = express();

app.use(helmet());
app.use(morgan("combined"));
app.use(cors(getCorsOptions()));
app.use(express.json());
app.use(authMiddleware);

app.use("/bff/affiliate", affiliateRouter);
app.use("/bff/promo", promoRouter);
app.use("/bff", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "yutaka-bff" });
});

const server = app.listen(config.PORT, () => {
  console.log(`Yutaka BFF listening on port ${config.PORT}`);
});

export { app, server };

import express from "express";
import { serviceFetch } from "../clients/base.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const promoUrl = (path: string) => `${config.PROMO_SERVICE_URL}/promo${path}`;

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return "";
}

const serviceHeaders = (req: express.Request) => ({
  Authorization: `Bearer ${buildServiceToken(req)}`,
});

router.get("/validate", async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${promoUrl("/validate")}?${qs}`);
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/apply", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(promoUrl("/apply"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.get("/admin/list", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${promoUrl("/admin/list")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl(`/admin/${req.params.id}`), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/admin/create", requireAuth, async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(promoUrl("/admin/create"), {
      method: "POST",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.put("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl(`/admin/${req.params.id}`), {
      method: "PUT",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.delete("/admin/:id", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl(`/admin/${req.params.id}`), {
      method: "DELETE",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/:id/usage", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${promoUrl(`/admin/${req.params.id}/usage`)}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/affiliate/codes", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl("/affiliate/codes"), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/internal/commission/confirm", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl("/internal/commission/confirm"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/internal/commission/cancel", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl("/internal/commission/cancel"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/internal/usage/reverse", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(promoUrl("/internal/usage/reverse"), {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

export { router };

import express from "express";
import { promoService } from "../clients/promo.js";

const router = express.Router();

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return req.headers.authorization?.slice(7) || "";
}

router.get("/list", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = buildServiceToken(req);
    const { data } = await promoService.listPromos(req.query as any, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = buildServiceToken(req);
    const { data } = await promoService.getPromo(req.params.id, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = buildServiceToken(req);
    const { data } = await promoService.updatePromo(req.params.id, req.body, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = buildServiceToken(req);
    await promoService.deactivatePromo(req.params.id, token);
    res.json({ message: "Promo deactivated" });
  } catch (err) { next(err); }
});

router.get("/:id/usage", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = buildServiceToken(req);
    const { data } = await promoService.getPromoUsage(req.params.id, req.query as any, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/validate", async (req, res, next) => {
  try {
    const { data } = await promoService.validatePromo(req.query as any);
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/apply", async (req, res, next) => {
  try {
    const { data } = await promoService.applyPromo(req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export { router };

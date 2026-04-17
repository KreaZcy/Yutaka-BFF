import express from "express";
import { rekognizcy } from "../clients/rekognizcy.js";
import { afiliazcy } from "../clients/afiliazcy.js";
import { promoService } from "../clients/promo.js";

const router = express.Router();

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return req.headers.authorization?.slice(7) || "";
}

router.post("/create", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Authorization required" }); return; }
    const token = authHeader.slice(7);
    const adminToken = req.headers["x-admin-token"] as string;
    if (!adminToken) { res.status(401).json({ error: "Admin token required" }); return; }

    const { name, email, phone, password, commissionRate, discountType, discountValue } = req.body;
    if (!name || !email || !password || !commissionRate) {
      res.status(400).json({ error: "name, email, password, commissionRate required" });
      return;
    }

    const { data: roles } = await rekognizcy.listRoles(adminToken);
    let affiliateRole = (roles as Array<{ id: string; name: string }>).find((r) => r.name === "affiliate");
    if (!affiliateRole) {
      const { data } = await rekognizcy.createRole("affiliate", "Affiliate partner", adminToken);
      affiliateRole = data as { id: string; name: string };
    }

    const { data: user } = await rekognizcy.createUser({
      email,
      username: email.split("@")[0] + "_" + Date.now(),
      password,
      role_ids: [affiliateRole.id],
    }, adminToken);

    const { data: affiliate } = await afiliazcy.createAffiliate({
      name, email, phone,
      metadata: { commissionRate, userId: (user as any).id },
    }, adminToken);

    res.status(201).json({ user, affiliate });
  } catch (err: any) {
    next(err);
  }
});

router.get("/list", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) { res.status(401).json({ error: "Authorization required" }); return; }
    const { data } = await afiliazcy.listAffiliates(token);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) { res.status(401).json({ error: "Authorization required" }); return; }
    const { data } = await afiliazcy.getAffiliate(req.params.id, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) { res.status(401).json({ error: "Authorization required" }); return; }
    const { data } = await afiliazcy.updateAffiliate(req.params.id, req.body, token);
    res.json(data);
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) { res.status(401).json({ error: "Authorization required" }); return; }
    const { data: affiliate } = await afiliazcy.getAffiliate(req.params.id, token);
    if ((affiliate as any)?.metadata?.userId) {
      await rekognizcy.deleteUser((affiliate as any).metadata.userId as string, token);
    }
    await afiliazcy.deleteAffiliate(req.params.id, token);
    res.json({ message: "Affiliate deleted" });
  } catch (err) { next(err); }
});

router.post("/:id/code", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    const adminToken = req.headers["x-admin-token"] as string;
    if (!token || !adminToken) { res.status(401).json({ error: "Authorization required" }); return; }
    const { code, commissionRate } = req.body;
    if (!code) { res.status(400).json({ error: "code is required" }); return; }

    const { data: affiliate } = await afiliazcy.getAffiliate(req.params.id, token);
    await afiliazcy.addCode(req.params.id, code, token);
    await promoService.createPromo({
      code: code.toUpperCase(),
      type: "affiliate",
      discountType: (req.body.discountType as any) || (affiliate as any)?.metadata?.discountType || "percentage",
      discountValue: req.body.discountValue || (affiliate as any)?.metadata?.discountValue || 10,
      affiliatorId: req.params.id,
      commissionAmount: commissionRate || 0,
      dayCondition: "all",
      expiryType: "none",
    }, buildServiceToken(req));
    res.json({ message: "Code added and promo created" });
  } catch (err) { next(err); }
});

router.delete("/:id/code", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    const adminToken = req.headers["x-admin-token"] as string;
    if (!token || !adminToken) { res.status(401).json({ error: "Authorization required" }); return; }
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: "code is required" }); return; }
    await afiliazcy.removeCode(req.params.id, code, token);
    await promoService.deactivatePromo(code, buildServiceToken(req));
    res.json({ message: "Code removed and promo deactivated" });
  } catch (err) { next(err); }
});

router.get("/:id/codes", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.slice(7);
    if (!token) { res.status(401).json({ error: "Authorization required" }); return; }
    const affiliatorId = req.auth?.user_id;
    const { data } = await promoService.getAffiliateCodes(buildServiceToken(req));
    const filtered = (data as Array<any>).filter((p: any) => p.affiliatorId === affiliatorId);
    res.json({ codes: filtered });
  } catch (err) { next(err); }
});

export { router };

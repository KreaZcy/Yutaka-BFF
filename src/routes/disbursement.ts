import express from "express";
import { afiliazcy } from "../clients/afiliazcy.js";
import { promoService } from "../clients/promo.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return "";
}

router.get("/balance", requireAuth, async (req, res, next) => {
  try {
    if (!req.auth?.roles.includes("affiliate")) {
      res.status(403).json({ error: "Affiliate access required" });
      return;
    }
    const token = buildServiceToken(req);
    const userId = req.auth.user_id;

    const { data: affiliates } = await afiliazcy.listAffiliates(token);
    const affiliate = (affiliates as Array<any>).find((a: any) => a.metadata?.userId === userId);
    if (!affiliate) {
      res.status(404).json({ error: "Affiliate profile not found" });
      return;
    }

    const [codesRes, disbursementsRes] = await Promise.all([
      promoService.getAffiliateCodes(token),
      afiliazcy.listDisbursements({ affiliate_id: affiliate.id }, token),
    ]);

    const codesRaw = codesRes.data as any;
    const codes = Array.isArray(codesRaw) ? codesRaw : (codesRaw?.codes || []);
    const confirmedCommission = codes.reduce((s: number, c: any) => s + ((c.commissionAmount || 0) * (c.usageCount || 0)), 0);

    const disbursements = disbursementsRes.data as Array<any>;
    const totalDisbursed = disbursements.filter((d: any) => d.status === "processed").reduce((s: number, d: any) => s + (d.quota || 0), 0);
    const pendingPayouts = disbursements.filter((d: any) => d.status === "pending").reduce((s: number, d: any) => s + (d.quota || 0), 0);

    res.json({
      affiliateId: affiliate.id,
      totalUsage: codes.reduce((s: number, c: any) => s + (c.usageCount || 0), 0),
      confirmedCommission,
      pendingPayouts,
      totalDisbursed,
      availableForPayout: Math.max(0, confirmedCommission - totalDisbursed - pendingPayouts),
      disbursements,
    });
  } catch (err) { next(err); }
});

router.post("/request", requireAuth, async (req, res, next) => {
  try {
    if (!req.auth?.roles.includes("affiliate")) {
      res.status(403).json({ error: "Affiliate access required" });
      return;
    }
    const token = buildServiceToken(req);
    const userId = req.auth.user_id;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Valid amount is required" });
      return;
    }

    const { data: affiliates } = await afiliazcy.listAffiliates(token);
    const affiliate = (affiliates as Array<any>).find((a: any) => a.metadata?.userId === userId);
    if (!affiliate) {
      res.status(404).json({ error: "Affiliate profile not found" });
      return;
    }

    const [codesRes, disbursementsRes] = await Promise.all([
      promoService.getAffiliateCodes(token),
      afiliazcy.listDisbursements({ affiliate_id: affiliate.id }, token),
    ]);

    const codesRaw = codesRes.data as any;
    const codes = Array.isArray(codesRaw) ? codesRaw : (codesRaw?.codes || []);
    const confirmedCommission = codes.reduce((s: number, c: any) => s + ((c.commissionAmount || 0) * (c.usageCount || 0)), 0);
    const alreadyDisbursed = (disbursementsRes.data as Array<any>)
      .filter((d: any) => d.status === "processed")
      .reduce((s: number, d: any) => s + (d.quota || 0), 0);
    const pendingPayout = (disbursementsRes.data as Array<any>)
      .filter((d: any) => d.status === "pending")
      .reduce((s: number, d: any) => s + (d.quota || 0), 0);
    const available = confirmedCommission - alreadyDisbursed - pendingPayout;

    if (amount > available) {
      res.status(400).json({ error: `Requested amount ${amount} exceeds available balance ${available}` });
      return;
    }

    const { data: disbursement } = await afiliazcy.createDisbursement({
      affiliate_id: affiliate.id,
      quota: amount,
      metadata: {
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
        note: note || "",
        affiliateName: affiliate.name,
        affiliateEmail: affiliate.email,
      },
    }, token);

    res.status(201).json(disbursement);
  } catch (err) { next(err); }
});

router.get("/list", requireAuth, async (req, res, next) => {
  try {
    if (!req.auth?.roles.includes("admin")) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const token = buildServiceToken(req);
    const status = req.query.status as string;

    const { data } = await afiliazcy.listDisbursements(
      status ? { status } : {},
      token,
    );
    res.json(data);
  } catch (err) { next(err); }
});

router.put("/:id/status", requireAuth, async (req, res, next) => {
  try {
    if (!req.auth?.roles.includes("admin")) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const token = buildServiceToken(req);
    const { status, metadata } = req.body;

    if (!status || !["processed", "rejected"].includes(status)) {
      res.status(400).json({ error: "Status must be 'processed' or 'rejected'" });
      return;
    }

    const updateBody: any = { status };
    if (metadata) updateBody.metadata = metadata;

    const { data } = await afiliazcy.updateDisbursement(req.params.id as string, updateBody, token);
    res.json(data);
  } catch (err) { next(err); }
});

export { router };

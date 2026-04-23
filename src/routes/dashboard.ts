import express from "express";
import { afiliazcy } from "../clients/afiliazcy.js";
import { promoService } from "../clients/promo.js";
import { orderService } from "../clients/order.js";

const router = express.Router();

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return req.headers.authorization?.slice(7) || "";
}

router.get("/dashboard/affiliate", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    if (!req.auth.roles.includes("affiliate")) { res.status(403).json({ error: "Insufficient permissions" }); return; }

    const token = buildServiceToken(req);

    const [codesRes] = await Promise.all([
      promoService.getAffiliateCodes(token),
    ]);

    const codesRaw = codesRes.data as any;
    const codes = Array.isArray(codesRaw) ? codesRaw : (codesRaw?.promos || codesRaw?.codes || []);

    const bookings: any[] = [];
    await Promise.all(codes.map(async (c: any) => {
      try {
        const usageRes = await promoService.getPromoUsage(c.code, { page: 1, limit: 100 }, token);
        const usageData = usageRes.data as any;
        const usages = Array.isArray(usageData?.usages) ? usageData.usages : [];
        bookings.push(...usages);
      } catch { /* skip */ }
    }));

    const confirmedCommission = bookings
      .filter((b: any) => b.commissionStatus === "confirmed")
      .reduce((sum: number, b: any) => sum + (b.commissionAmount || 0), 0);

    const pendingCommission = bookings
      .filter((b: any) => b.commissionStatus === "pending")
      .reduce((sum: number, b: any) => sum + (b.commissionAmount || 0), 0);

    const totalCommission = confirmedCommission + pendingCommission || codes.reduce((s: number, c: any) => s + ((c.commissionAmount || 0) * (c.usageCount || 0)), 0);

    const revenue = bookings
      .reduce((sum: number, b: any) => sum + (b.discountApplied || 0), 0);

    let disbursementInfo: any = { totalDisbursed: 0, pendingPayouts: 0, availableForPayout: totalCommission };
    try {
      const userId = req.auth!.user_id;
      const { data: affiliates } = await afiliazcy.listAffiliates(token);
      const affiliate = (affiliates as Array<any>).find((a: any) => a.metadata?.userId === userId);
      if (affiliate) {
        const [quotaRes, disbursementsRes] = await Promise.all([
          afiliazcy.getUnclaimedQuota(affiliate.id, token),
          afiliazcy.listDisbursements({ affiliate_id: affiliate.id }, token),
        ]);
        const quota = quotaRes.data as any;
        const disbursements = disbursementsRes.data as Array<any>;
        const pending = disbursements.filter((d: any) => d.status === "pending").reduce((s: number, d: any) => s + (d.quota || 0), 0);
        const disbursed = disbursements.filter((d: any) => d.status === "processed").reduce((s: number, d: any) => s + (d.quota || 0), 0);
        disbursementInfo = {
          totalDisbursed: disbursed,
          pendingPayouts: pending,
          availableForPayout: Math.max(0, totalCommission - disbursed - pending),
          recentDisbursements: disbursements.slice(-10).reverse(),
        };
      }
    } catch (err: any) {
      console.error("[DASHBOARD] disbursement fetch failed:", err.message);
    }

    res.json({
      codes: codes.map((c: any) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        commissionAmount: c.commissionAmount,
        usageCount: c.usageCount,
        totalCommission: c.totalCommission > 0 ? c.totalCommission : (c.commissionAmount || 0) * (c.usageCount || 0),
      })),
      stats: { totalBookings: bookings.length, confirmedCommission, pendingCommission, totalCommission: totalCommission || codes.reduce((s: number, c: any) => s + ((c.commissionAmount || 0) * (c.usageCount || 0)), 0), revenue },
      bookings,
      disbursement: disbursementInfo,
    });
  } catch (err) { next(err); }
});

router.get("/dashboard/owner", async (req, res, next) => {
  try {
    if (!req.auth) { res.status(401).json({ error: "Authorization required" }); return; }
    if (!req.auth.roles.includes("admin")) { res.status(403).json({ error: "Insufficient permissions" }); return; }

    const serviceToken = buildServiceToken(req);

    const [affiliatesRes, promosRes, ordersRes] = await Promise.all([
      afiliazcy.listAffiliates(serviceToken),
      promoService.listPromos({ type: "affiliate" }, serviceToken),
      orderService.getAdminOrders("completed", 1, 20, serviceToken),
    ]);

    const affiliates = affiliatesRes.data as Array<any>;
    const promos = promosRes.data as { promos: any[]; total: number };
    const ordersRaw = ordersRes.data as any;
    const orders = Array.isArray(ordersRaw) ? ordersRaw : (ordersRaw?.orders || []);

    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const totalCommission = promos.promos.reduce((sum: number, p: any) => sum + ((p.commissionAmount || 0) * (p.usageCount || 0)), 0);

    res.json({
      affiliates: affiliates.map((a: any) => ({
        id: a.id, name: a.name, email: a.email, phone: a.phone,
        isActive: a.is_active, codeCount: a.codes?.length || 0, usageCount: a.usage_count || 0,
      })),
      promos: promos.promos.map((p: any) => ({
        code: p.code, discountType: p.discountType, discountValue: p.discountValue,
        commissionAmount: p.commissionAmount, usageCount: p.usageCount,
        affiliatorId: p.affiliatorId, isActive: p.isActive,
      })),
      stats: {
        totalAffiliates: affiliates.length, totalPromos: promos.total,
        totalRevenue, totalCommission, totalBookings: orders.length,
      },
      recentOrders: orders,
    });
  } catch (err) { next(err); }
});

export { router };

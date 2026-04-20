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

    const [codesRes, bookingsRes] = await Promise.all([
      promoService.getAffiliateCodes(token),
      orderService.getAffiliateBookings(token),
    ]);

    const codesRaw = codesRes.data as any;
    const codes = Array.isArray(codesRaw) ? codesRaw : (codesRaw?.promos || codesRaw?.codes || []);
    const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data as Array<any> : ((bookingsRes.data as any)?.bookings || (bookingsRes.data as any)?.orders || []);

    const confirmedCommission = bookings
      .filter((b: any) => b.commissionStatus === "confirmed")
      .reduce((sum: number, b: any) => sum + (b.commissionAmount || 0), 0);

    const pendingCommission = bookings
      .filter((b: any) => b.commissionStatus === "pending")
      .reduce((sum: number, b: any) => sum + (b.commissionAmount || 0), 0);

    const revenue = bookings
      .filter((b: any) => b.status === "completed")
      .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

    res.json({
      codes: codes.map((c: any) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        commissionAmount: c.commissionAmount,
        usageCount: c.usageCount,
        totalCommission: c.totalCommission || 0,
      })),
      stats: { totalBookings: bookings.length, confirmedCommission, pendingCommission, revenue },
      bookings,
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
    const orders = ordersRes.data as any[];

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

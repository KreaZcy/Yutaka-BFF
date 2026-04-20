import express from "express";
import { serviceFetch } from "../clients/base.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { afiliazcy } from "../clients/afiliazcy.js";
import { promoService } from "../clients/promo.js";

const router = express.Router();

const orderUrl = (path: string) => `${config.ORDER_SERVICE_URL}/order${path}`;

function buildServiceToken(req: express.Request): string {
  if (req.auth) {
    const role = req.auth.roles.includes("admin") ? "admin" : req.auth.roles.includes("affiliate") ? "affiliate" : "user";
    return `${req.auth.user_id}:${role}:${req.auth.username || ""}`;
  }
  return "";
}

const serviceHeaders = (req: express.Request) => ({
  Authorization: `Bearer ${buildServiceToken(req)}`,
  "Content-Type": "application/json",
});

const passHeaders = (req: express.Request) => ({
  ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
});

router.get("/calendar", async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/calendar")}?${qs}`);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/availability", async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/availability")}?${qs}`);
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/create", async (req, res, next) => {
  try {
    const promoCode = req.body.promoCode || null;
    const orderBody = { ...req.body };
    delete orderBody.promoCode;

    const { data, status } = await serviceFetch(orderUrl("/create"), {
      method: "POST",
      body: JSON.stringify(orderBody),
    });

    const order = data as any;

    if (promoCode && order.orderId) {
      try {
        const promoRes = await promoService.applyPromo({
          promoCode,
          orderId: order.orderId,
          guestPhone: order.guestPhone || req.body.guestPhone,
          guestName: order.guestName || req.body.guestName,
          checkInDate: order.checkInDate || req.body.checkInDate,
          checkOutDate: order.checkOutDate || req.body.checkOutDate,
          nightlyBreakdown: order.nightlyBreakdown || [],
        });

        const promoData = promoRes.data as any;
        order.promoCode = promoCode;
        order.discountAmount = promoData.discountAmount || 0;
        order.totalAmount = (order.subtotal || order.totalAmount) - order.discountAmount + (order.uniqueCode || 0);
      } catch (err: any) {
        console.error("[Promo apply] failed:", err.message);
        order.promoCode = null;
        order.discountAmount = 0;
      }
    }

    if (order.promoCode) {
      afiliazcy.useCode({
        code: order.promoCode,
        user_id: order.guestPhone || req.body.guestPhone || "",
        source_service: "yutaka-order",
        action_type: "booking",
        action_details: {
          orderId: order.orderId,
          guestName: order.guestName || req.body.guestName,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          checkInDate: order.checkInDate || req.body.checkInDate,
          checkOutDate: order.checkOutDate || req.body.checkOutDate,
        },
      }, "yutaka-order:system:yutaka-bff").catch((err) => {
        console.error("[AfiliaZcy use-code] failed:", err.message);
      });
    }

    res.status(status).json(order);
  } catch (err) { next(err); }
});

router.get("/:orderId", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}`));
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/:orderId/payment-status", async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/payment-status`));
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/:orderId/confirm-payment", async (req, res, next) => {
  try {
    const { data, status } = await serviceFetch(orderUrl(`/${req.params.orderId}/confirm-payment`), {
      method: "POST",
    });
    res.status(status).json(data);
  } catch (err) { next(err); }
});

router.get("/:orderId/validate-promo", async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/validate-promo?${qs}`));
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/dashboard", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/dashboard"), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/revenue", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/admin/revenue")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/stats", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/admin/stats")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/list", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/admin/list")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/:orderId/approve", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/approve`), {
      method: "POST",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/:orderId/reject", requireAuth, async (req, res, next) => {
  try {
    console.log("[REJECT] body:", JSON.stringify(req.body), "headers.content-type:", req.get("content-type"));
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/reject`), {
      method: "POST",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/:orderId/check-in", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/check-in`), {
      method: "POST",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/:orderId/complete", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/${req.params.orderId}/complete`), {
      method: "POST",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/pricing/default", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/pricing/default"), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/admin/pricing/default", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/pricing/default"), {
      method: "POST",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/pricing/custom", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/admin/pricing/custom")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/admin/pricing/custom", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/pricing/custom"), {
      method: "POST",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.delete("/admin/pricing/custom/:id", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/admin/pricing/custom/${req.params.id}`), {
      method: "DELETE",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/pricing/blocks", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/pricing/blocks"), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.post("/admin/pricing/block", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl("/admin/pricing/block"), {
      method: "POST",
      headers: serviceHeaders(req),
      body: JSON.stringify(req.body),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.delete("/admin/pricing/block/:id", requireAuth, async (req, res, next) => {
  try {
    const { data } = await serviceFetch(orderUrl(`/admin/pricing/block/${req.params.id}`), {
      method: "DELETE",
      headers: serviceHeaders(req),
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/guests", requireAuth, async (req, res, next) => {
  try {
    const qs = new URLSearchParams(req.query as any).toString();
    const { data } = await serviceFetch(`${orderUrl("/admin/guests")}?${qs}`, { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/admin/guests/:phone", requireAuth, async (req, res, next) => {
  try {
    const phone = req.params.phone as string;
    const { data } = await serviceFetch(orderUrl(`/admin/guests/${encodeURIComponent(phone)}`), { headers: serviceHeaders(req) });
    res.json(data);
  } catch (err) { next(err); }
});

export { router };

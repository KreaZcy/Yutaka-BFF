import { serviceFetch } from "./base.js";
import { config } from "../config.js";

const BASE = config.PROMO_SERVICE_URL;

export const promoService = {
  async createPromo(body: {
    code: string;
    type: "affiliate" | "automatic";
    discountType: "percentage" | "fixed";
    discountValue: number;
    dayCondition?: "all" | "weekday" | "weekend" | "custom";
    affiliatorId?: string;
    commissionAmount?: number;
    expiryType?: "date" | "duration_days" | "none";
    expiryDate?: string;
    expiryDurationDays?: number;
    maxUsage?: number;
  }, token: string) {
    return serviceFetch(`${BASE}/promo/admin/create`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async listPromos(params: {
    type?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }, token: string) {
    const qs = new URLSearchParams();
    if (params.type) qs.set("type", params.type);
    if (params.isActive) qs.set("isActive", params.isActive);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return serviceFetch(`${BASE}/promo/admin/list?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getPromo(code: string, token: string) {
    return serviceFetch(`${BASE}/promo/admin/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updatePromo(code: string, body: Record<string, unknown>, token: string) {
    return serviceFetch(`${BASE}/promo/admin/${code}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async deactivatePromo(code: string, token: string) {
    return serviceFetch(`${BASE}/promo/admin/${code}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getPromoUsage(code: string, params: { page?: number; limit?: number }, token: string) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return serviceFetch(`${BASE}/promo/admin/${code}/usage?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAffiliateCodes(token: string) {
    return serviceFetch(`${BASE}/promo/affiliate/codes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAffiliateBookings(token: string) {
    return serviceFetch(`${BASE}/promo/affiliate/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async validatePromo(params: {
    code: string;
    checkIn: string;
    checkOut: string;
    guestPhone: string;
  }) {
    const qs = new URLSearchParams(params);
    return serviceFetch(`${BASE}/promo/validate?${qs.toString()}`);
  },

  async applyPromo(body: {
    promoCode: string;
    orderId: string;
    guestPhone: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    nightlyBreakdown: Array<{ date: string; basePrice: number }>;
    userId?: string;
    guestBookingCount?: number;
    guestTotalNights?: number;
  }) {
    return serviceFetch(`${BASE}/promo/apply`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

import { serviceFetch } from "./base.js";
import { config } from "../config.js";

const BASE = config.AFILIAZCY_URL;

export const afiliazcy = {
  async createAffiliate(body: {
    name: string;
    email: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async listAffiliates(token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAffiliate(id: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAffiliate(id: string, body: {
    name?: string;
    email?: string;
    phone?: string;
    is_active?: boolean;
    metadata?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async deleteAffiliate(id: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async addCode(affiliateId: string, code: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates/${affiliateId}/codes`, {
      method: "POST",
      body: JSON.stringify({ code }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async removeCode(affiliateId: string, code: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/affiliates/${affiliateId}/codes`, {
      method: "DELETE",
      body: JSON.stringify({ code }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async useCode(body: {
    code: string;
    user_id?: string;
    source_service?: string;
    action_type?: string;
    action_details?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/use-code`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAnalytics(code: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/analytics/${code}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async listDisbursements(params: { affiliate_id?: string; status?: string }, token: string) {
    const qs = new URLSearchParams();
    if (params.affiliate_id) qs.set("affiliate_id", params.affiliate_id);
    if (params.status) qs.set("status", params.status);
    return serviceFetch(`${BASE}/api/v1/disbursements?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getDisbursement(id: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/disbursements/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createDisbursement(body: {
    affiliate_id: string;
    quota: number;
    metadata?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/disbursements`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateDisbursement(id: string, body: {
    status?: string;
    quota?: number;
    metadata?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/disbursements/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getUnclaimedQuota(affiliateId: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/disbursements/unclaimed-quota?affiliate_id=${affiliateId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getEvents(code: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/analytics/${code}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

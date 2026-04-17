import { serviceFetch } from "./base.js";
import { config } from "../config.js";

const BASE = config.ORDER_SERVICE_URL;

export const orderService = {
  async getAffiliateBookings(token: string) {
    return serviceFetch(`${BASE}/order/affiliate/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminOrders(status: string, page: number, limit: number, token: string) {
    return serviceFetch(
      `${BASE}/order/admin/list?status=${status}&page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },

  async getRevenue(token: string) {
    return serviceFetch(`${BASE}/order/admin/revenue`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

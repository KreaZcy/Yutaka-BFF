import { serviceFetch } from "./base.js";
import { config } from "../config.js";

const BASE = config.REKOGNIZCY_URL;

export const rekognizcy = {
  async createUser(body: {
    email: string;
    username: string;
    password: string;
    role_ids?: string[];
    metadata?: Record<string, unknown>;
  }, token: string) {
    return serviceFetch(`${BASE}/api/v1/users`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async listRoles(token: string) {
    return serviceFetch(`${BASE}/api/v1/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createRole(name: string, description: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/roles`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getRoleByName(name: string, token: string) {
    const { data } = await rekognizcy.listRoles(token);
    const roles = data as Array<{ id: string; name: string }>;
    return roles.find((r) => r.name === name) || null;
  },

  async deleteUser(id: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getUser(id: string, token: string) {
    return serviceFetch(`${BASE}/api/v1/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async listUsers(token: string) {
    return serviceFetch(`${BASE}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

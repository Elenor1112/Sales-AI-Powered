import { apiGet } from "./client";

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_MANAGER" | "SALES_REP";
  avatarUrl: string | null;
}

export function listOrgUsers() {
  return apiGet<{ users: OrgUser[] }>("/api/users");
}

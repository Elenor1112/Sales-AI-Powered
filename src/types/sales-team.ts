import type { SalesTeam, SalesTeamMember, User } from "@prisma/client";

export type SalesTeamWithMemberCount = SalesTeam & {
  _count: { members: number };
};

export type SalesTeamMemberWithUser = SalesTeamMember & {
  user: Pick<User, "id" | "name" | "email" | "avatarUrl" | "isActive">;
  activeLeadCount?: number;
};

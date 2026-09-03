import type { Lead, LeadActivity, LeadTag, Note, Tag, Task, Deal, User, SalesTeam } from "@prisma/client";

export type LeadWithRelations = Lead & {
  assignedUser?: Pick<User, "id" | "name" | "email" | "avatarUrl"> | null;
  assignedTeam?: Pick<SalesTeam, "id" | "name"> | null;
  leadTags?: (LeadTag & { tag: Tag })[];
  notes?: (Note & { user: Pick<User, "id" | "name"> })[];
  tasks?: Task[];
  deals?: Deal[];
};

export type LeadActivityWithUser = LeadActivity & {
  user?: Pick<User, "id" | "name"> | null;
};

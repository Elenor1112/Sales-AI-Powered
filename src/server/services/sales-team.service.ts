import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import * as salesTeamRepo from "@/server/repositories/sales-team.repository";
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  UpdateTeamInput,
  UpdateTeamMemberInput,
} from "@/server/validation/sales-team.schema";

export function listTeams(organizationId: string) {
  return salesTeamRepo.findManyTeams(organizationId);
}

export async function getTeam(organizationId: string, teamId: string) {
  const team = await salesTeamRepo.findTeamById(organizationId, teamId);
  if (!team) throw new NotFoundError("Sales team not found");
  return team;
}

export function createTeam(organizationId: string, input: CreateTeamInput) {
  return salesTeamRepo.createTeam(organizationId, input);
}

export async function updateTeam(organizationId: string, teamId: string, input: UpdateTeamInput) {
  await getTeam(organizationId, teamId);
  return salesTeamRepo.updateTeam(organizationId, teamId, input);
}

export async function deleteTeam(organizationId: string, teamId: string) {
  await getTeam(organizationId, teamId);
  const referencingSettings = await prisma.assignmentSettings.findFirst({
    where: { organizationId, defaultTeamId: teamId },
  });
  if (referencingSettings) {
    throw new ConflictError(
      "Cannot delete a team that is configured as the organization's default assignment team"
    );
  }
  return salesTeamRepo.deleteTeam(organizationId, teamId);
}

export function listTeamMembers(organizationId: string, teamId: string) {
  return salesTeamRepo.findTeamMembers(organizationId, teamId);
}

export async function addTeamMember(
  organizationId: string,
  teamId: string,
  input: AddTeamMemberInput
) {
  await getTeam(organizationId, teamId);

  const user = await prisma.user.findFirst({ where: { id: input.userId, organizationId } });
  if (!user) {
    throw new ValidationError("Target user does not belong to this organization");
  }

  const existing = await salesTeamRepo.findMembershipByUser(organizationId, teamId, input.userId);
  if (existing) {
    throw new ConflictError("User is already a member of this team");
  }

  return salesTeamRepo.addTeamMember(organizationId, teamId, input);
}

export async function updateTeamMember(
  organizationId: string,
  teamId: string,
  userId: string,
  input: UpdateTeamMemberInput
) {
  const existing = await salesTeamRepo.findMembershipByUser(organizationId, teamId, userId);
  if (!existing) throw new NotFoundError("Team membership not found");
  return salesTeamRepo.updateTeamMember(organizationId, teamId, userId, input);
}

export async function removeTeamMember(organizationId: string, teamId: string, userId: string) {
  const existing = await salesTeamRepo.findMembershipByUser(organizationId, teamId, userId);
  if (!existing) throw new NotFoundError("Team membership not found");
  return salesTeamRepo.removeTeamMember(organizationId, teamId, userId);
}

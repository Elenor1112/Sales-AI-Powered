import "dotenv/config";
import { PrismaClient, Role, AssignmentStrategy, FallbackBehavior } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const organization = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      name: "Acme Inc",
      slug: "acme",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@acme.test" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Alex Admin",
      email: "admin@acme.test",
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@acme.test" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Morgan Manager",
      email: "manager@acme.test",
      passwordHash,
      role: Role.SALES_MANAGER,
      isActive: true,
    },
  });

  const repData = [
    { name: "Sarah Chen", email: "sarah@acme.test", weight: 1 },
    { name: "Michael Diaz", email: "michael@acme.test", weight: 1 },
    { name: "David Kim", email: "david@acme.test", weight: 2 },
  ];

  const reps = [];
  for (const rep of repData) {
    const user = await prisma.user.upsert({
      where: { email: rep.email },
      update: {},
      create: {
        organizationId: organization.id,
        name: rep.name,
        email: rep.email,
        passwordHash,
        role: Role.SALES_REP,
        isActive: true,
      },
    });
    reps.push({ user, weight: rep.weight });
  }

  const team = await prisma.salesTeam.upsert({
    where: { id: `${organization.id}-inbound-sales` },
    update: {},
    create: {
      id: `${organization.id}-inbound-sales`,
      organizationId: organization.id,
      name: "Inbound Sales",
      description: "Primary team for inbound Meta and website leads.",
      isActive: true,
    },
  });

  for (const { user, weight } of reps) {
    await prisma.salesTeamMember.upsert({
      where: {
        organizationId_teamId_userId: {
          organizationId: organization.id,
          teamId: team.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        teamId: team.id,
        userId: user.id,
        isActive: true,
        isPaused: false,
        assignmentWeight: weight,
        maxActiveLeads: 25,
      },
    });
  }

  await prisma.assignmentSettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      automaticAssignmentEnabled: true,
      defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
      defaultTeamId: team.id,
      enforceCapacity: true,
      notifyAssignedUser: true,
      notifyManagersOnUnassigned: true,
      fallbackBehavior: FallbackBehavior.UNASSIGNED_QUEUE,
    },
  });

  await prisma.assignmentState.upsert({
    where: {
      organizationId_teamId_strategy: {
        organizationId: organization.id,
        teamId: team.id,
        strategy: AssignmentStrategy.ROUND_ROBIN,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      teamId: team.id,
      strategy: AssignmentStrategy.ROUND_ROBIN,
      roundRobinIndex: 0,
    },
  });

  await prisma.assignmentRule.upsert({
    where: { id: `${organization.id}-example-rule` },
    update: {},
    create: {
      id: `${organization.id}-example-rule`,
      organizationId: organization.id,
      name: "Enterprise Demo Form Routing (example, inactive)",
      priority: 1,
      isActive: false,
      metaFormId: "REPLACE_WITH_REAL_META_FORM_ID",
      teamId: team.id,
      strategy: AssignmentStrategy.LEAST_ASSIGNED,
    },
  });

  await prisma.tag.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Hot Lead" } },
    update: {},
    create: { organizationId: organization.id, name: "Hot Lead", color: "#ef4444" },
  });
  await prisma.tag.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Enterprise" } },
    update: {},
    create: { organizationId: organization.id, name: "Enterprise", color: "#6366f1" },
  });

  console.log("Seed complete.");
  console.log(`Organization: ${organization.name} (${organization.slug})`);
  console.log(`Login password for all seeded users: ${SEED_PASSWORD}`);
  console.log(`  Admin:   ${admin.email}`);
  console.log(`  Manager: ${manager.email}`);
  for (const { user } of reps) {
    console.log(`  Rep:     ${user.email}`);
  }

  if (process.env.SEED_DEMO_LEADS === "true") {
    console.log("SEED_DEMO_LEADS=true — creating demo leads (development only).");
    await seedDemoLeads(organization.id, team.id);
  }
}

async function seedDemoLeads(organizationId: string, teamId: string) {
  const demoLeads = [
    { name: "Jamie Rivera", email: "jamie.rivera@example.com", source: "WEBSITE" as const },
    { name: "Taylor Brooks", email: "taylor.brooks@example.com", source: "MANUAL" as const },
  ];
  for (const lead of demoLeads) {
    await prisma.lead.create({
      data: {
        organizationId,
        name: lead.name,
        email: lead.email,
        source: lead.source,
        assignedTeamId: teamId,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

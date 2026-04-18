import {
  PrismaClient,
  ProjectStatus,
  RiskSeverity,
  RiskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function seedClientData(input: {
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  personality: string;
  relationshipScore: number;
  notes: string;
  projectName: string;
  projectDescription: string;
  agreedScope: string;
}) {
  const client = await prisma.client.create({
    data: {
      name: input.name,
      industry: input.industry,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      personality: input.personality,
      relationshipScore: input.relationshipScore,
      notes: input.notes,
      projects: {
        create: {
          name: input.projectName,
          description: input.projectDescription,
          status: ProjectStatus.ACTIVE,
          agreedScope: input.agreedScope,
        },
      },
    },
    include: { projects: true },
  });

  const project = client.projects[0];

  await prisma.decision.createMany({
    data: [
      {
        projectId: project.id,
        title: "Adopt weekly stakeholder sync",
        rationale:
          "Frequent alignment reduces ambiguity and missed expectations.",
        madeBy: "Project Manager",
      },
      {
        projectId: project.id,
        title: "Use component-driven UI architecture",
        rationale:
          "Component boundaries speed up iteration and keep consistency.",
        madeBy: "Engineering Lead",
      },
      {
        projectId: project.id,
        title: "Prioritize core onboarding flow first",
        rationale:
          "The onboarding flow has the highest immediate business impact.",
        madeBy: "Product Lead",
      },
    ],
  });

  await prisma.risk.createMany({
    data: [
      {
        projectId: project.id,
        description: "Client feedback turnaround has slowed beyond agreed SLA.",
        severity: RiskSeverity.HIGH,
        status: RiskStatus.OPEN,
        flaggedBy: "Delivery Manager",
      },
      {
        projectId: project.id,
        description: "Third-party API quota may block upcoming integrations.",
        severity: RiskSeverity.MEDIUM,
        status: RiskStatus.OPEN,
        flaggedBy: "Tech Lead",
      },
    ],
  });

  const taskData = [
    {
      title: "Implement dashboard analytics",
      description: "Build core KPI dashboard widgets.",
      isInScope: true,
    },
    {
      title: "Set up role-based permissions",
      description: "Create access controls for admins and editors.",
      isInScope: true,
    },
    {
      title: "Add AI copywriting assistant",
      description: "Experimental assistant not included in initial contract.",
      isInScope: false,
    },
    {
      title: "Build white-label theming engine",
      description: "Client requested after kickoff and outside baseline scope.",
      isInScope: false,
    },
    {
      title: "Prepare release checklist",
      description: "Document pre-release quality and rollout checks.",
      isInScope: null,
    },
  ];

  for (const task of taskData) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: task.title,
        description: task.description,
        isInScope: task.isInScope,
        addedBy: "Project Team",
      },
    });
  }
}

async function main() {
  await prisma.task.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();

  await seedClientData({
    name: "Northstar Health",
    industry: "Healthcare",
    contactName: "Ava Thompson",
    contactEmail: "ava@northstarhealth.example",
    personality: "Very formal, prefers concise async updates",
    relationshipScore: 8,
    notes: "Values predictability and risk visibility.",
    projectName: "Patient Portal Revamp",
    projectDescription: "Modernize appointment and records workflows.",
    agreedScope:
      "Portal redesign, patient auth, dashboard analytics, and release hardening.",
  });

  await seedClientData({
    name: "Brightlane Retail",
    industry: "Retail",
    contactName: "Ethan Miller",
    contactEmail: "ethan@brightlane.example",
    personality: "Collaborative and detail-oriented",
    relationshipScore: 7,
    notes: "Responds quickly when options are clearly framed.",
    projectName: "Commerce Experience Upgrade",
    projectDescription: "Improve conversion across web checkout journey.",
    agreedScope:
      "Checkout UX improvements, performance tuning, and payment flow QA.",
  });

  console.log("Seed completed successfully");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

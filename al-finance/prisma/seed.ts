import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  await prisma.checkin.deleteMany();
  await prisma.cushionEntry.deleteMany();
  await prisma.dateNightEntry.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.laylaReceived.deleteMany();

  await prisma.settings.create({
    data: { id: "singleton", allowance: 2000, savings: 200, dnWeekly: 50, weekMode: 4, paceOk: 0.05, paceTight: 0.12 },
  });

  await prisma.checkin.createMany({
    data: [
      { person: "armaan", date: "2026-02-03", amount: 220, note: "Groceries & gas" },
      { person: "armaan", date: "2026-02-07", amount: 180, note: "Dining out" },
      { person: "armaan", date: "2026-02-11", amount: 150, note: "Online order" },
      { person: "armaan", date: "2026-02-14", amount: 50, note: "Valentine's prep" },
      { person: "layla", date: "2026-02-02", amount: 350, note: "Clothes & beauty" },
      { person: "layla", date: "2026-02-06", amount: 280, note: "Groceries" },
      { person: "layla", date: "2026-02-10", amount: 420, note: "Shopping & subs" },
      { person: "layla", date: "2026-02-14", amount: 231, note: "Restaurant" },
    ],
  });

  await prisma.cushionEntry.createMany({
    data: [
      { person: "armaan", date: "2026-01-01", amount: 4000, type: "add", note: "Opening balance" },
      { person: "layla", date: "2026-01-01", amount: 4500, type: "add", note: "Opening balance" },
    ],
  });

  await prisma.dateNightEntry.createMany({
    data: [
      { person: "armaan", date: "2026-02-01", amount: 50, type: "contrib", note: "Week 1" },
      { person: "layla", date: "2026-02-01", amount: 50, type: "contrib", note: "Week 1" },
      { person: "armaan", date: "2026-02-08", amount: 50, type: "contrib", note: "Week 2" },
      { person: "layla", date: "2026-02-08", amount: 50, type: "contrib", note: "Week 2" },
      { person: "both", date: "2026-02-14", amount: 65, type: "spend", note: "Valentine's dinner" },
    ],
  });

  await prisma.laylaReceived.create({ data: { id: "2026-02", amount: 1400 } });

  console.log("✅ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isLoggedIn } from "@/lib/session";

// Helper to check auth
async function requireAuth() {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// GET — load all data
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const [checkins, cushion, datenight, settings, laylaReceived] = await Promise.all([
      prisma.checkin.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.cushionEntry.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.dateNightEntry.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.settings.findUnique({ where: { id: "singleton" } }),
      prisma.laylaReceived.findMany(),
    ]);

    // Ensure settings exist
    const cfg = settings || await prisma.settings.create({
      data: { id: "singleton", allowance: 2000, savings: 200, dnWeekly: 50, weekMode: 4, paceOk: 0.05, paceTight: 0.12 },
    });

    // Convert laylaReceived array to { "2026-02": 1400 } map
    const lrMap: Record<string, number> = {};
    laylaReceived.forEach((r) => { lrMap[r.id] = r.amount; });

    return NextResponse.json({ checkins, cushion, datenight, settings: cfg, laylaReceived: lrMap });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

// POST — create or update
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { action, table, data } = body;

    switch (`${table}:${action}`) {
      // ── Checkins ──────────────────────────────────────────────
      case "checkin:create":
        await prisma.checkin.create({ data: { person: data.person, date: data.date, amount: data.amount, note: data.note || "" } });
        break;
      case "checkin:update":
        await prisma.checkin.update({ where: { id: data.id }, data: { amount: data.amount, date: data.date, note: data.note ?? "" } });
        break;
      case "checkin:delete":
        await prisma.checkin.delete({ where: { id: data.id } });
        break;

      // ── Cushion ───────────────────────────────────────────────
      case "cushion:create":
        await prisma.cushionEntry.create({ data: { person: data.person, date: data.date, amount: data.amount, type: data.type, note: data.note || "" } });
        break;

      // ── Date Night ────────────────────────────────────────────
      case "datenight:create":
        await prisma.dateNightEntry.create({ data: { person: data.person, date: data.date, amount: data.amount, type: data.type, note: data.note || "" } });
        break;

      // ── Settings ──────────────────────────────────────────────
      case "settings:update":
        await prisma.settings.upsert({
          where: { id: "singleton" },
          update: { allowance: data.allowance, savings: data.savings, dnWeekly: data.dnWeekly, weekMode: data.weekMode, paceOk: data.paceOk, paceTight: data.paceTight },
          create: { id: "singleton", ...data },
        });
        break;

      // ── Layla Received ────────────────────────────────────────
      case "laylaReceived:update":
        await prisma.laylaReceived.upsert({
          where: { id: data.monthKey },
          update: { amount: data.amount },
          create: { id: data.monthKey, amount: data.amount },
        });
        break;

      // ── Reset to demo ─────────────────────────────────────────
      case "all:reset":
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
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${table}:${action}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  date: string;
  time?: string;
  event: string;
  category: "rbi" | "earnings" | "ipo" | "macro" | "market";
  impact: "high" | "medium" | "low";
  description?: string;
  symbol?: string;
}

// ─── Static Indian market events (2025-2026) ───────────────────────

function getUpcomingEvents(days: number): CalendarEvent[] {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const events: CalendarEvent[] = [];

  // RBI Monetary Policy dates (announced schedule)
  const rbiDates: { date: string; event: string }[] = [
    { date: "2025-02-07", event: "RBI Monetary Policy - Feb 2025" },
    { date: "2025-04-09", event: "RBI Monetary Policy - Apr 2025" },
    { date: "2025-06-06", event: "RBI Monetary Policy - Jun 2025" },
    { date: "2025-08-08", event: "RBI Monetary Policy - Aug 2025" },
    { date: "2025-10-01", event: "RBI Monetary Policy - Oct 2025" },
    { date: "2025-12-05", event: "RBI Monetary Policy - Dec 2025" },
    { date: "2026-02-06", event: "RBI Monetary Policy - Feb 2026" },
    { date: "2026-04-08", event: "RBI Monetary Policy - Apr 2026" },
    { date: "2026-06-05", event: "RBI Monetary Policy - Jun 2026" },
    { date: "2026-08-07", event: "RBI Monetary Policy - Aug 2026" },
  ];

  for (const rbi of rbiDates) {
    const d = new Date(rbi.date);
    if (d >= now && d <= cutoff) {
      events.push({
        date: rbi.date,
        time: "10:00 AM",
        event: rbi.event,
        category: "rbi",
        impact: "high",
        description: "RBI MPC decision on repo rate, stance, and policy guidance",
      });
    }
  }

  // Indian market holidays (NSE/BSE)
  const holidays: { date: string; name: string }[] = [
    { date: "2025-01-26", name: "Republic Day" },
    { date: "2025-02-26", name: "Maha Shivaratri" },
    { date: "2025-03-14", name: "Holi" },
    { date: "2025-03-31", name: "Id-Ul-Fitr" },
    { date: "2025-04-10", name: "Shri Mahavir Jayanti" },
    { date: "2025-04-14", name: "Dr. Ambedkar Jayanti" },
    { date: "2025-04-18", name: "Good Friday" },
    { date: "2025-05-01", name: "Maharashtra Day" },
    { date: "2025-06-07", name: "Bakri Id" },
    { date: "2025-08-15", name: "Independence Day" },
    { date: "2025-08-16", name: "Janmashtami" },
    { date: "2025-09-05", name: "Ganesh Chaturthi" },
    { date: "2025-10-02", name: "Mahatma Gandhi Jayanti" },
    { date: "2025-10-21", name: "Diwali Laxmi Pujan" },
    { date: "2025-10-22", name: "Diwali Balipratipada" },
    { date: "2025-11-05", name: "Prakash Gurpurab" },
    { date: "2025-12-25", name: "Christmas" },
    { date: "2026-01-26", name: "Republic Day" },
    { date: "2026-03-10", name: "Holi" },
    { date: "2026-03-30", name: "Id-Ul-Fitr" },
    { date: "2026-04-02", name: "Shri Ram Navami" },
    { date: "2026-04-14", name: "Dr. Ambedkar Jayanti" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-01", name: "Maharashtra Day" },
    { date: "2026-08-15", name: "Independence Day" },
    { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
    { date: "2026-10-12", name: "Dussehra" },
    { date: "2026-11-01", name: "Diwali" },
    { date: "2026-12-25", name: "Christmas" },
  ];

  for (const h of holidays) {
    const d = new Date(h.date);
    if (d >= now && d <= cutoff) {
      events.push({
        date: h.date,
        event: `Market Holiday - ${h.name}`,
        category: "market",
        impact: "low",
        description: "NSE and BSE closed for trading",
      });
    }
  }

  // Key macro data release dates (approximate monthly schedule)
  const macroEvents: { day: number; event: string; impact: "high" | "medium" }[] = [
    { day: 12, event: "India CPI Inflation Data", impact: "high" },
    { day: 14, event: "India IIP (Industrial Production)", impact: "medium" },
    { day: 28, event: "India GDP Estimate (quarterly)", impact: "high" },
    { day: 1, event: "India Manufacturing PMI", impact: "medium" },
    { day: 5, event: "India Services PMI", impact: "medium" },
    { day: 15, event: "India Trade Balance Data", impact: "medium" },
  ];

  for (let month = now.getMonth(); month <= cutoff.getMonth() + (cutoff.getFullYear() - now.getFullYear()) * 12; month++) {
    const year = Math.floor(month / 12);
    const m = month % 12;
    for (const macro of macroEvents) {
      const d = new Date(year, m, macro.day);
      if (d >= now && d <= cutoff) {
        events.push({
          date: d.toISOString().split("T")[0],
          event: macro.event,
          category: "macro",
          impact: macro.impact,
          description: "Government/statistical department release",
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

// Fetch earnings from BSE corporate announcements (board meetings for financial results)
const BSE_CACHE = new Map<string, { data: CalendarEvent[]; expiry: number }>();

async function fetchEarningsEvents(days: number): Promise<CalendarEvent[]> {
  const cacheKey = `bse:earnings:${days}`;
  const cached = BSE_CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  try {
    const events: CalendarEvent[] = [];
    const now = new Date();

    // Fetch announcements for the next `days` days, one day at a time
    // BSE API only works with single-day queries
    const datesToFetch: string[] = [];
    for (let i = 0; i <= Math.min(days, 14); i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      datesToFetch.push(`${yyyy}${mm}${dd}`);
    }

    const results = await Promise.allSettled(
      datesToFetch.map(async (dateStr) => {
        const res = await fetch(
          `https://api.bseindia.com/BseIndiaAPI/api/CorpAnn/w?Indx=0&pageno=1&strCat=7&strPrevDate=${dateStr}&strSDate=${dateStr}&strSearch=P&subcategory=-1`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: "https://www.bseindia.com/",
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!res.ok) return [];
        const data = await res.json();
        const all: Array<Record<string, unknown>> = [];
        for (const k of Object.keys(data)) {
          if (Array.isArray(data[k])) all.push(...data[k]);
        }
        return all;
      })
    );

    const seen = new Set<string>();
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        const subject = (item.Subject as string) || "";
        const lower = subject.toLowerCase();
        if (!lower.includes("financial result") && !lower.includes("board meeting")) continue;

        // Extract company name from subject (before the dash)
        const dashIdx = subject.indexOf("-");
        const company = dashIdx > 0 ? subject.substring(0, dashIdx).trim() : subject;

        // Extract date from subject if present
        const dateMatch = subject.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
        let eventDate = "";
        if (dateMatch) {
          eventDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }

        // Use BSE scrip code as dedup key
        const scripCode = (item.Newsid as string)?.match(/scrip_CD=(\d+)/)?.[1] || company;
        if (seen.has(scripCode)) continue;
        seen.add(scripCode);

        if (eventDate) {
          events.push({
            date: eventDate,
            time: "After Market Hours",
            event: `${company} - Quarterly Results`,
            category: "earnings",
            impact: "high",
            description: subject,
          });
        }
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    BSE_CACHE.set(cacheKey, { data: events, expiry: Date.now() + 3600_000 }); // 1h cache
    return events;
  } catch {
    return [];
  }
}

// Fetch upcoming corporate actions (dividends, splits) from NSE
async function fetchCorporateEvents(days: number): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`http://localhost:3000/api/corporate-actions?days=${days}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.actions || []).map((a: Record<string, unknown>) => ({
      date: (a.exDate as string) || "",
      event: `${a.symbol} - ${a.purpose}`,
      category: "market" as const,
      impact: "low" as const,
      symbol: a.symbol as string,
      description: a.details as string,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "60");
  const category = searchParams.get("category") || "all";

  try {
    const [staticEvents, earnings, corporateEvents] = await Promise.all([
      Promise.resolve(getUpcomingEvents(days)),
      fetchEarningsEvents(days),
      fetchCorporateEvents(days),
    ]);

    const events = [...staticEvents, ...earnings, ...corporateEvents];
    events.sort((a, b) => a.date.localeCompare(b.date));

    const filtered = category === "all" ? events : events.filter(e => e.category === category);

    return NextResponse.json({
      count: filtered.length,
      days,
      events: filtered,
      categories: ["rbi", "earnings", "ipo", "macro", "market"],
      source: "static+bse+nse",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Economic calendar error:", error);
    return NextResponse.json({
      count: 0,
      days,
      events: [],
      source: "error",
      timestamp: Date.now(),
    });
  }
}

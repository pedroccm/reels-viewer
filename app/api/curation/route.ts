import { NextRequest, NextResponse } from "next/server";
import { getCuration } from "@/lib/data";
import { writeJSON } from "@/lib/blobs";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCuration());
}

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30);

export async function POST(req: NextRequest) {
  const pw = req.headers.get("x-edit-password") || "";
  if (!process.env.EDIT_PASSWORD || pw !== process.env.EDIT_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    op: "check" | "addTag" | "removeTag" | "setHidden";
    code?: string;
    tag?: string;
    hidden?: boolean;
  };

  if (body.op === "check") return NextResponse.json({ ok: true });

  const cur = await getCuration();
  const code = body.code || "";
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  if (body.op === "addTag") {
    const tag = norm(body.tag || "");
    if (tag) {
      const set = new Set(cur.tags[code] || []);
      set.add(tag);
      cur.tags[code] = [...set].sort();
    }
  } else if (body.op === "removeTag") {
    const tag = norm(body.tag || "");
    cur.tags[code] = (cur.tags[code] || []).filter((t) => t !== tag);
    if (cur.tags[code].length === 0) delete cur.tags[code];
  } else if (body.op === "setHidden") {
    const set = new Set(cur.hidden);
    if (body.hidden) set.add(code);
    else set.delete(code);
    cur.hidden = [...set];
  } else {
    return NextResponse.json({ error: "bad op" }, { status: 400 });
  }

  await writeJSON("curation", cur);
  return NextResponse.json(cur);
}

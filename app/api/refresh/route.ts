import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

// Called by the reels pipeline right after it uploads a fresh manifest to R2,
// so the site shows the new reels immediately instead of waiting out the 10-min
// data cache. Auth reuses EDIT_PASSWORD (sent as x-refresh-token or ?token=).
export async function POST(req: NextRequest) {
  const token =
    req.headers.get("x-refresh-token") ||
    new URL(req.url).searchParams.get("token") ||
    "";
  if (!process.env.EDIT_PASSWORD || token !== process.env.EDIT_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag("manifest");
  return NextResponse.json({ ok: true, revalidated: true });
}

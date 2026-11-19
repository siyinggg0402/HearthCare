import { NextResponse } from "next/server";
import { dispatch, getState } from "@/lib/db";
import type { Action } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getState());
}

export async function POST(req: Request) {
  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!action || typeof action.type !== "string") {
    return NextResponse.json({ error: "Missing action type" }, { status: 400 });
  }
  try {
    return NextResponse.json(await dispatch(action));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

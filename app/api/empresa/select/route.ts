import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { empresaId } = await req.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("empresaId", String(empresaId), { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

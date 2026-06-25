import { NextRequest, NextResponse } from "next/server";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";

const ASSETS = path.join(process.cwd(), "assets", "pack");
const FONTS  = path.join(ASSETS, "fonts");

let fl = false;
function ensureFonts() {
  if (fl) return;
  const f = path.join(FONTS, "dana-saldo.ttf");
  if (fs.existsSync(f)) GlobalFonts.registerFromPath(f, "DanaFont");
  fl = true;
}

function fmtRp(input: string) {
  const digits = String(input).replace(/[^\d]/g, "") || "0";
  return digits.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const amount = fmtRp(String(body.amount ?? "0"));
    const nama   = String(body.nama ?? "").trim().slice(0, 30);

    ensureFonts();
    const bg     = await loadImage(path.join(ASSETS, "dana", "bg.jpg"));
    const canvas = createCanvas(bg.width, bg.height);
    const ctx    = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0);

    ctx.fillStyle    = "#ffffff";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign    = "left";
    ctx.font         = "bold 72px DanaFont";

    const rpTxt = "Rp";
    const rpW   = (ctx.measureText(rpTxt) as { width: number }).width;
    ctx.font = "bold 44px DanaFont";
    ctx.fillText(rpTxt, 60, 400);
    ctx.font = "bold 72px DanaFont";
    ctx.fillText(amount, 60 + rpW + 10, 407);

    if (nama) {
      ctx.font      = "44px DanaFont";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(nama, 60, 465);
    }

    const buf = canvas.toBuffer("image/png");
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "image/png", "Content-Disposition": "inline; filename=\"fake-dana.png\"", "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amount = searchParams.get("amount");
  if (!amount?.trim()) return NextResponse.json({ error: "Parameter 'amount' wajib diisi" }, { status: 400 });
  return POST(new NextRequest(req.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, nama: searchParams.get("nama") }) }));
}

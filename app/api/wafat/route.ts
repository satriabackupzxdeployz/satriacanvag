import { NextRequest, NextResponse } from "next/server";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";

const ASSETS = path.join(process.cwd(), "assets", "pack");
const FONTS  = path.join(ASSETS, "fonts");

let fl = false;
function ensureFonts() {
  if (fl) return;
  const f = path.join(FONTS, "SFPRODISPLAYSEMIBOLD.ttf");
  if (fs.existsSync(f)) GlobalFonts.registerFromPath(f, "WafatFont");
  fl = true;
}

function wrap(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if ((ctx.measureText(test) as { width: number }).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function POST(req: NextRequest) {
  try {
    const form    = await req.formData();
    const nama    = (form.get("nama")    as string | null)?.trim().slice(0, 40) ?? "Nama Almarhum";
    const tanggal = (form.get("tanggal") as string | null)?.trim() ?? "";
    const pesanRaw = (form.get("pesan") as string | null)?.trim() ?? "";
    const avFile  = form.get("foto") as File | null;

    ensureFonts();
    const bg     = await loadImage(path.join(ASSETS, "wafat", "bg.jpg"));
    const canvas = createCanvas(bg.width, bg.height);
    const ctx    = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, bg.width, bg.height);

    if (avFile && avFile.size > 0) {
      const avBuf = Buffer.from(await avFile.arrayBuffer());
      const av    = await loadImage(avBuf);
      const avatarX = bg.width / 2 - 180;
      const avatarY = 210;
      const avatarR = 180;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const s  = Math.min(av.width, av.height);
      const sx = (av.width - s) / 2;
      const sy = (av.height - s) / 2;
      ctx.drawImage(av, sx, sy, s, s, avatarX, avatarY, avatarR * 2, avatarR * 2);
      ctx.restore();
    }

    const cx = bg.width / 2;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle   = "#ffffff";

    ctx.font = "bold 72px WafatFont";
    ctx.fillText(nama.toUpperCase(), cx, 620);

    if (tanggal) {
      ctx.font = "44px WafatFont";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(tanggal, cx, 710);
    }

    if (pesanRaw) {
      ctx.font = "38px WafatFont";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      const lines = wrap(ctx, pesanRaw, bg.width - 200);
      const lh    = 52;
      const startY = 790;
      lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, cx, startY + i * lh));
    }

    const buf = canvas.toBuffer("image/png");
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "image/png", "Content-Disposition": "inline; filename=\"wafat.png\"", "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

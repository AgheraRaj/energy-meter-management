import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert = await prisma.alert.update({
    where: { id: Number(id) },
    data: { acknowledged: true },
  });

  const io = (global as any).io;
  if (io) io.emit("alert:acknowledged", { id: alert.id });

  return NextResponse.json(alert);
}
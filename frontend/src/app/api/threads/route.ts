import { NextResponse } from "next/server";
import { langgraphBaseUrl } from "@/lib/config";

function backend(path: string) {
  return `${langgraphBaseUrl}${path}`;
}

export async function GET() {
  const res = await fetch(backend("/threads/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 50 }),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load threads" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ threads: data });
}

export async function POST() {
  const res = await fetch(backend("/threads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: {} }),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create thread" }, { status: res.status });
  }

  const thread = await res.json();
  return NextResponse.json({ thread });
}

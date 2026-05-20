import { NextRequest, NextResponse } from "next/server"
import { getPrivateSongForCategory } from "@/src/lib/catalog/privateCatalog"

export function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId")
  if (!categoryId) {
    return NextResponse.json({ error: "Missing categoryId" }, { status: 400 })
  }

  const currentSongId = request.nextUrl.searchParams.get("currentSongId") ?? undefined
  const song = getPrivateSongForCategory(categoryId, currentSongId)
  if (!song) {
    return NextResponse.json({ error: "No song found" }, { status: 404 })
  }

  return NextResponse.json(song)
}

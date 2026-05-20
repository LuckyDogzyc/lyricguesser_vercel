import { NextRequest, NextResponse } from "next/server"
import { getPrivateRandomSong } from "@/src/lib/catalog/privateCatalog"

export function GET(request: NextRequest) {
  const currentSongId = request.nextUrl.searchParams.get("currentSongId") ?? undefined
  const song = getPrivateRandomSong(currentSongId)

  if (!song) {
    return NextResponse.json({ error: "No song found" }, { status: 404 })
  }

  return NextResponse.json(song)
}

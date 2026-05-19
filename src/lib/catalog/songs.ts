import rawSongs from "@/content/lyrics/songs.json"
import type { Song } from "./song"
import { hasPlayableText } from "./song"

export function getPlayableSongs(songs: Song[] = rawSongs as Song[]): Song[] {
  return songs.filter(hasPlayableText)
}

export function getRandomSong(songs: Song[] = getPlayableSongs()): Song | null {
  if (songs.length === 0) {
    return null
  }

  return songs[Math.floor(Math.random() * songs.length)]
}

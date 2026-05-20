import { LyricGame } from "@/src/components/LyricGame"
import { getPrivateArtistCategories } from "@/src/lib/catalog/privateCatalog"
import { getPlayableSongs, getRandomSong } from "@/src/lib/catalog/songs"

export default function Home() {
  const songs = getPlayableSongs()
  const song = getRandomSong(songs)
  const artistCategories = getPrivateArtistCategories()

  if (!song) {
    return (
      <main className="app-shell">
        <aside className="side-nav" aria-label="模式">
          <h1>猜歌词</h1>
        </aside>
        <section className="lyrics-panel" aria-label="歌词谜面">
          <p>曲库为空，请先通过 Codex 录入歌曲。</p>
        </section>
        <aside className="guess-panel" aria-label="猜测">
          <p>暂无可玩歌曲。</p>
        </aside>
      </main>
    )
  }

  return <LyricGame artistCategories={artistCategories} initialSong={song} songs={songs} />
}

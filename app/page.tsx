export default function Home() {
  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="模式">
        <h1>猜歌词</h1>
        <button className="nav-item nav-item-active">随机</button>
        <button className="nav-item" disabled>
          每日挑战
        </button>
        <button className="nav-item" disabled>
          分类
        </button>
        <button className="nav-item" disabled>
          登录
        </button>
      </aside>
      <section className="lyrics-panel" aria-label="歌词谜面">
        <p>曲库准备中</p>
      </section>
      <aside className="guess-panel" aria-label="猜测">
        <p>录入歌曲后即可开始。</p>
      </aside>
    </main>
  )
}

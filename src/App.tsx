import { useCallback, useEffect, useRef, useState } from 'react'
import BookReader, { type BookReaderHandle } from './BookReader'
import SpiralBinding3D from './SpiralBinding3D'
import WelcomeGarden3D from './WelcomeGarden3D'

function App() {
  const bookRef = useRef<BookReaderHandle>(null)
  const bookWrapRef = useRef<HTMLDivElement>(null)
  const [flipSignal, setFlipSignal] = useState(0)
  const [entered, setEntered] = useState(false)
  const [started, setStarted] = useState(false)
  const [introVisible, setIntroVisible] = useState(true)
  const [introFading, setIntroFading] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [arrived, setArrived] = useState(false)
  const [musicOn, setMusicOn] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() =>
    window.matchMedia('(max-width: 680px)').matches ? 'portrait' : 'landscape',
  )
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const updateOrientation = () => setOrientation(window.innerWidth <= 680 ? 'portrait' : 'landscape')
    window.addEventListener('resize', updateOrientation)
    return () => window.removeEventListener('resize', updateOrientation)
  }, [])

  useEffect(() => {
    if (entered || reducedMotion) {
      setArrived(true)
    }
  }, [entered, reducedMotion])

  useEffect(() => {
    if (!introFading) return
    const timer = window.setTimeout(() => setIntroVisible(false), reducedMotion ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [introFading, reducedMotion])

  const previous = useCallback(() => bookRef.current?.previous(), [])
  const next = useCallback(() => bookRef.current?.next(), [])
  const restart = useCallback(() => bookRef.current?.restart(), [])

  const startStory = useCallback(() => {
    if (started) return
    setMusicOn(true)
    setStarted(true)
    setIntroFading(true)
  }, [started])

  const openWelcomeBook = useCallback(() => {
    if (leaving || entered || !arrived) return
    if (reducedMotion) {
      setEntered(true)
      return
    }
    setLeaving(true)
  }, [arrived, entered, leaving, reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'Enter' && !started) { event.preventDefault(); startStory(); return }
      if (event.key === 'Enter' && !entered) { event.preventDefault(); openWelcomeBook(); return }
      if (!entered) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous() }
      if (event.key === 'ArrowRight') { event.preventDefault(); next() }
      if (event.key === 'Home') { event.preventDefault(); restart() }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [entered, next, openWelcomeBook, previous, restart, startStory, started])

  return (
    <main className={`stage ${entered ? 'stage--entered' : ''}`}>
      <section className={`reading-area ${entered ? '' : 'reading-area--waiting'}`} id="inicio" aria-label="Libro interactivo" aria-hidden={!entered}>
        <div className="book-wrap" ref={bookWrapRef}>
          <BookReader
            ref={bookRef}
            orientation={orientation}
            reducedMotion={reducedMotion}
            onPageChange={() => {}}
            onFlipStart={() => setFlipSignal((signal) => signal + 1)}
          />
          <SpiralBinding3D orientation={orientation} flipSignal={flipSignal} reducedMotion={reducedMotion} />
        </div>
      </section>
      {started ? <section className={`welcome-scene ${entered ? 'welcome-scene--handoff' : ''} ${arrived ? 'welcome-scene--arrived' : ''} ${leaving ? 'welcome-scene--leaving' : ''}`} aria-label="Abre nuestra historia" aria-hidden={entered}>
          <WelcomeGarden3D
            reducedMotion={reducedMotion}
            arrived={arrived}
            leaving={leaving}
            onArrived={() => setArrived(true)}
            onOpen={openWelcomeBook}
            entered={entered}
            onComplete={() => setEntered(true)}
            targetRef={bookWrapRef}
          />
        </section> : null}
      {introVisible ? (
        <section className={`intro-gate ${introFading ? 'intro-gate--fading' : ''}`} aria-label="Inicio" aria-hidden={introFading}>
          {!introFading ? <button type="button" className="intro-gate-button" onClick={startStory}>
            Nuestra historia
          </button> : null}
        </section>
      ) : null}
      {started && musicOn ? (
        <iframe
          className="background-music-frame"
          title="Bésame Mucho, música de fondo"
          src="https://www.youtube-nocookie.com/embed/kjYyblq-hX4?autoplay=1&loop=1&playlist=kjYyblq-hX4&controls=0&playsinline=1&rel=0"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : null}
      {started ? <button
        type="button"
        className={`music-toggle ${musicOn ? 'music-toggle--on' : ''}`}
        onClick={() => setMusicOn((playing) => !playing)}
        aria-label={musicOn ? 'Pausar música' : 'Reproducir música'}
        title={musicOn ? 'Pausar música' : 'Reproducir música'}
      >
        <span aria-hidden="true">{musicOn ? '♫' : '♪'}</span>
      </button> : null}
    </main>
  )
}

export default App

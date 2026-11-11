import { animate } from 'animejs'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { BookSurface, PAGE_INDEX } from './BookContent'

export type BookReaderHandle = {
  next: () => void
  previous: () => void
  restart: () => void
}

type Turn = {
  kind: 'cover-open' | 'cover-close' | 'page-next' | 'page-prev' | 'back-close' | 'back-open' | 'mobile-next' | 'mobile-prev'
  front: number
  back: number
  side: 'left' | 'right'
  from: number
  to: number
  underLeft: number | null
  underRight: number | null
  underMobileTop: number | null
  underMobileBottom: number | null
  targetIndex: number
}

type BookReaderProps = {
  orientation: 'portrait' | 'landscape'
  reducedMotion: boolean
  onPageChange: (page: number) => void
  onFlipStart: () => void
}

const BookReader = forwardRef<BookReaderHandle, BookReaderProps>(function BookReader({ orientation, reducedMotion, onPageChange, onFlipStart }, ref) {
  const [currentIndex, setCurrentIndex] = useState(PAGE_INDEX.cover)
  const [turn, setTurn] = useState<Turn | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const lockedRef = useRef(false)
  const pointerStart = useRef<number | null>(null)
  const didSwipe = useRef(false)

  const finishTurn = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex)
    setTurn(null)
    lockedRef.current = false
    onPageChange(nextIndex)
  }, [onPageChange])

  const startTurn = useCallback((nextTurn: Turn) => {
    if (lockedRef.current) return
    lockedRef.current = true
    onFlipStart()
    if (reducedMotion) {
      finishTurn(nextTurn.targetIndex)
      return
    }
    setTurn(nextTurn)
  }, [finishTurn, onFlipStart, reducedMotion])

  const next = useCallback(() => {
    if (lockedRef.current) return
    if (currentIndex === PAGE_INDEX.cover) {
      startTurn({
        kind: 'cover-open', front: PAGE_INDEX.cover, back: PAGE_INDEX.insideFront, side: 'right',
        from: 0, to: -180, underLeft: null, underRight: PAGE_INDEX.firstStory, underMobileTop: null, underMobileBottom: null,
        targetIndex: 1,
      })
      return
    }
    if (currentIndex >= PAGE_INDEX.insideBack) return

    if (currentIndex === PAGE_INDEX.backCover - 2) {
      startTurn({
        kind: 'back-close', front: PAGE_INDEX.insideBack, back: PAGE_INDEX.backCover, side: 'right',
        from: 0, to: -180, underLeft: PAGE_INDEX.backCover - 2, underRight: null, underMobileTop: null, underMobileBottom: null,
        targetIndex: PAGE_INDEX.backCover,
      })
      return
    }

    const nextStart = currentIndex + 2
    startTurn({
      kind: 'page-next', front: currentIndex + 1, back: currentIndex + 2, side: 'right',
      from: 0, to: -180, underLeft: currentIndex, underRight: currentIndex + 3, underMobileTop: null, underMobileBottom: null,
      targetIndex: nextStart,
    })
  }, [currentIndex, orientation, startTurn])

  const previous = useCallback(() => {
    if (lockedRef.current) return
    if (currentIndex === PAGE_INDEX.cover) return
    if (currentIndex === PAGE_INDEX.backCover) {
      startTurn({
        kind: 'back-open', front: PAGE_INDEX.backCover, back: PAGE_INDEX.insideBack, side: 'right',
        from: 0, to: -180, underLeft: PAGE_INDEX.backCover - 2, underRight: null, underMobileTop: null, underMobileBottom: null,
        targetIndex: PAGE_INDEX.backCover - 2,
      })
      return
    }
    if (currentIndex === PAGE_INDEX.insideFront) {
      startTurn({
        kind: 'cover-close', front: PAGE_INDEX.insideFront, back: PAGE_INDEX.cover, side: 'left',
        from: 0, to: 180, underLeft: null, underRight: PAGE_INDEX.firstStory, underMobileTop: null, underMobileBottom: null,
        targetIndex: PAGE_INDEX.cover,
      })
      return
    }

    const previousStart = currentIndex - 2
    startTurn({
      kind: 'page-prev', front: currentIndex, back: currentIndex - 1, side: 'left',
      from: 0, to: 180, underLeft: previousStart, underRight: currentIndex + 1, underMobileTop: null, underMobileBottom: null,
      targetIndex: previousStart,
    })
  }, [currentIndex, orientation, startTurn])

  const restart = useCallback(() => {
    if (lockedRef.current || currentIndex === PAGE_INDEX.cover) return
    startTurn({
      kind: 'cover-close', front: PAGE_INDEX.insideFront, back: PAGE_INDEX.cover, side: 'left',
      from: 0, to: 180, underLeft: null, underRight: PAGE_INDEX.firstStory, underMobileTop: null, underMobileBottom: null,
      targetIndex: PAGE_INDEX.cover,
    })
  }, [currentIndex, startTurn])

  useImperativeHandle(ref, () => ({ next, previous, restart }), [next, previous, restart])

  useEffect(() => {
    if (!turn) return
    const sheet = sheetRef.current
    if (!sheet) {
      finishTurn(turn.targetIndex)
      return
    }

    const progress = { value: 0 }
    const animation = animate(progress, {
      value: 1,
      duration: 1120,
      ease: 'inOutSine',
      onUpdate: () => {
        const bend = Math.sin(progress.value * Math.PI)
        const angle = turn.from + (turn.to - turn.from) * progress.value
        const squeeze = 1 - bend * 0.018
        // Lift the turning leaf toward the reader as it crosses the binding,
        // then settle it back onto the stack at either end of the turn.
        sheet.style.transform = `translateZ(${bend * 76}px) rotateY(${angle}deg) scaleX(${squeeze})`
        sheet.style.setProperty('--turn-shadow', String(bend * 0.48))
        // Some browsers still paint both sides of a preserve-3d subtree while
        // it crosses edge-on. Explicitly expose only the side facing the reader.
        sheet.dataset.visibleFace = progress.value < 0.5 ? 'front' : 'back'
      },
      onComplete: () => {
        // Let the browser commit the final 180° frame before React swaps the
        // animated sheet for the settled spread. This avoids a mirrored flash
        // or a one-frame gap at the binding.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => finishTurn(turn.targetIndex))
        })
      },
    })

    return () => { animation.pause() }
  }, [finishTurn, turn])

  const isClosed = currentIndex === PAGE_INDEX.cover || currentIndex === PAGE_INDEX.backCover
  const closedIndex = currentIndex === PAGE_INDEX.backCover ? PAGE_INDEX.backCover : PAGE_INDEX.cover
  const leftIndex = turn ? turn.underLeft : (isClosed ? null : currentIndex)
  const rightIndex = turn ? turn.underRight : (isClosed ? null : currentIndex + 1)
  const openFront = () => next()

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = event.clientX
    didSwipe.current = false
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return
    const distance = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(distance) < 38) return
    didSwipe.current = true
    if (distance < 0) next()
    else previous()
  }
  const onSceneClick = (event: MouseEvent<HTMLDivElement>) => {
    if (didSwipe.current) {
      didSwipe.current = false
      return
    }
    if (lockedRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = event.clientX - rect.left
    if (isClosed || localX > rect.width / 2) next()
    else previous()
  }

  return (
    <div
      className={`book-scene book-scene--${orientation}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStart.current = null }}
      onClick={onSceneClick}
      aria-label="Libro interactivo; desliza o toca para pasar página"
    >
      <div className={`book-spread book-spread--${orientation} ${isClosed ? 'book-spread--closed' : ''} ${currentIndex === PAGE_INDEX.backCover ? 'book-spread--back-closed' : ''} ${turn?.kind === 'back-close' ? 'book-spread--back-closing' : ''} ${turn?.kind === 'cover-close' ? 'book-spread--closing-cover' : ''} ${turn ? 'book-spread--turning' : ''}`}>
        <div className="book-page-slot book-page-slot--left"><BookSurface index={leftIndex} /></div>
        <div className="book-page-slot book-page-slot--right"><BookSurface index={rightIndex} /></div>
      </div>

      {!turn && isClosed ? (
        <div className={`closed-cover ${currentIndex === PAGE_INDEX.backCover ? 'closed-cover--back' : ''}`}>
          <BookSurface index={closedIndex} onOpen={openFront} />
        </div>
      ) : null}

      {turn ? (
        <div
          ref={sheetRef}
          className={`page-turn-sheet page-turn-sheet--${turn.side}`}
          style={{ transform: `rotateY(${turn.from}deg)` }}
          data-visible-face="front"
          aria-hidden="true"
        >
          <div className="page-turn-face page-turn-face--front"><BookSurface index={turn.front} /></div>
          <div className="page-turn-face page-turn-face--back"><BookSurface index={turn.back} /></div>
        </div>
      ) : null}
    </div>
  )
})

export default BookReader

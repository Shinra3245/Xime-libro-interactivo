import type { ReactNode } from 'react'

const pageContent = [
  { title: 'El día se volvió más bonito', body: 'Desde que llegaste, hasta lo sencillo guarda un poquito de magia.', photos: ['recuerdo-01.jpg', 'recuerdo-02.jpg'], stickers: ['tata', 'sunflower'] },
  { title: 'Mi casualidad favorita', body: 'Entre tantos caminos, qué suerte que el mío encontró el tuyo.', photos: ['recuerdo-03.jpg'], stickers: ['bouquet', 'bee'] },
  { title: 'Tu abrazo, mi lugar feliz', body: 'Contigo encuentro calma, alegría y un hogar que siempre llevo conmigo.', photos: ['recuerdo-04.jpg'], stickers: ['bunny', 'hydrangea'] },
  { title: 'Risas que se quedan', body: 'Me encanta coleccionar contigo esos instantes que hacen brillar cualquier día.', photos: ['recuerdo-05.jpg'], stickers: ['cat', 'carnation'] },
  { title: 'Qué bonito es caminar contigo', body: 'A tu lado, cada paseo se transforma en una historia que quiero guardar.', photos: ['recuerdo-06.jpg'], stickers: ['bee', 'sunflower'] },
  { title: 'Mi persona favorita', body: 'Gracias por ser refugio, aventura y sonrisa en tantos días nuestros.', photos: ['recuerdo-07.jpg'], stickers: ['tata', 'bunny'] },
  { title: 'Dos años de elegirnos', body: 'Dos años llenos de abrazos, aprendizajes y un amor que sigo eligiendo cada día.', photos: ['dos-anos.jpg'], stickers: ['bouquet', 'bee'] },
  { title: 'Dos años y dos meses', body: 'Mi historia favorita sigue escribiéndose contigo. Te quiero en todas las páginas que vienen.', photos: ['dos-anos-dos-meses.jpg'], stickers: ['sunflower', 'cat'] },
] as const

type StickerKind = 'tata' | 'sunflower' | 'hydrangea' | 'carnation' | 'bouquet' | 'bee' | 'bunny' | 'cat'

export function TurnHint() {
  return (
    <svg className="turn-hint" viewBox="0 0 260 150" aria-hidden="true">
      <path className="turn-hint-line-shadow" d="M15 28c35-29 55-2 43 29-14 36-4 62 30 60 31-2 56-21 51-42-4-18-27-22-39-8-13 15-1 38 29 48 30 10 65 11 94 8" />
      <path className="turn-hint-line" d="M15 25c35-29 55-2 43 29-14 36-4 62 30 60 31-2 56-21 51-42-4-18-27-22-39-8-13 15-1 38 29 48 30 10 65 11 94 8" />
      <path className="turn-hint-head-shadow" d="m207 100 38 20-39 17 10-18Z" />
      <path className="turn-hint-head" d="m204 96 39 19-39 16 10-17Z" />
      <path className="turn-hint-hatch" d="m214 111 21 6m-18-2 14 8m-17-3 8 7m-1-15 10 1m-5 5 5-1" />
    </svg>
  )
}

function StickerArtwork({ type }: { type: StickerKind }) {
  if (type === 'tata') return (
    <svg viewBox="0 0 120 150" className="sticker-art" aria-hidden="true">
      <ellipse cx="60" cy="137" rx="26" ry="6" className="sticker-ground" />
      <path className="sticker-outline" d="M43 75 29 91l8 19 14-6m26-29 16 17-8 18-14-7M47 94l-7 27 15 3 6-20 7 20 16-4-9-30" />
      <path className="sticker-body sticker-red" d="M43 73c9-8 26-8 35 0l7 24c-13 10-34 10-48 0Z" />
      <path className="sticker-outline" d="M60 67C34 51 26 34 41 20c9-9 19-4 19 5 1-9 11-14 20-5 15 14 7 31-20 47Z" />
      <path className="sticker-heart-head" d="M60 63C37 49 31 35 43 24c8-7 16-3 17 5 1-8 9-12 17-5 12 11 6 25-17 39Z" />
      <ellipse cx="52" cy="39" rx="2.3" ry="3" className="sticker-face" /><ellipse cx="68" cy="39" rx="2.3" ry="3" className="sticker-face" />
      <path d="M55 48q5 5 10 0" fill="none" stroke="#471d35" strokeWidth="2" strokeLinecap="round" />
      <path className="sticker-tag" d="M42 106h36l-4 15H46Z" /><text x="60" y="117" className="sticker-tag-text" textAnchor="middle">TATA</text>
    </svg>
  )

  if (type === 'bee') return (
    <svg viewBox="0 0 120 110" className="sticker-art" aria-hidden="true">
      <ellipse cx="61" cy="99" rx="29" ry="5" className="sticker-ground" />
      <ellipse cx="48" cy="32" rx="18" ry="14" className="sticker-wing" transform="rotate(-28 48 32)" />
      <ellipse cx="72" cy="30" rx="18" ry="14" className="sticker-wing" transform="rotate(28 72 30)" />
      <path className="sticker-outline" d="M29 63c0-19 14-34 32-34s32 15 32 34-14 27-32 27S29 82 29 63Z" />
      <path className="sticker-bee" d="M32 62c0-18 13-31 29-31s29 13 29 31-13 25-29 25-29-8-29-25Z" />
      <path d="M48 35c-5 14-5 35 0 51m27-50c6 15 6 35 0 50" className="sticker-stripe" />
      <circle cx="53" cy="59" r="2.6" className="sticker-face" /><circle cx="68" cy="59" r="2.6" className="sticker-face" />
      <path d="M55 69q6 6 12 0" fill="none" stroke="#553729" strokeWidth="2" strokeLinecap="round" />
      <path d="m54 30-6-9m22 9 6-9" fill="none" stroke="#553729" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )

  if (type === 'bunny') return (
    <svg viewBox="0 0 120 150" className="sticker-art" aria-hidden="true">
      <ellipse cx="60" cy="138" rx="27" ry="6" className="sticker-ground" />
      <path className="sticker-outline" d="M43 49c-12-28-7-40 2-41 13-1 18 24 19 43m8 1c2-27 10-43 21-39 11 4 5 29-9 48" />
      <path className="sticker-ear" d="M46 48c-8-22-5-31-1-31 7 0 10 18 11 34m20 1c3-20 8-31 13-29 6 2 1 18-7 33" />
      <path className="sticker-outline" d="M33 82c0-25 12-39 28-39s28 14 28 39c0 28-12 43-28 43S33 110 33 82Z" />
      <path className="sticker-bunny" d="M37 82c0-22 10-34 24-34s24 12 24 34c0 24-10 37-24 37S37 106 37 82Z" />
      <circle cx="52" cy="79" r="2.5" className="sticker-face" /><circle cx="69" cy="79" r="2.5" className="sticker-face" />
      <path d="m58 86 4 3 4-3m-4 3v5m0 0-6 3m6-3 6 3" fill="none" stroke="#75564c" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="34" cy="108" r="8" className="sticker-bunny" /><circle cx="88" cy="107" r="8" className="sticker-bunny" />
    </svg>
  )

  if (type === 'cat') return (
    <svg viewBox="0 0 120 145" className="sticker-art" aria-hidden="true">
      <ellipse cx="58" cy="136" rx="28" ry="5" className="sticker-ground" />
      <path className="sticker-outline" d="m38 57-4-31 25 17 26-18-3 34m-5 46c20-4 28 7 24 20-5 15-25 10-29 1" />
      <path className="sticker-cat" d="m42 53-3-19 17 12 20-13-2 23c9 8 13 18 13 31 0 25-13 39-30 39S28 112 28 88c0-15 5-27 14-35Z" />
      <path d="m41 54-1-10 10 7m19-1 9-7-1 12" className="sticker-ear-inner" />
      <ellipse cx="48" cy="78" rx="2.5" ry="3.5" className="sticker-face" /><ellipse cx="67" cy="78" rx="2.5" ry="3.5" className="sticker-face" />
      <path d="m55 87 4 3 4-3m-4 3v5m0 0-8 2m8-2 8 2" fill="none" stroke="#61483c" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m44 87-15-3m15 8-16 2m41-7 15-3m-15 8 16 2" fill="none" stroke="#61483c" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )

  if (type === 'sunflower') return (
    <svg viewBox="0 0 120 150" className="sticker-art" aria-hidden="true">
      <ellipse cx="61" cy="139" rx="23" ry="5" className="sticker-ground" />
      <path d="M59 73c-3 24-3 42 1 63m-1-24c-14-13-22-11-27-8 7 14 16 19 27 17m2-24c12-14 21-13 28-9-5 14-15 20-28 19" className="sticker-stem" />
      <g className="sun-petals">
        <ellipse cx="60" cy="34" rx="8" ry="18" /><ellipse cx="60" cy="34" rx="8" ry="18" transform="rotate(45 60 45)" /><ellipse cx="60" cy="34" rx="8" ry="18" transform="rotate(90 60 45)" /><ellipse cx="60" cy="34" rx="8" ry="18" transform="rotate(135 60 45)" />
      </g>
      <circle cx="60" cy="45" r="15" className="sun-center" /><circle cx="55" cy="41" r="2" fill="#f8da8c" /><circle cx="65" cy="49" r="2" fill="#f8da8c" />
    </svg>
  )

  if (type === 'hydrangea' || type === 'carnation') return (
    <svg viewBox="0 0 120 145" className={`sticker-art sticker-art--${type}`} aria-hidden="true">
      <ellipse cx="60" cy="135" rx="22" ry="5" className="sticker-ground" />
      <path d="M60 80c-2 20-1 37 0 51m0-28c-12-11-19-9-25-5 6 12 14 16 25 14m1-19c10-10 18-9 23-5-4 11-12 15-23 14" className="sticker-stem" />
      {type === 'hydrangea' ? <g className="hydrangea-blooms">{[[44,45],[57,34],[70,44],[48,58],[64,59],[77,57],[60,72]].map(([cx,cy], i) => <g key={i}><circle cx={cx} cy={cy} r="12" /><circle cx={cx-3} cy={cy-3} r="2.4" className="flower-center" /><circle cx={cx+3} cy={cy+2} r="2.4" className="flower-center" /></g>)}</g> : <><path className="carnation-bloom" d="M29 53q-3-12 6-15 2-13 14-9 8-12 17-3 12-8 18 5 13 1 11 14 10 9 0 17-1 13-15 12-9 9-19 1-11 7-17-4-13 3-14-9-12-5-1-13Z" /><path d="M39 49q19 14 43-1m-39 9q17 9 36 0" fill="none" stroke="#ffd5c8" strokeWidth="2" strokeLinecap="round" /></>}
    </svg>
  )

  return (
    <svg viewBox="0 0 150 150" className="sticker-art sticker-art--bouquet" aria-hidden="true">
      <ellipse cx="74" cy="140" rx="30" ry="5" className="sticker-ground" />
      <path d="m71 76 2 58m-1-33c-14-11-22-10-30-4 7 13 17 18 30 14m2-21c13-12 23-10 30-4-6 14-17 18-30 15" className="sticker-stem" />
      <g className="sun-petals"><ellipse cx="48" cy="36" rx="7" ry="15" /><ellipse cx="48" cy="36" rx="7" ry="15" transform="rotate(60 48 45)" /><ellipse cx="48" cy="36" rx="7" ry="15" transform="rotate(120 48 45)" /></g><circle cx="48" cy="45" r="12" className="sun-center" />
      <g className="hydrangea-blooms"><circle cx="87" cy="39" r="12" /><circle cx="104" cy="45" r="12" /><circle cx="88" cy="60" r="12" /><circle cx="105" cy="63" r="12" /></g>
      <path className="carnation-bloom" d="M31 81q-3-10 6-13 2-11 13-8 7-10 15-2 11-7 16 5 11 1 9 12 9 8 0 15-1 11-13 10-8 8-17 1-10 6-15-4-11 3-12-8-10-4-1-14Z" />
      <circle cx="87" cy="41" r="2" className="flower-center" /><circle cx="104" cy="47" r="2" className="flower-center" />
    </svg>
  )
}

function PopUpStickers({ stickers }: { stickers: readonly StickerKind[] }) {
  return (
    <div className="pop-up-layer" aria-hidden="true">
      {stickers.map((sticker, index) => (
        <div className={`popup-sticker popup-sticker--${sticker} popup-sticker--${index + 1}`} key={`${sticker}-${index}`}>
          <span className="popup-fold" />
          <StickerArtwork type={sticker} />
        </div>
      ))}
    </div>
  )
}

function MemoryPhoto({ name, index }: { name: string; index: number }) {
  return (
    <figure className={`memory-photo memory-photo--${index + 1}`}>
      <img
        src={`/images/recuerdos/${name}`}
        alt="Un recuerdo juntos"
        loading="eager"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
          event.currentTarget.parentElement?.classList.add('memory-photo--missing')
        }}
      />
      <span className="photo-heart" aria-hidden="true">♡</span>
    </figure>
  )
}

function FrontCover({ onOpen }: { onOpen?: () => void }) {
  return (
    <div className="paper cover" onClick={onOpen} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} aria-label={onOpen ? 'Abrir el libro' : 'Portada'}>
      <svg className="cover-sketch" viewBox="0 0 420 560" aria-hidden="true">
        <path className="sketch-outline" d="M22 25 C92 20 161 28 218 23 C286 19 342 27 398 22 C393 91 401 150 396 215 C392 296 402 371 397 431 C394 480 401 518 396 536 C323 531 259 540 199 535 C127 531 74 541 23 535 C27 462 18 407 24 341 C29 271 18 204 24 143 C28 93 19 58 22 25 Z" />
        <path className="sketch-outline sketch-outline--echo" d="M29 31 C90 27 148 34 211 30 C279 26 337 33 390 29 C386 102 393 158 389 220 C385 295 394 369 390 429 C387 477 394 511 389 528 C321 524 258 532 198 528 C132 524 78 532 30 528 C34 461 25 404 31 340 C36 270 25 203 31 145 C34 97 27 62 29 31 Z" />
        <g className="cover-flower">
          <path d="M65 85 C53 75 58 64 68 70 C73 55 85 60 82 72 C96 66 101 77 89 84 C100 93 91 103 81 94 C74 108 63 101 70 91 C56 98 50 88 65 85 Z" />
          <circle cx="75" cy="84" r="4" />
          <path d="M74 99 C71 110 81 117 74 128 M75 113 C64 108 60 112 58 118 M76 120 C85 114 89 117 91 123" />
        </g>
        <path className="cover-spark" d="M345 96 C347 108 352 112 364 114 C352 116 347 121 345 134 C343 121 338 116 326 114 C338 112 343 108 345 96 Z" />
        <path className="cover-heart" d="M350 451 C337 439 320 451 329 466 L350 486 L371 466 C380 451 363 439 350 451 Z" />
        <path className="cover-underline" d="M132 361 C180 368 236 359 287 364" />
      </svg>
      <div className="cover-content">
        <span className="cover-title">Nuestra historia</span>
      </div>
    </div>
  )
}

function InsideCover({ back = false, showTurnHint }: { back?: boolean; showTurnHint: boolean }) {
  return (
    <div className={`paper inside-cover ${back ? 'inside-cover--back' : 'inside-cover--front'}`}>
      {showTurnHint ? <TurnHint /> : null}
      <div className="inside-cover-content">
        <span className="inside-mark">♡</span>
        <span className="inside-kicker">{back ? 'por todo lo que somos' : 'para mi lugar favorito'}</span>
        <span className="inside-note">{back ? 'gracias por llenar de amor cada página' : 'mi corazón siempre encuentra el camino hacia ti'}</span>
        {!back ? <span className="inside-flower" aria-hidden="true">✿</span> : null}
      </div>
    </div>
  )
}

function BackCover() {
  return (
    <div className="paper back-cover">
      <svg className="cover-sketch" viewBox="0 0 420 560" aria-hidden="true">
        <path className="sketch-outline" d="M22 25 C92 20 161 28 218 23 C286 19 342 27 398 22 C393 91 401 150 396 215 C392 296 402 371 397 431 C394 480 401 518 396 536 C323 531 259 540 199 535 C127 531 74 541 23 535 C27 462 18 407 24 341 C29 271 18 204 24 143 C28 93 19 58 22 25 Z" />
        <path className="sketch-outline sketch-outline--echo" d="M29 31 C90 27 148 34 211 30 C279 26 337 33 390 29 C386 102 393 158 389 220 C385 295 394 369 390 429 C387 477 394 511 389 528 C321 524 258 532 198 528 C132 524 78 532 30 528 C34 461 25 404 31 340 C36 270 25 203 31 145 C34 97 27 62 29 31 Z" />
      </svg>
      <div className="back-cover-content"><span className="back-mark" aria-hidden="true">♡</span></div>
    </div>
  )
}

export const PAGE_INDEX = {
  cover: 0,
  insideFront: 1,
  firstStory: 2,
  insideBack: pageContent.length + 2,
  backCover: pageContent.length + 3,
}

export const storyPageCount = pageContent.length

export function BookSurface({ index, onOpen }: { index: number | null; onOpen?: () => void }): ReactNode {
  if (index === null) return <div className="paper paper--empty" aria-hidden="true" />
  if (index === PAGE_INDEX.cover) return <FrontCover onOpen={onOpen} />
  if (index === PAGE_INDEX.insideFront) return <InsideCover showTurnHint={false} />
  if (index === PAGE_INDEX.insideBack) return <InsideCover back showTurnHint />
  if (index === PAGE_INDEX.backCover) return <BackCover />

  const number = index - 1
  const content = pageContent[number - 1]
  if (!content) return <div className="paper paper--empty" aria-hidden="true" />

  return (
    <article className={`paper blank-page blank-page--${number}`} aria-label={`Página ${number}`}>
      <div className={`memory-layout ${content.photos.length > 1 ? 'memory-layout--collage' : ''}`}>
        <h2>{content.title}</h2>
        <div className="memory-photos">
          {content.photos.map((photo, index) => <MemoryPhoto key={photo} name={photo} index={index} />)}
        </div>
        <p>{content.body}</p>
      </div>
      <PopUpStickers stickers={content.stickers} />
      {index % 2 === 0 ? <TurnHint /> : null}
      <span className="page-number">{String(number).padStart(2, '0')}</span>
    </article>
  )
}

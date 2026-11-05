import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Instagram, MapPin, RotateCcw } from 'lucide-react'
import { DIAS, INSTAGRAM_URL, PIRU_URL, SEMANA, hhmm, minutos, type Turno } from '@/lib/marcaAlfajor'
import { FRASES_CINTA, M, eventoVigente, sinTildes } from '@/lib/muertos'
import { BandaRombos, Calavera, Cempasuchil, Estrella, Floritura, Huesos, Medallon, PapelPicado, Vela } from './Decoraciones'

// Las piezas de /muertosdehambre: la misma estructura que components/marca/MarcaAlfajor (hero con el
// video, cinta, títulos de sección, categorías, botón del pedido y footer) vestida como el flyer del
// Día de los muertos de hambre: papel, tinta y naranja, con el cempasúchil de acento.

export function EstadoLocalMuertos({ abierto, texto, corto }: { abierto: boolean; texto: string; corto?: string }) {
    return (
        <span className="font-twin inline-flex min-w-0 items-center gap-2 rounded-full border-2 border-[#242526] bg-[#f2ede0] px-3 py-1.5 text-[11px] text-[#242526]">
            <span className="relative flex size-2 shrink-0">
                <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${abierto ? 'bg-emerald-600' : 'bg-[#d3532b]'}`} />
                <span className={`relative size-2 rounded-full ${abierto ? 'bg-emerald-600' : 'bg-[#d3532b]'}`} />
            </span>
            {corto ? (
                <>
                    <span className="truncate sm:hidden">{sinTildes(corto)}</span>
                    <span className="hidden truncate sm:inline">{sinTildes(texto)}</span>
                </>
            ) : <span className="truncate">{sinTildes(texto)}</span>}
        </span>
    )
}

/** El botón principal: un ticket naranja con borde de tinta y el talón troquelado. */
export function BotonTicketMuertos({ children, onClick, icono }: { children: ReactNode; onClick: () => void; icono?: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group inline-flex h-14 items-stretch overflow-hidden rounded-lg border-2 border-[#242526] bg-[#d3532b] text-[#f2ede0] shadow-[4px_4px_0_#242526] transition-all duration-150 hover:-rotate-1 hover:shadow-[6px_6px_0_#242526] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#242526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#242526] focus-visible:ring-offset-2"
        >
            <span className="font-twin flex items-center px-5 pt-0.5 text-[16px] leading-none">{children}</span>
            <span className="flex w-14 items-center justify-center border-l-2 border-dashed border-[#242526]/60 [&_svg]:size-5">
                {icono ?? <ArrowDown className="transition-transform group-hover:translate-y-0.5" />}
            </span>
        </button>
    )
}

/** En qué punto del armado va el video: el relleno todavía cae, ya aterrizó, o cayó la segunda tapa. */
type FaseArmado = 'cayendo' | 'relleno' | 'armado'

// Momentos del video /hero-alfajor (los mismos que HeroVideo): relleno a 1,25 s y tapa a 1,85 s.
const T_RELLENO = 1.25
const T_TAPA = 1.85

/** El hero, como el de la carta de siempre: el video del alfajor que se arma ocupa el fondo (se funde
 * en los bordes) y el titular del flyer se enciende al compás. Arriba, en el aire por donde cae el
 * relleno, DIA DE LOS / MUERTOS; abajo, sobre el piso, DE HAMBRE, la noche y las acciones: el alfajor
 * queda literalmente entre "muertos" y "de hambre". En escritorio el video va a la derecha.
 *
 * El video arranca cuando `listo` (al abrirse el agujero de la bienvenida), se reproduce una vez y
 * queda en el último cuadro; se puede volver a armar. Sin movimiento se ve la foto final. */
export function HeroMuertos({ arriba, abajo, nombreVideo, onClickVideo, listo }: {
    arriba: ReactNode
    abajo: ReactNode
    nombreVideo: string
    onClickVideo?: () => void
    listo: boolean
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [sinMovimiento] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [fase, setFase] = useState<FaseArmado>(sinMovimiento ? 'armado' : 'cayendo')
    const [terminado, setTerminado] = useState(sinMovimiento)
    const evento = eventoVigente()

    useEffect(() => {
        const video = videoRef.current
        if (!video || sinMovimiento || !listo) return
        let frame = 0
        const leer = () => {
            const t = video.currentTime
            setFase(t >= T_TAPA ? 'armado' : t >= T_RELLENO ? 'relleno' : 'cayendo')
        }
        const seguir = () => {
            leer()
            if (!video.paused && !video.ended) frame = requestAnimationFrame(seguir)
        }
        const alReproducir = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(seguir) }
        const alTerminar = () => { setFase('armado'); setTerminado(true) }
        video.addEventListener('playing', alReproducir)
        video.addEventListener('timeupdate', leer)
        video.addEventListener('ended', alTerminar)
        // Si no arranca solo (modo ahorro, autoplay bloqueado) o tarda, el titular no queda apagado.
        const respaldo = window.setTimeout(() => { if (video.paused) alTerminar() }, 2500)
        video.play().catch(alTerminar)
        return () => {
            cancelAnimationFrame(frame)
            window.clearTimeout(respaldo)
            video.removeEventListener('playing', alReproducir)
            video.removeEventListener('timeupdate', leer)
            video.removeEventListener('ended', alTerminar)
        }
    }, [sinMovimiento, listo])

    const rearmar = () => {
        const video = videoRef.current
        if (!video) return
        setTerminado(false)
        video.currentTime = 0
        video.play().catch(() => { setFase('armado'); setTerminado(true) })
    }

    // Outlaw es muy ancha (DIA DE LOS ≈ 6,8 em, MUERTOS ≈ 6,2 em): el tamaño sale del ancho disponible
    // para que las líneas queden justificadas como en el flyer, y se estira en vertical.
    const titular = 'font-muertos block origin-bottom scale-y-[1.38] whitespace-nowrap uppercase leading-[0.8] tracking-[-0.02em] transition-opacity duration-500'

    return (
        <section className="relative isolate overflow-hidden bg-[#efeae7] text-[#242526]">
            {/* Velos del color del fondo para que el titular y las acciones se lean sobre el video. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34%] bg-gradient-to-b from-[#efeae7] via-[#efeae7]/70 to-transparent md:hidden" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[34%] bg-gradient-to-t from-[#efeae7] via-[#efeae7]/90 to-transparent md:hidden" />

            <div className="relative z-10 mx-auto max-w-2xl px-5 pt-4 md:max-w-5xl xl:max-w-6xl">{arriba}</div>
            <PapelPicado colores={[M.naranja, M.tinta, M.flor]} cantidad={7} comba={12} className="relative -mt-1 md:hidden" />
            <PapelPicado colores={[M.naranja, M.tinta, M.flor]} cantidad={14} comba={18} className="relative -mt-1 hidden md:block" />

            <div className={`muertos-entrada pointer-events-none relative mx-auto flex min-h-[calc(100svh-130px)] max-w-2xl flex-col px-5 pb-24 pt-3 md:min-h-[600px] md:max-w-5xl md:justify-center md:pb-28 lg:min-h-[640px] xl:max-w-6xl ${listo ? 'listo' : ''}`}>
                <div className="relative md:max-w-[52%]" style={{ '--d': '60ms' } as CSSProperties}>
                    <img src="/muertos/sello-naranja.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-[78px] right-0 z-10 w-[30%] max-w-[140px] rotate-12 mix-blend-multiply md:-right-[18%] md:bottom-auto md:top-0" />
                    <BandaRombos className="md:max-w-[440px]" />
                    <h1 className="sr-only">Día de los muertos de hambre · Una tradición de Alfajor</h1>
                    <span aria-hidden className={`${titular} mt-6 text-center text-[min(calc((100vw-40px)/6.75),84px)] md:text-left md:text-[clamp(52px,5.8vw,86px)]`}>
                        Dia de los
                    </span>
                    <span aria-hidden className={`${titular} mt-[0.42em] text-center text-[min(calc((100vw-40px)/6.1),96px)] md:text-left md:text-[clamp(58px,6.4vw,96px)] ${fase === 'cayendo' ? 'opacity-20' : 'opacity-100'}`}>
                        Muertos
                    </span>
                </div>

                {/* El hueco del alfajor: en el celular, entre MUERTOS y DE HAMBRE; en escritorio, la columna
                    de la derecha. El video (9:16, más grande que el hueco) se funde en los bordes. */}
                <div className="muertos-hueco pointer-events-none relative -z-20 min-h-[78vw] flex-1 sm:min-h-[420px] md:absolute md:inset-y-0 md:right-0 md:min-h-0 md:w-[48%]">
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        preload="auto"
                        poster={sinMovimiento ? '/hero-alfajor-final.webp' : '/hero-alfajor-inicio.webp'}
                        aria-label={nombreVideo}
                        className="absolute left-1/2 top-[calc(50%+1vw)] aspect-[9/16] h-[172vw] max-h-[1100px] -translate-x-1/2 -translate-y-1/2 object-cover [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent),linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-composite:source-in] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent),linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] md:top-1/2 md:h-[118%]"
                    >
                        <source src="/hero-alfajor.webm" type="video/webm" />
                        <source src="/hero-alfajor.mp4" type="video/mp4" />
                    </video>
                    <div aria-hidden className="absolute inset-x-0 top-1/2 h-0">
                        <Floritura className="absolute -left-1 -top-14 w-[12%] max-w-[54px] opacity-90" />
                        <Floritura espejo className="absolute -right-1 -top-14 w-[12%] max-w-[54px] opacity-90" />
                        {[{ x: 2, y: -46, t: 46 }, { x: 86, y: -150, t: 40 }, { x: 4, y: 100, t: 38 }, { x: 84, y: 110, t: 50 }].map((f, i) => (
                            <Cempasuchil
                                key={i}
                                className="muertos-flota absolute"
                                style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.t, '--giro': `${i * 70}deg`, animationDelay: `${-i * 1.3}s` } as CSSProperties}
                            />
                        ))}
                    </div>
                    {/* El alfajor también se toca: abre el producto. */}
                    {onClickVideo && (
                        <button
                            type="button"
                            onClick={onClickVideo}
                            aria-label={`Ver ${nombreVideo}`}
                            className="pointer-events-auto absolute inset-x-[12%] inset-y-[8%] cursor-pointer md:inset-x-[18%] md:inset-y-[30%]"
                        />
                    )}
                </div>

                <div className="md:mt-10 md:max-w-[52%]" style={{ '--d': '240ms' } as CSSProperties}>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 md:justify-start">
                        <span aria-hidden className={`font-muertos origin-bottom scale-y-[1.3] whitespace-nowrap text-[clamp(30px,9vw,50px)] uppercase leading-[0.85] transition-opacity duration-500 ${fase === 'armado' ? 'opacity-100' : 'opacity-20'}`}>De hambre</span>
                        <span className="font-salient -rotate-6 rounded-[50%] border-2 border-[#242526] bg-[#d3532b] px-4 py-1.5 text-center text-[19px] leading-[0.95] text-[#242526]">
                            Una tradición<br />de Alfajor
                        </span>
                    </div>
                    {evento && (
                        <div className="mt-5 space-y-2.5 text-center md:text-left">
                            <p className="font-twin inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-sm bg-[#242526] px-3 py-2 text-[13px] text-[#f2ede0] sm:text-[15px]">
                                Sabado 07 de noviembre <Estrella className="size-3.5 text-[#eea233]" /> Desde las 20:00
                            </p>
                            <p className="font-twin flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12px] sm:text-[14px] md:justify-start">
                                Mariachis <Estrella className="size-3 text-[#d3532b]" /> Alfajores picantes <Estrella className="size-3 text-[#d3532b]" /> Tequilazo
                            </p>
                        </div>
                    )}
                </div>

                <div className="pointer-events-auto mt-7 md:max-w-[52%]" style={{ '--d': '420ms' } as CSSProperties}>{abajo}</div>
            </div>

            {terminado && !sinMovimiento && (
                <button
                    type="button"
                    onClick={rearmar}
                    aria-label="Armalo de nuevo"
                    title="Armalo de nuevo"
                    className="absolute bottom-[92px] right-5 grid size-10 place-items-center rounded-full border-2 border-[#242526] bg-[#f2ede0] text-[#242526] shadow-[3px_3px_0_#242526] transition-transform animate-in fade-in zoom-in-75 duration-500 active:scale-90 md:bottom-28 md:right-8"
                >
                    <RotateCcw className="size-4" />
                </button>
            )}
        </section>
    )
}

/** Dos cintas cruzadas sobre el borde del hero: la naranja con las frases de la noche y los sabores,
 * la de tinta con la leyenda de la bandeja, corriendo al revés. */
export function CintasMuertos({ palabras, className = '' }: { palabras: string[]; className?: string }) {
    const naranja: string[] = []
    const base = [...palabras.slice(0, 4), ...FRASES_CINTA]
    while (naranja.length < 16) naranja.push(...base)
    const fila = (items: string[], oculto: boolean, separador: ReactNode) => (
        <div aria-hidden={oculto} className="flex shrink-0 items-center gap-5 pr-5">
            {items.map((p, i) => (
                <Fragment key={i}>
                    <span className="whitespace-nowrap">{sinTildes(p)}</span>
                    {separador}
                </Fragment>
            ))}
        </div>
    )
    const leyenda = Array.from({ length: 8 }, (_, i) => i % 2 ? 'Una tradicion de Alfajor' : 'Dia de los muertos de hambre')
    return (
        <div className={`relative z-10 h-[124px] md:h-[136px] ${className}`}>
            <div className="absolute inset-x-0 top-5 rotate-[2.5deg]">
                <div className="-mx-6 overflow-hidden border-y-2 border-[#242526] bg-[#242526] py-2.5 text-[#f2ede0]">
                    <div className="muertos-marquesina-inversa font-twin flex w-max text-[14px] leading-none">
                        {fila(leyenda, false, <Huesos className="h-4 w-auto" />)}
                        {fila(leyenda, true, <Huesos className="h-4 w-auto" />)}
                    </div>
                </div>
            </div>
            <div className="absolute inset-x-0 top-12 -rotate-2">
                <div className="-mx-6 overflow-hidden border-y-2 border-[#242526] bg-[#d3532b] py-3 text-[#242526] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)]">
                    <div className="muertos-marquesina font-muertos flex w-max text-[26px] uppercase leading-none">
                        {fila(naranja, false, <Estrella className="size-5" />)}
                        {fila(naranja, true, <Estrella className="size-5" />)}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function TituloSeccionMuertos({ indice, titulo, detalle }: { indice: number; titulo: string; detalle?: string }) {
    return (
        <div className="relative px-1 pb-3">
            <div className="flex items-end gap-3">
                <Medallon className="mb-0.5 size-12 -rotate-6">
                    <span className="font-twin text-[17px] tabular-nums tracking-normal text-[#242526]">{String(indice).padStart(2, '0')}</span>
                </Medallon>
                <h2 aria-label={titulo} className="font-muertos min-w-0 flex-1 break-words text-[28px] uppercase leading-[0.95] text-[#242526] sm:text-[38px]">{sinTildes(titulo)}</h2>
                {detalle && <span className="font-twin shrink-0 pb-1 text-[10px] text-[#242526]/60">{sinTildes(detalle)}</span>}
            </div>
            <div aria-hidden className="mt-3 h-[5px] border-y-2 border-[#242526]" />
        </div>
    )
}

/** Las categorías, como etiquetas troqueladas. `'All'` se muestra como "Todo". */
export function NavCategoriasMuertos({ categorias, activa, onChange }: { categorias: string[]; activa: string; onChange: (c: string) => void }) {
    return (
        <nav aria-label="Categorías" className="-mx-5">
            <div className="flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] lg:flex-wrap lg:justify-center lg:overflow-visible [&::-webkit-scrollbar]:hidden">
                {categorias.map((c) => {
                    const sel = activa === c
                    const nombre = c === 'All' ? 'Todo' : c
                    return (
                        <button
                            key={c}
                            type="button"
                            onClick={() => onChange(c)}
                            aria-pressed={sel}
                            aria-label={nombre}
                            className={`font-twin h-10 shrink-0 snap-start whitespace-nowrap rounded-md border-2 border-[#242526] px-4 text-[12px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3532b] active:scale-95 ${sel
                                ? 'bg-[#242526] text-[#f2ede0] shadow-[3px_3px_0_#d3532b]'
                                : 'bg-[#f2ede0] text-[#242526] hover:bg-[#eea233]/30'
                                }`}
                        >
                            {sinTildes(nombre)}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

/** Botón flotante del pedido: barra de tinta con el total en una etiqueta naranja. */
export function BotonPedidoMuertos({ cantidad, total, visible, onClick, pulso = false, className = '' }: {
    cantidad: number
    total: string
    visible: boolean
    onClick: () => void
    pulso?: boolean
    className?: string
}) {
    return (
        <div className={`pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-500 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
            <button
                type="button"
                onClick={onClick}
                tabIndex={visible ? 0 : -1}
                className={`group flex h-14 w-full max-w-sm items-center gap-2 rounded-xl border-2 border-[#242526] bg-[#242526] pl-3 pr-2 text-[#f2ede0] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)] transition-transform duration-300 active:scale-[0.97] ${visible ? 'pointer-events-auto' : ''} ${pulso ? 'scale-105' : ''} ${className}`}
            >
                <Calavera className="size-8 shrink-0 -rotate-6" />
                <span className="font-twin text-[13px]">Ver mi pedido</span>
                <span className="text-[12px] tabular-nums opacity-60">· {cantidad}</span>
                <span className="ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-[#d3532b] px-3.5 text-[15px] font-bold tabular-nums text-[#242526]">
                    ${total}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
            </button>
        </div>
    )
}

/** La noche del evento (sólo hasta que pasa) y el ritual del altar de la tarjeta DDM. */
export function NocheYAltar() {
    const evento = eventoVigente()
    return (
        <section aria-label="La noche de muertos" className={`grid gap-5 ${evento ? 'md:grid-cols-[1.1fr_0.9fr]' : 'mx-auto max-w-xl'}`}>
            {evento && (
                <article className="relative overflow-hidden rounded-2xl border-2 border-[#242526] bg-[#161413] p-6 text-[#f2ede0] sm:p-8">
                    <div aria-hidden className="absolute -right-10 -top-10 size-64 rounded-full bg-[radial-gradient(circle,rgba(238,162,51,0.28),transparent_65%)]" />
                    <p className="font-twin relative flex items-center gap-2 text-[11px] text-[#eea233]">
                        Sabado 07 de noviembre <Estrella className="size-3" /> 20:00
                    </p>
                    <h2 className="font-muertos relative mt-5 origin-bottom-left scale-y-[1.3] whitespace-nowrap text-[min(calc((100vw-100px)/6.3),64px)] uppercase leading-[0.85]">La noche</h2>
                    <div className="relative mt-6 grid grid-cols-[1fr_auto] gap-5">
                        <div className="min-w-0">
                            <p className="max-w-[30ch] text-[15px] leading-snug text-[#f2ede0]/75">
                                Vení a Alfajor a celebrar a los que ya no están, con la panza llena.
                            </p>
                            <ul className="font-twin mt-5 space-y-2 text-[13px]">
                                {['Mariachis', 'Alfajores picantes', 'Tequilazo'].map(x => (
                                    <li key={x} className="flex items-center gap-2.5"><Estrella className="size-3.5 text-[#d3532b]" />{x}</li>
                                ))}
                            </ul>
                        </div>
                        <a href="/muertos/flyer.webp" target="_blank" rel="noopener noreferrer" className="relative -mt-2 block w-[min(30vw,150px)] rotate-3 transition-transform hover:rotate-0" aria-label="Ver el flyer de la noche">
                            <img src="/muertos/flyer.webp" alt="Flyer: Día de los muertos de hambre, sábado 7 de noviembre desde las 20:00" loading="lazy" className="w-full rounded-sm border-[5px] border-[#f2ede0] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.8)]" />
                            <span className="absolute -top-3 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-6 bg-[#eea233]/80" />
                        </a>
                    </div>
                    <div aria-hidden className="relative mt-6 flex items-end gap-1">
                        <Vela alto={1.1} className="w-10" demora={0} />
                        <Vela alto={0.7} className="w-8" demora={250} />
                        <Vela alto={0.9} className="w-9" demora={500} />
                        <img src="/muertos/chile.webp" alt="" loading="lazy" className="ml-auto w-16 -rotate-12" />
                    </div>
                </article>
            )}

            <article className="relative overflow-hidden rounded-2xl border-2 border-[#242526] bg-[#f2ede0] p-6 text-center sm:p-8">
                <Calavera className="mx-auto w-16 -rotate-6" />
                <p className="font-salient mt-5 text-[clamp(26px,7.4vw,36px)] leading-[1.02] text-[#d3532b]">
                    Todos cargamos con algo que nos pesa. Esta es tu oportunidad para dejarlo ir.
                </p>
                <p className="font-twin mx-auto mt-6 max-w-sm border-2 border-dotted border-[#d3532b] px-4 py-3 text-[11px] leading-relaxed text-[#d3532b]">
                    Escribilo, llevalo al altar y sella el ritual con un shot de tequila.
                </p>
                <img src="/muertos/sello-naranja.webp" alt="" loading="lazy" className="mx-auto mt-6 w-36 -rotate-6 mix-blend-multiply" />
            </article>
        </section>
    )
}

/** La ronda de esqueletos de la bandeja, bailando sobre una hilera de cempasúchil. */
export function BaileEsqueletos() {
    return (
        <section aria-label="Hasta los muertos vuelven por uno" className="relative mt-20 overflow-hidden">
            <div className="mx-auto max-w-2xl px-5 text-center lg:max-w-5xl">
                <p className="font-salient text-balance text-[clamp(30px,8.4vw,52px)] leading-none text-[#242526]">Hasta los muertos vuelven por uno</p>
                <img
                    src="/muertos/esqueletos-naranja.svg"
                    alt="Esqueletos bailando en ronda"
                    loading="lazy"
                    className="muertos-baile mx-auto mt-8 w-[min(100%,560px)]"
                />
            </div>
            <div aria-hidden className="relative -mt-6 flex justify-center gap-0 overflow-hidden">
                {Array.from({ length: 30 }, (_, i) => (
                    <Cempasuchil key={i} className="-mx-1.5 w-14 shrink-0 sm:w-16" style={{ rotate: `${(i * 53) % 360}deg`, translate: `0 ${i % 2 ? 8 : 0}px` }} />
                ))}
            </div>
        </section>
    )
}

const turnosDelDia = (horarios: Turno[], dia: number) => horarios
    .filter(h => h.diaSemana === dia)
    .sort((a, b) => minutos(a.horaApertura) - minutos(b.horaApertura))
    .map(h => `${hhmm(h.horaApertura)} – ${hhmm(h.horaCierre)}`)
    .join(' · ')

const mapaDe = (calle: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${calle}, Santa Fe, Argentina`)}`

function ListaHorarios({ horarios }: { horarios: Turno[] }) {
    const hoy = new Date().getDay()
    return (
        <ul>
            {SEMANA.map(dia => {
                const turnos = turnosDelDia(horarios, dia)
                const esHoy = dia === hoy
                return (
                    <li
                        key={dia}
                        className={`flex items-baseline justify-between gap-4 border-b border-dashed border-[#f2ede0]/15 py-2 text-sm ${esHoy ? 'font-bold text-[#eea233]' : 'text-[#f2ede0]/80'}`}
                    >
                        <span>{DIAS[dia]}{esHoy && <span className="ml-1.5 text-[10px] uppercase tracking-widest">· hoy</span>}</span>
                        <span className="tabular-nums">{turnos || 'Cerrado'}</span>
                    </li>
                )
            })}
        </ul>
    )
}

/** Lo del footer que conviene ver antes de pedir, entre el hero y la carta: dónde estamos, el horario
 * de hoy (con la semana desplegable) e Instagram, sobre la misma noche con papel picado. */
export function InfoLocalMuertos({ horarios, direccion }: { horarios: Turno[]; direccion?: string | null }) {
    const calle = direccion?.trim() || 'Necochea 3601'
    const hoy = turnosDelDia(horarios, new Date().getDay())
    return (
        <section aria-label="Dónde y cuándo" className="relative overflow-hidden bg-[#161413] pb-10 text-[#f2ede0]">
            <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={7} comba={8} className="md:hidden" />
            <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={14} comba={12} className="hidden md:block" />
            <img src="/muertos/esqueletos-hueso.svg" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -left-20 bottom-0 w-[360px] opacity-[0.06]" />
            <div className="relative mx-auto grid max-w-2xl gap-8 px-5 pt-8 md:grid-cols-[1fr_1fr_auto] md:items-start lg:max-w-5xl xl:max-w-6xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-twin text-[11px] text-[#eea233]">Donde estamos</p>
                        <a href={mapaDe(calle)} target="_blank" rel="noopener noreferrer" className="group mt-3 block">
                            <span className="font-muertos block text-[30px] uppercase leading-[0.95] transition-colors group-hover:text-[#d3532b]">
                                {sinTildes(calle)}
                                <br />
                                Santa Fe
                            </span>
                            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f2ede0]/70 underline decoration-[#f2ede0]/30 underline-offset-4 group-hover:decoration-[#f2ede0]">
                                <MapPin className="size-4" /> Cómo llegar
                            </span>
                        </a>
                    </div>
                    <img src="/muertos/sello-hueso.webp" alt="" aria-hidden className="w-28 shrink-0 rotate-6 md:hidden" />
                </div>

                {horarios.length > 0 && (
                    <div>
                        <p className="font-twin text-[11px] text-[#eea233]">Hoy</p>
                        <p className="font-muertos mt-3 text-[30px] leading-[0.95] tabular-nums">{hoy || 'Cerrado'}</p>
                        <details className="group mt-3">
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[#f2ede0]/70 underline decoration-[#f2ede0]/30 underline-offset-4 hover:decoration-[#f2ede0] [&::-webkit-details-marker]:hidden">
                                <ArrowDown className="size-4 transition-transform group-open:rotate-180" /> Todos los horarios
                            </summary>
                            <div className="mt-3 max-w-sm"><ListaHorarios horarios={horarios} /></div>
                        </details>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
                    <img src="/muertos/sello-hueso.webp" alt="" aria-hidden className="hidden w-32 rotate-6 md:block" />
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-twin inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#f2ede0]/25 px-4 text-[12px] transition-colors hover:border-[#f2ede0]/60"
                    >
                        <Instagram className="size-4" /> @alfajorconpapas
                    </a>
                    <span className="text-sm text-[#f2ede0]/60">Delivery y take away.</span>
                </div>
            </div>
        </section>
    )
}

export function FooterMuertos({ horarios, direccion, onPedir }: { horarios: Turno[]; direccion?: string | null; onPedir?: () => void }) {
    const calle = direccion?.trim() || 'Necochea 3601'

    return (
        <footer className="relative text-[#f2ede0]">
            <div className="relative overflow-hidden bg-[#161413] pb-32">
                <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={7} comba={10} className="md:hidden" />
                <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={14} comba={14} className="hidden md:block" />
                <img src="/muertos/esqueletos-hueso.svg" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -right-16 bottom-10 w-[420px] opacity-[0.07]" />
                <div className="relative mx-auto grid max-w-2xl gap-12 px-5 pt-10 lg:max-w-5xl lg:grid-cols-[1.2fr_1fr_1fr] xl:max-w-6xl">
                    <div>
                        <img src="/muertos/sello-hueso.webp" alt="Día de los muertos de hambre · Una tradición de Alfajor" className="w-44 -rotate-6" />
                        <div className="mt-7 flex flex-wrap gap-2">
                            {onPedir && (
                                <button
                                    type="button"
                                    onClick={onPedir}
                                    className="font-twin inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#f2ede0] bg-[#d3532b] px-5 text-[12px] text-[#161413] transition-transform active:scale-95"
                                >
                                    Hacer mi pedido <ArrowUp className="size-4" />
                                </button>
                            )}
                            <a
                                href={INSTAGRAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-twin inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#f2ede0]/25 px-4 text-[12px] transition-colors hover:border-[#f2ede0]/60"
                            >
                                <Instagram className="size-4" /> @alfajorconpapas
                            </a>
                        </div>
                        <a href="/" className="font-twin mt-5 inline-flex items-center gap-2 text-[11px] text-[#f2ede0]/55 underline decoration-[#f2ede0]/25 underline-offset-4 transition-colors hover:text-[#eea233]">
                            Ver la carta de siempre <ArrowRight className="size-3.5" />
                        </a>
                    </div>

                    <div>
                        <p className="font-twin text-[11px] text-[#eea233]">Donde estamos</p>
                        <a href={mapaDe(calle)} target="_blank" rel="noopener noreferrer" className="group mt-3 block">
                            <span className="font-muertos block text-[34px] uppercase leading-[0.95] transition-colors group-hover:text-[#d3532b]">
                                {sinTildes(calle)}
                                <br />
                                Santa Fe
                            </span>
                            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f2ede0]/70 underline decoration-[#f2ede0]/30 underline-offset-4 group-hover:decoration-[#f2ede0]">
                                <MapPin className="size-4" /> Cómo llegar
                            </span>
                        </a>
                        <p className="mt-5 text-sm text-[#f2ede0]/60">Delivery y take away.</p>
                    </div>

                    {horarios.length > 0 && (
                        <div>
                            <p className="font-twin text-[11px] text-[#eea233]">Horarios</p>
                            <div className="mt-3"><ListaHorarios horarios={horarios} /></div>
                        </div>
                    )}
                </div>

                <BandaRombos color={M.naranja} className="mx-auto mt-14 max-w-6xl px-5 opacity-60" />
                <div className="relative mx-auto mt-6 flex max-w-2xl flex-wrap justify-between gap-2 px-5 text-xs text-[#f2ede0]/45 lg:max-w-5xl xl:max-w-6xl">
                    <span>© {new Date().getFullYear()} Alfajor · Santa Fe</span>
                    <span>
                        Pedidos online con{' '}
                        <a
                            href={PIRU_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-[#f2ede0]/30 underline-offset-4 transition-colors hover:text-[#d3532b] hover:decoration-[#d3532b]"
                        >
                            Piru
                        </a>
                    </span>
                </div>
            </div>
        </footer>
    )
}

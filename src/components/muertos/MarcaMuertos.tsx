import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Instagram, MapPin, RotateCcw } from 'lucide-react'
import { DIAS, INSTAGRAM_URL, PIRU_URL, SEMANA, hhmm, minutos, type Turno } from '@/lib/marcaAlfajor'
import { FRASES_CINTA, M, eventoVigente, sinTildes, useEtapaIntro } from '@/lib/muertos'
import { BandaRombos, Calavera, Estrella, Huesos, PapelPicado } from './Decoraciones'

// Las piezas de /muertosdehambre: la misma estructura que components/marca/MarcaAlfajor (hero con el
// video, cinta, botón del pedido y footer) vestida como el flyer del Día de los muertos de hambre:
// papel, tinta y naranja. La carta (categorías, títulos y tarjetas) usa las piezas originales de la marca.

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
// Cuánto después de empezar a abrirse el agujero de la bienvenida arranca el video.
const DEMORA_VIDEO = 450

/** El hero, como el de la carta de siempre: el video del alfajor que se arma ocupa el fondo (se funde
 * en los bordes) y el titular del flyer se enciende al compás. Arriba, en el aire por donde cae el
 * relleno, DIA DE LOS / MUERTOS; abajo, sobre el piso, DE HAMBRE, la noche y las acciones: el alfajor
 * queda literalmente entre "muertos" y "de hambre". En escritorio el video va a la derecha.
 *
 * El texto entra cuando se empieza a abrir el agujero de la bienvenida y el video arranca cuando la
 * quema va por la mitad (arrancarlo junto con la quema la trababa); las dos cosas salen de
 * useEtapaIntro. Se reproduce una vez y queda en el último cuadro; se puede volver a armar. Sin
 * movimiento se ve la foto final. */
export function HeroMuertos({ arriba, abajo, nombreVideo, onClickVideo }: {
    arriba: ReactNode
    abajo: ReactNode
    nombreVideo: string
    onClickVideo?: () => void
}) {
    const etapaIntro = useEtapaIntro()
    const listo = etapaIntro !== 'corriendo'
    const reproducir = etapaIntro !== 'corriendo'
    const videoRef = useRef<HTMLVideoElement>(null)
    const [sinMovimiento] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [fase, setFase] = useState<FaseArmado>(sinMovimiento ? 'armado' : 'cayendo')
    const [terminado, setTerminado] = useState(sinMovimiento)
    const evento = eventoVigente()

    useEffect(() => {
        const video = videoRef.current
        if (!video || sinMovimiento || !reproducir) return
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
        const respaldo = window.setTimeout(() => { if (video.paused) alTerminar() }, 2500 + DEMORA_VIDEO)
        // Arranca con el agujero ya abierto a medias: se ve armarse desde el principio sin cargar el
        // arranque del video sobre los primeros cuadros de la quema.
        const arranque = window.setTimeout(() => video.play().catch(alTerminar), DEMORA_VIDEO)
        return () => {
            cancelAnimationFrame(frame)
            window.clearTimeout(respaldo)
            window.clearTimeout(arranque)
            video.removeEventListener('playing', alReproducir)
            video.removeEventListener('timeupdate', leer)
            video.removeEventListener('ended', alTerminar)
        }
    }, [sinMovimiento, reproducir])

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

            <div className={`muertos-entrada pointer-events-none relative mx-auto flex min-h-[calc(100svh-130px)] max-w-2xl flex-col px-5 pb-24 pt-8 md:min-h-[600px] md:max-w-5xl md:justify-center md:pb-28 lg:min-h-[640px] xl:max-w-6xl ${listo ? 'listo' : ''}`}>
                <div className="relative md:max-w-[52%]" style={{ '--d': '60ms' } as CSSProperties}>
                    <img src="/muertos/sello-naranja.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-[26px] -right-[2%] z-10 w-[28%] max-w-[140px] rotate-12 mix-blend-multiply md:-bottom-[34px] md:-right-[10%]" />
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
                <div className="muertos-hueco pointer-events-none relative -z-20 min-h-[100vw] flex-1 sm:min-h-[520px] md:absolute md:inset-y-0 md:right-0 md:min-h-0 md:w-[48%]">
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
                                Sabado 07 de noviembre <Estrella className="size-3.5 text-[#d3532b]" /> Desde las 20:00
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

/** La noche del evento, a todo el ancho entre el hero y la carta, con la ronda de esqueletos de la
 * bandeja. Fecha, título y lista van con el mismo aire entre renglones. Pasado el evento no se muestra. */
export function NocheMuertos() {
    if (!eventoVigente()) return null
    return (
        <section aria-label="La noche de muertos" className="relative overflow-hidden bg-[#161413] pb-14 pt-14 text-[#f2ede0]">
            <div aria-hidden className="absolute -right-24 top-10 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(211,83,43,0.18),transparent_65%)]" />
            <div className="relative mx-auto grid max-w-2xl items-center gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] lg:max-w-5xl xl:max-w-6xl">
                <div>
                    <p className="font-twin flex items-center gap-2 text-[11px] text-[#d3532b]">
                        Sabado 07 de noviembre <Estrella className="size-3" /> Desde las 20:00
                    </p>
                    {/* El titular se estira hacia arriba (scale-y 1,3): el margen de arriba suma ese estiramiento
                        para que el aire quede igual que el de abajo. */}
                    <h2 className="font-muertos mt-[calc(24px+0.26em)] origin-bottom-left scale-y-[1.3] whitespace-nowrap text-[min(calc((100vw-40px)/6.3),88px)] uppercase leading-[0.85] md:text-[clamp(56px,6vw,88px)]">La noche</h2>
                    <ul className="font-twin mt-6 flex flex-wrap gap-x-5 gap-y-2.5 text-[13px]">
                        {['Mariachis', 'Alfajores picantes', 'Tequilazo'].map(x => (
                            <li key={x} className="flex items-center gap-2.5"><Estrella className="size-3.5 text-[#d3532b]" />{x}</li>
                        ))}
                    </ul>
                </div>
                <img src="/muertos/esqueletos-hueso.svg" alt="Esqueletos bailando en ronda" className="mx-auto w-full max-w-[560px]" />
            </div>
        </section>
    )
}

/** El cierre antes del footer: el sello ovalado de la tradición, solo y centrado sobre el papel. */
export function SelloMuertos() {
    return (
        <section aria-label="Una tradición de Alfajor" className="flex justify-center px-5 py-20">
            <img src="/muertos/sello-naranja.webp" alt="Día de los muertos de hambre · Una tradición de Alfajor" loading="lazy" className="w-[min(64vw,300px)] mix-blend-multiply" />
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
                        className={`flex items-baseline justify-between gap-4 border-b border-dashed border-[#f2ede0]/15 py-2 text-sm ${esHoy ? 'font-bold text-[#d3532b]' : 'text-[#f2ede0]/80'}`}
                    >
                        <span>{DIAS[dia]}{esHoy && <span className="ml-1.5 text-[10px] uppercase tracking-widest">· hoy</span>}</span>
                        <span className="tabular-nums">{turnos || 'Cerrado'}</span>
                    </li>
                )
            })}
        </ul>
    )
}

export function FooterMuertos({ horarios, direccion, onPedir }: { horarios: Turno[]; direccion?: string | null; onPedir?: () => void }) {
    const calle = direccion?.trim() || 'Necochea 3601'

    return (
        <footer className="relative text-[#f2ede0]">
            <div className="relative overflow-hidden bg-[#161413] pb-32">
                <PapelPicado colores={[M.naranja, M.hueso]} hilo={M.hueso} cantidad={7} comba={10} className="md:hidden" />
                <PapelPicado colores={[M.naranja, M.hueso]} hilo={M.hueso} cantidad={14} comba={14} className="hidden md:block" />
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
                        <a href="/" className="font-twin mt-5 inline-flex items-center gap-2 text-[11px] text-[#f2ede0]/55 underline decoration-[#f2ede0]/25 underline-offset-4 transition-colors hover:text-[#d3532b]">
                            Ver la carta de siempre <ArrowRight className="size-3.5" />
                        </a>
                    </div>

                    <div>
                        <p className="font-twin text-[11px] text-[#d3532b]">Donde estamos</p>
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
                            <p className="font-twin text-[11px] text-[#d3532b]">Horarios</p>
                            <div className="mt-3"><ListaHorarios horarios={horarios} /></div>
                        </div>
                    )}
                </div>

                <div className="relative mx-auto mt-14 flex max-w-2xl flex-wrap justify-between gap-2 px-5 text-xs text-[#f2ede0]/45 lg:max-w-5xl xl:max-w-6xl">
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

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Instagram, MapPin, RotateCcw } from 'lucide-react'
import { DIAS, INSTAGRAM_URL, SEMANA, hhmm, minutos, type Turno } from '@/lib/marcaAlfajor'

// Piezas de la identidad de Alfajor que comparten la carta (MenuDelivery) y el pedido en grupo (Menu):
// el hero con el video del alfajor que se arma, la cinta de sabores, los títulos de sección, las
// categorías, el botón del pedido y el footer. Nada queda fijo arriba al scrollear.
// Paleta oficial de la marca: verde #083821, naranja #eb623a y crema #f2eee2 (#052a18 es el verde
// del modo oscuro). El hero usa de fondo #efeae7, el blanco cálido del video, para que no tenga cortes.
// Lo que va dentro de la carta sigue usando las variables del tema.

/** El logo en verde. El archivo (/logo.webp) es crema sobre transparente: se usa de máscara y se pinta. */
export function LogoAlfajor({ className = '' }: { className?: string }) {
    return (
        <span
            role="img"
            aria-label="Alfajor"
            className={`block aspect-[1080/472] bg-[#083821] [mask-image:url(/logo.webp)] [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url(/logo.webp)] [-webkit-mask-position:left_center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] ${className}`}
        />
    )
}

export function EstadoLocal({ abierto, texto, corto }: { abierto: boolean; texto: string; corto?: string }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#083821]/15 bg-[#083821]/5 px-3 py-1.5 text-xs text-[#083821] backdrop-blur-sm">
            <span className="relative flex size-2 shrink-0">
                <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${abierto ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`relative size-2 rounded-full ${abierto ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            {corto ? (
                <>
                    <span className="truncate sm:hidden">{corto}</span>
                    <span className="hidden truncate sm:inline">{texto}</span>
                </>
            ) : <span className="truncate">{texto}</span>}
        </span>
    )
}

/** El botón principal: un ticket naranja con su talón troquelado a la derecha. */
export function BotonTicket({ children, onClick, icono }: { children: ReactNode; onClick: () => void; icono?: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group inline-flex h-14 items-stretch overflow-hidden rounded-lg bg-[#eb623a] text-[#083821] shadow-[0_14px_30px_-14px_rgba(8,56,33,0.6)] transition-transform duration-150 hover:-rotate-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083821]"
        >
            <span className="font-alfajor flex items-center px-5 pt-0.5 text-[20px] uppercase leading-none">{children}</span>
            <span className="flex w-14 items-center justify-center border-l-2 border-dashed border-[#083821]/35 [&_svg]:size-5">
                {icono ?? <ArrowDown className="transition-transform group-hover:translate-y-0.5" />}
            </span>
        </button>
    )
}

/** Fondo de puntitos sutil para los bloques verdes. */
export const Puntillado = () => (
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(#f2eee2_1px,transparent_1px)] bg-[length:18px_18px] opacity-[0.07]" />
)

/** El borde festoneado de un toldo verde, coronando el footer. */
export function Toldo() {
    return (
        <div
            aria-hidden
            className="h-3 w-full bg-[length:24px_12px] bg-repeat-x bg-[radial-gradient(circle_at_50%_100%,#083821_11.5px,transparent_12px)] dark:bg-[radial-gradient(circle_at_50%_100%,#052a18_11.5px,transparent_12px)]"
        />
    )
}

/** En qué punto del armado va el video: el relleno todavía cae, ya aterrizó, o cayó la segunda tapa. */
export type FaseArmado = 'cayendo' | 'relleno' | 'armado'

// Momentos del video /hero-alfajor (5,3 s): la tapa de abajo está desde el principio, el relleno
// aterriza a 1,25 s y la tapa de arriba a 1,85 s; después el alfajor queda quieto.
const T_RELLENO = 1.25
const T_TAPA = 1.85

/** El hero entero gira alrededor del video del alfajor que se arma.
 *
 * En el celular el hero ocupa la primera pantalla: arriba, en el aire por donde cae el relleno, va el
 * titular; en el medio se arma el alfajor; abajo, sobre el piso, las acciones. El video (vertical,
 * 9:16) no cubre: se escala para que el alfajor —que ocupa casi todo el ancho del cuadro— quede en
 * ~87% del ancho del teléfono, y se funde en los bordes. En escritorio va a la derecha, a toda
 * altura. El fondo es el mismo blanco cálido del video, así que no hay recuadro ni borde.
 *
 * El video se reproduce una vez y queda en el último cuadro (el alfajor armado); se puede volver a
 * armar. `titulo` recibe la fase para encenderse al compás: primero el relleno, después la tapa.
 * Sin movimiento (prefers-reduced-motion) o si el navegador no lo reproduce solo, se ve la foto
 * final y la fase es 'armado' desde el principio. */
export function HeroVideo({ arriba, titulo, abajo, nombreVideo, onClickVideo }: {
    arriba: ReactNode
    titulo: (fase: FaseArmado) => ReactNode
    abajo: ReactNode
    nombreVideo: string
    onClickVideo?: () => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [sinMovimiento] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [fase, setFase] = useState<FaseArmado>(sinMovimiento ? 'armado' : 'cayendo')
    const [terminado, setTerminado] = useState(sinMovimiento)

    useEffect(() => {
        const video = videoRef.current
        if (!video || sinMovimiento) return
        let frame = 0
        const leer = () => {
            const t = video.currentTime
            setFase(t >= T_TAPA ? 'armado' : t >= T_RELLENO ? 'relleno' : 'cayendo')
        }
        // currentTime leído en cada cuadro: `timeupdate` llega cada ~250 ms y el titular quedaría tarde.
        // Igual se escucha `timeupdate` de respaldo, por si el navegador frena los cuadros (pestaña oculta).
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
    }, [sinMovimiento])

    const rearmar = () => {
        const video = videoRef.current
        if (!video) return
        setTerminado(false)
        video.currentTime = 0
        video.play().catch(() => { setFase('armado'); setTerminado(true) })
    }

    return (
        <section className="relative isolate overflow-hidden bg-[#efeae7] text-[#083821]">
            <video
                ref={videoRef}
                muted
                playsInline
                preload="auto"
                poster={sinMovimiento ? '/hero-alfajor-final.webp' : '/hero-alfajor-inicio.webp'}
                aria-label={nombreVideo}
                className="absolute left-1/2 top-[calc(50%+12px)] -z-20 aspect-[9/16] h-[min(172vw,82%)] -translate-x-1/2 -translate-y-1/2 object-cover [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent),linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-composite:source-in] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent),linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] md:left-auto md:right-[5%] md:h-[112%] md:translate-x-0 lg:right-[7%]"
            >
                <source src="/hero-alfajor.webm" type="video/webm" />
                <source src="/hero-alfajor.mp4" type="video/mp4" />
            </video>

            {/* Velos del color del fondo: el titular y las acciones se leen aunque pase el relleno o el
                piso tenga sombra. En escritorio no hacen falta: el texto va al costado. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26%] bg-gradient-to-b from-[#efeae7] via-[#efeae7]/60 to-transparent md:hidden" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[24%] bg-gradient-to-t from-[#efeae7] via-[#efeae7]/85 to-transparent md:hidden" />

            {/* El alfajor también se toca: abre el producto. Va debajo del texto (que deja pasar los toques). */}
            {onClickVideo && (
                <button
                    type="button"
                    onClick={onClickVideo}
                    aria-label={`Ver ${nombreVideo}`}
                    className="absolute inset-x-[8%] bottom-[32%] top-[36%] -z-10 cursor-pointer md:inset-x-auto md:bottom-[28%] md:right-[12%] md:top-[30%] md:w-[30%]"
                />
            )}

            <div className="pointer-events-none mx-auto flex min-h-[max(640px,100svh)] max-w-2xl flex-col px-5 pb-20 pt-5 md:min-h-[620px] md:max-w-5xl md:justify-center md:pb-24 lg:min-h-[700px] xl:max-w-6xl">
                <div className="pointer-events-auto animate-in fade-in duration-700 md:absolute md:inset-x-0 md:top-0 md:mx-auto md:max-w-5xl md:px-5 md:pt-6 xl:max-w-6xl">{arriba}</div>
                <div className="pointer-events-auto mt-6 md:mt-0 md:max-w-[54%]">{titulo(fase)}</div>
                {/* En el celular, el alfajor se arma en este hueco. */}
                <div className="flex-1 md:hidden" />
                <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-700 md:mt-9 md:max-w-[54%]">{abajo}</div>
            </div>

            {terminado && !sinMovimiento && (
                <button
                    type="button"
                    onClick={rearmar}
                    aria-label="Armalo de nuevo"
                    title="Armalo de nuevo"
                    className="absolute bottom-[86px] right-5 grid size-10 place-items-center rounded-full bg-[#083821] text-[#f2eee2] shadow-[0_10px_24px_-10px_rgba(8,56,33,0.7)] transition-transform animate-in fade-in zoom-in-75 duration-500 active:scale-90 md:bottom-28 md:right-8"
                >
                    <RotateCcw className="size-4" />
                </button>
            )}
        </section>
    )
}

const Destello = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
        <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor" />
    </svg>
)

/** Cinta naranja con los sabores pasando, inclinada sobre el borde de abajo del hero. */
export function Cinta({ palabras, className = '-mt-2' }: { palabras: string[]; className?: string }) {
    // Se repite hasta llenar un monitor ancho: la animación corre la mitad del total.
    const lista: string[] = []
    while (lista.length < 14) lista.push(...palabras)
    const grupo = (oculto: boolean) => (
        <div aria-hidden={oculto} className="flex shrink-0 items-center gap-5 pr-5">
            {lista.map((p, i) => (
                <Fragment key={i}>
                    <span className="whitespace-nowrap">{p}</span>
                    <Destello />
                </Fragment>
            ))}
        </div>
    )
    return (
        <div className={`relative z-10 -rotate-2 py-3 ${className}`}>
            <div className="-mx-4 overflow-hidden bg-[#eb623a] py-3 text-[#083821] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)]">
                <div className="alfajor-marquesina font-alfajor flex w-max text-[24px] uppercase leading-none">
                    {grupo(false)}
                    {grupo(true)}
                </div>
            </div>
        </div>
    )
}

export function TituloSeccion({ indice, titulo, detalle }: { indice: number; titulo: string; detalle?: string }) {
    return (
        <div className="flex items-end gap-3 border-b-2 border-foreground/85 px-1 pb-2.5">
            <span className="font-barlow mb-1 shrink-0 -rotate-6 rounded-md bg-[#eb623a] px-1.5 py-1 text-lg leading-none text-[#083821] tabular-nums">{String(indice).padStart(2, '0')}</span>
            <h2 className="font-alfajor min-w-0 flex-1 break-words text-[30px] uppercase leading-[0.95] text-foreground sm:text-[40px]">{titulo}</h2>
            {detalle && <span className="shrink-0 pb-1 text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">{detalle}</span>}
        </div>
    )
}

/** Las categorías, como etiquetas de papel. `'All'` se muestra como "Todo". */
export function NavCategorias({ categorias, activa, onChange }: { categorias: string[]; activa: string; onChange: (c: string) => void }) {
    return (
        <nav aria-label="Categorías" className="-mx-5">
            <div className="flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] lg:flex-wrap lg:justify-center lg:overflow-visible [&::-webkit-scrollbar]:hidden">
                {categorias.map((c) => {
                    const sel = activa === c
                    return (
                        <button
                            key={c}
                            type="button"
                            onClick={() => onChange(c)}
                            aria-pressed={sel}
                            className={`font-alfajor h-10 shrink-0 snap-start whitespace-nowrap rounded-full border-2 px-4 text-[13px] uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95 ${sel
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-foreground/20 text-foreground hover:border-foreground/60'
                                }`}
                        >
                            {c === 'All' ? 'Todo' : c}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

/** Botón flotante del pedido: una barra verde de la marca (crema en modo oscuro) con el total. */
export function BotonPedido({ cantidad, total, visible, onClick, pulso = false, className = '' }: {
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
                className={`group flex h-14 w-full max-w-sm items-center gap-2 rounded-2xl bg-[#083821] pl-5 pr-2 text-[#f2eee2] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)] transition-transform duration-300 active:scale-[0.97] dark:bg-[#f2eee2] dark:text-[#083821] ${visible ? 'pointer-events-auto' : ''} ${pulso ? 'scale-105' : ''} ${className}`}
            >
                <span className="font-alfajor text-[15px]">Ver mi pedido</span>
                <span className="text-[13px] tabular-nums opacity-60">· {cantidad} {cantidad === 1 ? 'producto' : 'productos'}</span>
                <span className="ml-auto flex h-10 items-center gap-1.5 rounded-xl bg-[#eb623a] px-3.5 text-[15px] font-bold tabular-nums text-[#083821]">
                    ${total}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
            </button>
        </div>
    )
}

export function FooterMarca({ horarios, direccion, onPedir }: { horarios: Turno[]; direccion?: string | null; onPedir?: () => void }) {
    const hoy = new Date().getDay()
    const turnosDe = (dia: number) => horarios
        .filter(h => h.diaSemana === dia)
        .sort((a, b) => minutos(a.horaApertura) - minutos(b.horaApertura))
        .map(h => `${hhmm(h.horaApertura)} – ${hhmm(h.horaCierre)}`)
        .join(' · ')
    const calle = direccion?.trim() || 'Necochea 3601'
    const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${calle}, Santa Fe, Argentina`)}`

    return (
        <footer className="relative mt-24 text-[#f2eee2]">
            <Toldo />
            <div className="relative overflow-hidden bg-[#083821] pb-32 dark:bg-[#052a18]">
                <Puntillado />
                <div className="relative mx-auto grid max-w-2xl gap-12 px-5 pt-12 lg:max-w-5xl lg:grid-cols-[1.2fr_1fr_1fr] xl:max-w-6xl">
                    <div>
                        <img src="/logo.webp" alt="Alfajor" className="h-20 w-auto -rotate-3" />
                        <div className="mt-6 flex flex-wrap gap-2">
                            {onPedir && (
                                <button
                                    type="button"
                                    onClick={onPedir}
                                    className="font-alfajor inline-flex h-11 items-center gap-2 rounded-lg bg-[#eb623a] px-5 text-sm uppercase tracking-wide text-[#083821] transition-transform active:scale-95"
                                >
                                    Hacer mi pedido <ArrowUp className="size-4" />
                                </button>
                            )}
                            <a
                                href={INSTAGRAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-alfajor inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#f2eee2]/25 px-4 text-sm transition-colors hover:border-[#f2eee2]/60"
                            >
                                <Instagram className="size-4" /> @alfajorconpapas
                            </a>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#eb623a]">Dónde estamos</p>
                        <a href={mapa} target="_blank" rel="noopener noreferrer" className="group mt-3 block">
                            <span className="font-barlow block text-[46px] uppercase leading-[0.9] transition-colors group-hover:text-[#eb623a]">
                                {calle}
                                <br />
                                Santa Fe
                            </span>
                            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f2eee2]/70 underline decoration-[#f2eee2]/30 underline-offset-4 group-hover:decoration-[#f2eee2]">
                                <MapPin className="size-4" /> Cómo llegar
                            </span>
                        </a>
                        <p className="mt-5 text-sm text-[#f2eee2]/60">Delivery y take away.</p>
                    </div>

                    {horarios.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#eb623a]">Horarios</p>
                            <ul className="mt-3">
                                {SEMANA.map(dia => {
                                    const turnos = turnosDe(dia)
                                    const esHoy = dia === hoy
                                    return (
                                        <li
                                            key={dia}
                                            className={`flex items-baseline justify-between gap-4 border-b border-dashed border-[#f2eee2]/15 py-2 text-sm ${esHoy ? 'font-bold text-[#eb623a]' : 'text-[#f2eee2]/80'}`}
                                        >
                                            <span>{DIAS[dia]}{esHoy && <span className="ml-1.5 text-[10px] uppercase tracking-widest">· hoy</span>}</span>
                                            <span className="tabular-nums">{turnos || 'Cerrado'}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="relative mx-auto mt-14 flex max-w-2xl flex-wrap justify-between gap-2 px-5 text-xs text-[#f2eee2]/45 lg:max-w-5xl xl:max-w-6xl">
                    <span>© {new Date().getFullYear()} Alfajor · Santa Fe</span>
                    <span>Pedidos online con Piru</span>
                </div>
            </div>
        </footer>
    )
}

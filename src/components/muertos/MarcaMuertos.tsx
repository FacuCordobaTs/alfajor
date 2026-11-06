import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Instagram, MapPin } from 'lucide-react'
import { DIAS, INSTAGRAM_URL, PIRU_URL, SEMANA, hhmm, minutos, type Turno } from '@/lib/marcaAlfajor'
import { FRASES_CINTA, sinTildes, useEtapaIntro } from '@/lib/muertos'
import { Calavera, Estrella, Huesos } from './Decoraciones'

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

/** El hero es el flyer del evento, impreso sobre su mismo papel: el fondo es la textura del flyer
 * (public/muertos/papel.webp, una franja limpia del flyer espejada para que no tenga costuras, a la
 * escala en que se ve el flyer) y los bordes del flyer se funden en ella, así que no hay recuadro. Todo
 * lo que el flyer ya dice (título, fecha, la noche, el sello, "Una tradición de Alfajor") no se repite:
 * alrededor sólo van el logo, el estado del local y las acciones. En el celular el flyer toma el alto que
 * deja libre la primera pantalla, para que "Elegí tu ofrenda" se vea sin scrollear; en escritorio, el flyer a la izquierda y las acciones a la derecha.
 *
 * La bienvenida termina quemando un agujero desde el centro: el flyer queda visible desde el primer
 * cuadro (no espera la entrada) para que el agujero lo descubra. El resto entra cuando empieza a verse. */
export function HeroMuertos({ arriba, abajo }: { arriba: ReactNode; abajo: ReactNode }) {
    const listo = useEtapaIntro() !== 'corriendo'

    return (
        <section className="relative isolate overflow-hidden bg-[#d4cfc9] bg-[url(/muertos/papel.webp)] bg-[length:800px_auto] text-[#242526]">
            <h1 className="sr-only">Día de los muertos de hambre · Una tradición de Alfajor · Sábado 7 de noviembre desde las 20:00</h1>
            <div className="relative z-10 mx-auto max-w-2xl px-5 pt-4 md:max-w-5xl xl:max-w-6xl">{arriba}</div>

            <div className={`muertos-entrada mx-auto flex max-w-2xl flex-col items-center pb-28 md:max-w-5xl md:flex-row md:items-center md:justify-center md:gap-14 md:px-5 md:pb-32 md:pt-4 xl:max-w-6xl ${listo ? 'listo' : ''}`}>
                <img
                    src="/muertos/flyer-v3-720.webp"
                    srcSet="/muertos/flyer-v3-720.webp 720w, /muertos/flyer-v3.webp 1080w"
                    sizes="(min-width: 768px) 70vh, 100vw"
                    width={1080}
                    height={1440}
                    alt="Día de los muertos de hambre. Una tradición de Alfajor. Sábado 07 de noviembre desde las 20:00: mariachis, alfajores picantes y tequilazo."
                    fetchPriority="high"
                    className="muertos-hueco mt-1 h-[min(calc(100svh-200px),133.4vw)] w-auto max-w-full [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,#000_3%,#000_95%,transparent),linear-gradient(to_right,transparent,#000_3%,#000_97%,transparent)] [-webkit-mask-composite:source-in] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_3%,#000_95%,transparent),linear-gradient(to_right,transparent,#000_3%,#000_97%,transparent)] md:mt-0 md:h-[min(calc(100svh-110px),880px)] md:max-w-none"
                />
                <div className="mt-2 w-full px-5 text-center md:mt-0 md:w-auto md:max-w-sm md:px-0 md:text-left" style={{ '--d': '200ms' } as CSSProperties}>
                    <p className="font-twin hidden text-[11px] text-[#d3532b] md:block">Delivery y take away</p>
                    <h2 className="font-muertos mt-4 hidden origin-bottom-left scale-y-[1.3] whitespace-nowrap text-[clamp(40px,4vw,56px)] uppercase leading-[0.9] md:block">
                        Hambre<br />de muerto
                    </h2>
                    <p className="mx-auto mt-3 hidden max-w-[30ch] text-[15px] leading-snug text-[#242526]/75 md:mx-0 md:mt-6 md:block">
                        Toda la carta de Alfajor, para pedir a domicilio o pasar a buscar.
                    </p>
                    <div className="mt-1 md:mt-6">{abajo}</div>
                </div>
            </div>
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
                <div className="relative mx-auto grid max-w-2xl gap-12 px-5 pt-10 lg:max-w-5xl lg:grid-cols-[1.2fr_1fr_1fr] xl:max-w-6xl">
                    <div>
                        <img src="/logo.webp" alt="Alfajor" className="h-20 w-auto -rotate-3" />
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
                        <a href="/carta" className="font-twin mt-5 inline-flex items-center gap-2 text-[11px] text-[#f2ede0]/55 underline decoration-[#f2ede0]/25 underline-offset-4 transition-colors hover:text-[#d3532b]">
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

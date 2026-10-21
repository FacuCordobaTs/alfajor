import { Fragment, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Instagram, MapPin } from 'lucide-react'
import { DIAS, INSTAGRAM_URL, SEMANA, hhmm, minutos, type Turno } from '@/lib/marcaAlfajor'

// Piezas de la identidad de Alfajor que comparten la carta (MenuDelivery) y el pedido en grupo (Menu):
// el logo sobre el verde, el "toldo" festoneado, la cinta de sabores, el alfajor que se apoya en ella, los títulos
// de sección, las categorías, el botón del pedido y el footer. Nada queda fijo arriba al scrollear.
// Paleta oficial de la marca: verde #083821, naranja #eb623a y crema #f2eee2 (#052a18 es el verde
// del modo oscuro). Lo que va dentro de la carta sigue usando las variables del tema.

export function HeaderMarca({ children, enlaceInicio = false }: { children?: ReactNode; enlaceInicio?: boolean }) {
    const logo = <img src="/logo.webp" alt="Alfajor" className="h-11 w-auto -rotate-3" />
    return (
        <header className="relative bg-[#083821] text-[#f2eee2] dark:bg-[#052a18]">
            <div className="mx-auto flex h-20 max-w-2xl items-center justify-between gap-3 px-5 lg:max-w-5xl xl:max-w-6xl">
                {enlaceInicio ? <a href="/" aria-label="Alfajor, inicio" className="shrink-0">{logo}</a> : <span className="shrink-0">{logo}</span>}
                <div className="flex min-w-0 items-center gap-2">{children}</div>
            </div>
        </header>
    )
}

export function EstadoLocal({ abierto, texto, corto }: { abierto: boolean; texto: string; corto?: string }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#f2eee2]/20 bg-[#f2eee2]/5 px-3 py-1.5 text-xs font-semibold text-[#f2eee2]">
            <span className="relative flex size-2 shrink-0">
                <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${abierto ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={`relative size-2 rounded-full ${abierto ? 'bg-emerald-400' : 'bg-red-400'}`} />
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
            className="group inline-flex h-14 items-stretch overflow-hidden rounded-lg bg-[#eb623a] text-[#083821] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.8)] transition-transform duration-150 hover:-rotate-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2eee2]"
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

/** El borde festoneado de un toldo: cuelga del bloque verde (abajo) o lo corona (arriba). */
export function Toldo({ arriba = false }: { arriba?: boolean }) {
    return (
        <div
            aria-hidden
            className={`h-3 w-full bg-[length:24px_12px] bg-repeat-x ${arriba
                ? 'bg-[radial-gradient(circle_at_50%_100%,#083821_11.5px,transparent_12px)] dark:bg-[radial-gradient(circle_at_50%_100%,#052a18_11.5px,transparent_12px)]'
                : 'bg-[radial-gradient(circle_at_50%_0,#083821_11.5px,transparent_12px)] dark:bg-[radial-gradient(circle_at_50%_0,#052a18_11.5px,transparent_12px)]'
                }`}
        />
    )
}

/** Trazo de marcador que tacha una palabra del titular (se dibuja al cargar). */
export const Tachado = () => (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute left-[-5%] top-[34%] h-[0.34em] w-[110%] text-[#eb623a]">
        <path
            className="alfajor-trazo"
            pathLength={1}
            d="M4 26 C 46 8, 92 34, 132 16 S 184 6, 196 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
        />
    </svg>
)

/** El alfajor recortado (sin fondo) que sale del bloque verde y queda detrás de la cinta de sabores.
 * Va con `absolute` dentro del contenedor del hero: la página le da tamaño y lugar con `className`.
 * Queda por encima del toldo y por debajo de la cinta (z-[5] contra su z-10). */
export function AlfajorEnElToldo({ src, srcSet, sizes, nombre, onClick, className = '' }: {
    src: string
    srcSet?: string
    sizes?: string
    nombre: string
    onClick?: () => void
    className?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            aria-label={onClick ? `Ver ${nombre}` : undefined}
            className={`group absolute z-[5] animate-in fade-in slide-in-from-bottom-8 duration-700 ${className}`}
        >
            <img
                src={src}
                srcSet={srcSet}
                sizes={sizes}
                alt={nombre}
                draggable={false}
                decoding="async"
                className="w-full -rotate-[4deg] select-none drop-shadow-[0_26px_22px_rgba(0,0,0,0.55)] transition-transform duration-500 group-enabled:group-hover:-translate-y-1.5 group-enabled:group-hover:-rotate-[2deg]"
            />
        </button>
    )
}

const Destello = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
        <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor" />
    </svg>
)

/** Cinta naranja con los sabores pasando, inclinada sobre el borde del hero. */
export function Cinta({ palabras }: { palabras: string[] }) {
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
        <div className="relative z-10 -mt-2 -rotate-2 py-3">
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
            <Toldo arriba />
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

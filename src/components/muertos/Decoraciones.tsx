import { useId, type CSSProperties, type ReactNode } from 'react'
import { M, florPolar } from '@/lib/muertos'

// Ilustraciones propias de la edición Día de los muertos de hambre, dibujadas en SVG con la paleta de
// las piezas impresas: papel picado, cempasúchil, velas, la calavera, las florituras y la banda de
// rombos del flyer. Todas son decorativas (aria-hidden) y no capturan toques.

// ── Papel picado ────────────────────────────────────────────────────────────────────────────────

type Motivo = 'calavera' | 'flor' | 'rombo'

// Borde de abajo festoneado: medias lunas de 10 de ancho.
const BANDERA = 'M0,6 H100 V104 ' + Array.from({ length: 10 }, (_, i) => `A5,5 0 0 1 ${90 - i * 10},104`).join(' ') + ' Z'

/** Lo que se calaría en el papel. En la máscara: negro = agujero, blanco = papel que queda. */
function Calado({ motivo }: { motivo: Motivo }) {
    const marco = (
        <>
            {/* Guarda de rombitos arriba y puntitos en los costados, como el papel picado de verdad. */}
            {Array.from({ length: 8 }, (_, i) => (
                <path key={`r${i}`} d={`M${12 + i * 10.8},14 l3.4,3.4 l-3.4,3.4 l-3.4,-3.4z`} fill="#000" />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
                <g key={`p${i}`}>
                    <circle cx="7" cy={30 + i * 11} r="1.8" fill="#000" />
                    <circle cx="93" cy={30 + i * 11} r="1.8" fill="#000" />
                </g>
            ))}
            {Array.from({ length: 10 }, (_, i) => (
                <path key={`f${i}`} d={`M${5 + i * 10},104 l-2.2,-6 h4.4z`} fill="#000" />
            ))}
        </>
    )
    if (motivo === 'calavera') {
        return (
            <>
                {marco}
                <path d="M50,28 C34,28 26,40 26,52 C26,61 30,66 36,68 L37,76 C37,79 39,81 42,81 L58,81 C61,81 63,79 63,76 L64,68 C70,66 74,61 74,52 C74,40 66,28 50,28Z" fill="#000" />
                <circle cx="41" cy="52" r="6.5" fill="#fff" />
                <circle cx="59" cy="52" r="6.5" fill="#fff" />
                <circle cx="41" cy="52" r="2.4" fill="#000" />
                <circle cx="59" cy="52" r="2.4" fill="#000" />
                <path d="M50,59 l-3.4,6 h6.8z" fill="#fff" />
                <path d="M42,72 V80 M46,72 V80 M50,72 V80 M54,72 V80 M58,72 V80" stroke="#fff" strokeWidth="1.6" />
                <path d="M50,32 l2.2,4 l-2.2,4 l-2.2,-4z" fill="#fff" />
                <path d="M30,90 h40" stroke="#000" strokeWidth="2.4" strokeDasharray="3 3" />
            </>
        )
    }
    if (motivo === 'flor') {
        return (
            <>
                {marco}
                <path d={florPolar(50, 56, 25, 8, 0.55)} fill="#000" />
                <circle cx="50" cy="56" r="8" fill="#fff" />
                <circle cx="50" cy="56" r="3.4" fill="#000" />
                {Array.from({ length: 8 }, (_, i) => {
                    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
                    return <circle key={i} cx={50 + Math.cos(a) * 15} cy={56 + Math.sin(a) * 15} r="1.7" fill="#fff" />
                })}
                <path d="M22,90 h56" stroke="#000" strokeWidth="2.4" strokeDasharray="3 3" />
            </>
        )
    }
    return (
        <>
            {marco}
            <path d="M50,28 L76,56 L50,84 L24,56Z" fill="#000" />
            <path d="M50,38 L66,56 L50,74 L34,56Z" fill="#fff" />
            <path d="M50,47 L58,56 L50,65 L42,56Z" fill="#000" />
            <circle cx="20" cy="40" r="3" fill="#000" />
            <circle cx="80" cy="40" r="3" fill="#000" />
            <circle cx="20" cy="74" r="3" fill="#000" />
            <circle cx="80" cy="74" r="3" fill="#000" />
        </>
    )
}

export function BanderaPicada({ color, motivo, className = '', style }: { color: string; motivo: Motivo; className?: string; style?: CSSProperties }) {
    const id = useId()
    return (
        <svg viewBox="0 0 100 110" aria-hidden className={className} style={style}>
            <defs>
                <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="110">
                    <path d={BANDERA} fill="#fff" />
                    <Calado motivo={motivo} />
                </mask>
            </defs>
            {/* El doblez sobre el hilo. */}
            <rect x="0" y="0" width="100" height="7" fill={color} />
            <rect x="0" y="5.5" width="100" height="1.5" fill="#000" opacity="0.18" />
            <path d={BANDERA} fill={color} mask={`url(#${id})`} />
        </svg>
    )
}

const MOTIVOS: Motivo[] = ['calavera', 'flor', 'rombo']

/** Guirnalda de papel picado colgando de un hilo que se comba. Las banderas se mecen desfasadas.
 * `colores` se reparte en orden; `cantidad` banderas a lo ancho (en el celular conviene ~7). */
export function PapelPicado({ colores, cantidad = 9, comba = 14, className = '', hilo = M.tinta, caer = false }: {
    colores: string[]
    cantidad?: number
    comba?: number
    className?: string
    hilo?: string
    caer?: boolean
}) {
    const medio = (cantidad - 1) / 2
    return (
        <div aria-hidden className={`pointer-events-none relative ${className}`}>
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[40px] w-full overflow-visible">
                <path d={`M-2,2 Q50,${2 + comba * 2.2} 102,2`} fill="none" stroke={hilo} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="relative flex justify-between px-[1%]">
                {Array.from({ length: cantidad }, (_, i) => {
                    const t = medio === 0 ? 0 : (i - medio) / medio
                    const y = comba * (1 - t * t)
                    return (
                        <div
                            key={i}
                            className={caer ? 'muertos-bandera-cae' : ''}
                            style={{ marginTop: y, width: `${92 / cantidad}%`, animationDelay: caer ? `${i * 60}ms` : undefined }}
                        >
                            <BanderaPicada
                                color={colores[i % colores.length]}
                                motivo={MOTIVOS[i % MOTIVOS.length]}
                                className="muertos-bandera block w-full drop-shadow-[0_6px_6px_rgba(0,0,0,0.18)]"
                                style={{ animationDelay: `${-(i * 0.37) % 3}s`, rotate: `${(t * 4).toFixed(1)}deg` }}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Cempasúchil ─────────────────────────────────────────────────────────────────────────────────

const PETALOS_FLOR = [
    { d: florPolar(50, 50, 48, 13, 0.16), fill: M.florOscura },
    { d: florPolar(50, 50, 38, 11, 0.2, 0.3), fill: M.flor },
    { d: florPolar(50, 50, 27, 9, 0.22, 0.1), fill: M.florClara },
    { d: florPolar(50, 50, 15, 7, 0.25, 0.4), fill: M.flor },
]

/** La flor de cempasúchil: cuatro rondas de volados con trazo de tinta, como las piezas impresas. */
export function Cempasuchil({ className = '', style, trazo = M.tinta }: { className?: string; style?: CSSProperties; trazo?: string }) {
    return (
        <svg viewBox="-2 -2 104 104" aria-hidden className={className} style={style}>
            {PETALOS_FLOR.map((p, i) => (
                <path key={i} d={p.d} fill={p.fill} stroke={trazo} strokeWidth={i === 0 ? 2.6 : 1.8} strokeLinejoin="round" />
            ))}
            {/* Nervaduras: rayitas desde el centro que le dan textura de grabado. */}
            {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2
                return (
                    <path
                        key={i}
                        d={`M${50 + Math.cos(a) * 30},${50 + Math.sin(a) * 30} L${50 + Math.cos(a) * 42},${50 + Math.sin(a) * 42}`}
                        stroke={trazo}
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        opacity="0.55"
                    />
                )
            })}
            <circle cx="50" cy="50" r="5" fill={M.florOscura} stroke={trazo} strokeWidth="1.6" />
        </svg>
    )
}

// ── Vela ────────────────────────────────────────────────────────────────────────────────────────

/** Vela de altar con cera chorreada y llama que titila. `encendida` la prende con un fogonazo. */
export function Vela({ alto = 1, encendida = true, className = '', style, demora = 0 }: {
    alto?: number
    encendida?: boolean
    className?: string
    style?: CSSProperties
    demora?: number
}) {
    const id = useId()
    const h = 70 * alto
    const top = 150 - h
    return (
        <svg viewBox="0 0 60 160" aria-hidden className={className} style={style}>
            <defs>
                <radialGradient id={`${id}g`}>
                    <stop offset="0%" stopColor={M.florClara} stopOpacity="0.85" />
                    <stop offset="45%" stopColor={M.flor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={M.flor} stopOpacity="0" />
                </radialGradient>
            </defs>
            <g className={encendida ? 'muertos-vela-luz' : 'opacity-0'} style={{ animationDelay: `${demora}ms` }}>
                <circle cx="30" cy={top - 14} r="30" fill={`url(#${id}g)`} className="muertos-vela-halo" />
            </g>
            {/* Cuerpo, chorreado y plato. */}
            <path
                d={`M14,${top + 6} Q14,${top} 20,${top} H40 Q46,${top} 46,${top + 6} V150 H14Z`}
                fill={M.hueso}
                stroke={M.tinta}
                strokeWidth="2"
            />
            <path
                d={`M14,${top + 6} Q14,${top} 20,${top} H40 Q46,${top} 46,${top + 6} V${top + 12} Q43,${top + 12} 42,${top + 20} Q41,${top + 26} 38,${top + 20} Q37,${top + 12} 33,${top + 12} H26 Q23,${top + 12} 22,${top + 30} Q20,${top + 34} 19,${top + 26} Q18,${top + 12} 14,${top + 12}Z`}
                fill="#fffaf0"
                stroke={M.tinta}
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d={`M20,${top + 40} V${150 - 8}`} stroke={M.tinta} strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
            <path d="M4,150 H56 L52,158 H8Z" fill={M.naranja} stroke={M.tinta} strokeWidth="2" strokeLinejoin="round" />
            <path d={`M30,${top} V${top - 7}`} stroke={M.tinta} strokeWidth="2" strokeLinecap="round" />
            <g className={encendida ? 'muertos-vela-luz' : 'opacity-0'} style={{ animationDelay: `${demora}ms` }}>
                <g className="muertos-llama" style={{ transformOrigin: `30px ${top - 5}px`, animationDelay: `${-demora % 900}ms` }}>
                    <path d={`M30,${top - 32} C36,${top - 22} 39,${top - 14} 36,${top - 8} C34,${top - 4} 26,${top - 4} 24,${top - 8} C21,${top - 14} 25,${top - 22} 30,${top - 32}Z`} fill={M.flor} />
                    <path d={`M30,${top - 22} C33,${top - 16} 34,${top - 12} 32.5,${top - 9} C31.5,${top - 7} 28.5,${top - 7} 27.5,${top - 9} C26,${top - 12} 27,${top - 16} 30,${top - 22}Z`} fill="#fff6d8" />
                </g>
            </g>
        </svg>
    )
}

// ── Calavera de azúcar ──────────────────────────────────────────────────────────────────────────

/** Calavera de azúcar dibujada a mano: ojos de flor, nariz de corazón y frente adornada. */
export function Calavera({ className = '', style, color = M.hueso, tinta = M.tinta, acento = M.naranja }: {
    className?: string
    style?: CSSProperties
    color?: string
    tinta?: string
    acento?: string
}) {
    return (
        <svg viewBox="0 0 100 108" aria-hidden className={className} style={style}>
            <path
                d="M50,4 C23,4 7,23 7,47 C7,61 13,70 22,74 L23,88 C23,95 29,100 36,100 L64,100 C71,100 77,95 77,88 L78,74 C87,70 93,61 93,47 C93,23 77,4 50,4Z"
                fill={color}
                stroke={tinta}
                strokeWidth="3.4"
                strokeLinejoin="round"
            />
            {/* Ojos: un sol de pétalos naranja alrededor del hueco. */}
            <path d={florPolar(32, 50, 16, 10, 0.22)} fill={acento} stroke={tinta} strokeWidth="2" />
            <path d={florPolar(68, 50, 16, 10, 0.22, 0.3)} fill={acento} stroke={tinta} strokeWidth="2" />
            <circle cx="32" cy="50" r="10" fill={tinta} />
            <circle cx="68" cy="50" r="10" fill={tinta} />
            <circle cx="35" cy="47" r="2.6" fill={color} />
            <circle cx="71" cy="47" r="2.6" fill={color} />
            {/* Nariz de corazón al revés. */}
            <path d="M50,72 C46,68 42,65 44,61.5 C45.5,59 48.5,59.5 50,62 C51.5,59.5 54.5,59 56,61.5 C58,65 54,68 50,72Z" fill={tinta} />
            {/* Dientes. */}
            <path d="M31,82 Q50,90 69,82 L68,92 Q50,97 32,92Z" fill={color} stroke={tinta} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M38,84.5 V94 M44,86 V95.5 M50,86.6 V96 M56,86 V95.5 M62,84.5 V94" stroke={tinta} strokeWidth="2" />
            {/* Frente: florcita y gotas. */}
            <path d={florPolar(50, 20, 8.5, 6, 0.4)} fill={acento} stroke={tinta} strokeWidth="1.8" />
            <circle cx="50" cy="20" r="2.6" fill={M.florClara} stroke={tinta} strokeWidth="1.2" />
            <path d="M30,24 q-4,6 0,10 M70,24 q4,6 0,10" fill="none" stroke={acento} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="40" cy="31" r="1.8" fill={tinta} />
            <circle cx="60" cy="31" r="1.8" fill={tinta} />
            <circle cx="50" cy="35" r="1.8" fill={tinta} />
            {/* Mejillas en espiral. */}
            <path d="M16,62 q2,-6 7,-3 q3,3 -1,5" fill="none" stroke={acento} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M84,62 q-2,-6 -7,-3 q-3,3 1,5" fill="none" stroke={acento} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    )
}

// ── Floritura ───────────────────────────────────────────────────────────────────────────────────

/** El adorno de volutas naranja que flanquea la calavera en el flyer. Se espeja con `espejo`. */
export function Floritura({ className = '', style, color = M.naranja, espejo = false }: { className?: string; style?: CSSProperties; color?: string; espejo?: boolean }) {
    return (
        <svg viewBox="0 0 80 160" aria-hidden className={className} style={{ ...style, scale: espejo ? '-1 1' : undefined }}>
            <g fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                {/* Voluta de arriba: baja y se enrosca hacia adentro. */}
                <path d="M62,14 C30,8 12,30 18,52 C23,70 46,72 50,58 C53,47 42,40 35,47 C30,52 35,59 40,56" />
                {/* Voluta de abajo, espejada en vertical. */}
                <path d="M62,146 C30,152 12,130 18,108 C23,90 46,88 50,102 C53,113 42,120 35,113 C30,108 35,101 40,104" />
                {/* Tallo que las une. */}
                <path d="M18,62 C8,74 8,86 18,98" strokeWidth="5" />
            </g>
            <g fill={color}>
                <circle cx="70" cy="80" r="7" />
                <circle cx="54" cy="80" r="4" />
                <path d="M30,80 C36,72 44,74 46,80 C44,86 36,88 30,80Z" />
                <circle cx="70" cy="14" r="4.5" />
                <circle cx="70" cy="146" r="4.5" />
            </g>
        </svg>
    )
}

// ── Banda de rombos ─────────────────────────────────────────────────────────────────────────────

/** La guarda de rombos que abre y cierra el flyer, repetida a lo ancho. */
export function BandaRombos({ color = M.naranja, className = '' }: { color?: string; className?: string }) {
    const id = useId()
    return (
        <svg aria-hidden className={`block h-[26px] w-full ${className}`}>
            <defs>
                <pattern id={id} width="30" height="26" patternUnits="userSpaceOnUse">
                    <path d="M15,3 L26,13 L15,23 L4,13Z" fill="none" stroke={color} strokeWidth="2.2" />
                    <path d="M15,8.5 L20,13 L15,17.5 L10,13Z" fill={color} />
                    <circle cx="0" cy="13" r="1.8" fill={color} />
                    <circle cx="30" cy="13" r="1.8" fill={color} />
                </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="1.6" fill={color} />
            <rect x="0" y="24.4" width="100%" height="1.6" fill={color} />
            <rect x="0" y="0" width="100%" height="26" fill={`url(#${id})`} />
        </svg>
    )
}

// ── Pequeños ────────────────────────────────────────────────────────────────────────────────────

/** El asterisco de ocho puntas que separa las frases del flyer (✷). */
export function Estrella({ className = 'size-4' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
            <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 2.5V21.5M2.5 12H21.5M5.3 5.3L18.7 18.7M18.7 5.3L5.3 18.7" />
            </g>
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        </svg>
    )
}

/** Medallón festoneado (como un sello de cera) para numerar las secciones. */
export function Medallon({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
            <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full">
                <path d={florPolar(50, 50, 48, 16, 0.1)} fill={M.naranja} stroke={M.tinta} strokeWidth="4" />
                <circle cx="50" cy="50" r="33" fill="none" stroke={M.tinta} strokeWidth="2.4" strokeDasharray="4 4" />
            </svg>
            <span className="relative">{children}</span>
        </span>
    )
}

/** Dos huesos cruzados: separador chico. */
export function Huesos({ className = '', color = M.hueso }: { className?: string; color?: string }) {
    const hueso = 'M14,44 a6,6 0 1 1 6,-8 L44,12 a6,6 0 1 1 8,6 a6,6 0 1 1 -6,8 L22,50 a6,6 0 1 1 -8,-6Z'
    return (
        <svg viewBox="0 0 66 62" aria-hidden className={className}>
            <path d={hueso} fill={color} stroke={M.tinta} strokeWidth="3" strokeLinejoin="round" />
            <path d={hueso} fill={color} stroke={M.tinta} strokeWidth="3" strokeLinejoin="round" transform="translate(66 0) scale(-1 1)" />
        </svg>
    )
}

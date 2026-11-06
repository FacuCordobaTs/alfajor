import { useId, type CSSProperties } from 'react'
import { M, florPolar } from '@/lib/muertos'

// Ilustraciones propias de la edición Día de los muertos de hambre, dibujadas en SVG con la paleta de
// las piezas impresas: papel picado, la calavera y los huesos. Todas son decorativas (aria-hidden) y no capturan toques.

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
export function PapelPicado({ colores, cantidad = 9, comba = 14, className = '', hilo = M.tinta }: {
    colores: string[]
    cantidad?: number
    comba?: number
    className?: string
    hilo?: string
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
                        <div key={i} style={{ marginTop: y, width: `${92 / cantidad}%` }}>
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

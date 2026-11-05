import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { HUECO_QUEMADO, M, PETALOS } from '@/lib/muertos'
import { Calavera, Cempasuchil, Floritura, PapelPicado, Vela } from './Decoraciones'

// La bienvenida de /muertosdehambre: reemplaza al "Armando los alfajores" y dura bastante más (~4,5 s).
//
// De noche cae el papel picado y se prenden las velas una por una. Aparece el logo de Alfajor, la
// calavera de azúcar con su corona de cempasúchil, y el póster se arma palabra por palabra como el
// flyer: DIA DE LOS / MUERTOS / DE HAMBRE, cada una golpeando; después la firma a mano. Al final la noche se quema desde el centro, como el agujero del flyer, y
// deja ver la página. No sale antes de que la carta haya cargado (`listo`).
//
// Casi todo corre con animation-delay de CSS (los tiempos de abajo, en ms); el estado sólo decide
// cuándo salir.

const T = {
    velas: [300, 450, 600, 750, 900],
    logo: 250,
    calavera: 500,
    flores: 650,
    dia: 1000,
    muertos: 1320,
    hambre: 1640,
    tradicion: 1950,
}
// Cuándo la composición queda completa (después se quema): ~4,4 s en total con la quema.
const COMPLETA = 3100
const DURA_SALIDA = 420
const DURA_QUEMA = 1300

const escalaHueco = (s: number) => `translate(50 50) scale(${s.toFixed(4)}) translate(-50 -50)`

// Corona de flores alrededor de la calavera.
const CORONA = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (0.92 + (i / 10) * 1.16)
    return { x: 50 + Math.cos(a) * 54, y: 50 + Math.sin(a) * 50, tam: i % 2 ? 20 : 25, giro: (i * 47) % 360 }
})

type Etapa = 'altar' | 'sale' | 'quema'

/** `onRevelar` avisa cuando empieza a verse la página (para que el hero entre mientras se quema). */
export function IntroMuertos({ listo, onFin, onRevelar }: { listo: boolean; onFin: () => void; onRevelar?: () => void }) {
    const mascara = useId()
    const [sinMovimiento] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [etapa, setEtapa] = useState<Etapa>('altar')
    const [completa, setCompleta] = useState(false)
    const onFinRef = useRef(onFin)
    const onRevelarRef = useRef(onRevelar)
    useEffect(() => {
        onFinRef.current = onFin
        onRevelarRef.current = onRevelar
    })
    const huecoRef = useRef<SVGGElement>(null)
    const bordeRef = useRef<SVGGElement>(null)

    // La página queda quieta y arriba mientras dura la bienvenida.
    useEffect(() => {
        window.scrollTo(0, 0)
        const html = document.documentElement
        const previo = html.style.overflow
        html.style.overflow = 'hidden'
        return () => { html.style.overflow = previo }
    }, [])

    useEffect(() => {
        const t = window.setTimeout(() => setCompleta(true), sinMovimiento ? 1400 : COMPLETA)
        return () => window.clearTimeout(t)
    }, [sinMovimiento])

    // Con la composición completa y la carta cargada: se apaga el altar y se quema la noche.
    useEffect(() => {
        if (!completa || !listo || etapa !== 'altar') return
        const t = window.setTimeout(() => setEtapa(sinMovimiento ? 'sale' : 'quema'), 0)
        return () => window.clearTimeout(t)
    }, [completa, listo, etapa, sinMovimiento])

    // La quema se mueve con requestAnimationFrame: Chrome no siempre repinta una animación CSS dentro
    // de un <mask>, y el agujero y su borde tienen que crecer juntos.
    useEffect(() => {
        if (etapa === 'sale') {
            onRevelarRef.current?.()
            const t = window.setTimeout(() => onFinRef.current(), DURA_SALIDA)
            return () => window.clearTimeout(t)
        }
        if (etapa !== 'quema') return
        onRevelarRef.current?.()
        const inicio = performance.now()
        let frame = 0
        const paso = (ahora: number) => {
            const p = Math.min(1, Math.max(0, (ahora - inicio) / DURA_QUEMA))
            const transform = escalaHueco(5.4 * Math.pow(p, 2.1))
            huecoRef.current?.setAttribute('transform', transform)
            bordeRef.current?.setAttribute('transform', transform)
            if (p < 1) frame = requestAnimationFrame(paso)
            else onFinRef.current()
        }
        frame = requestAnimationFrame(paso)
        return () => cancelAnimationFrame(frame)
    }, [etapa])

    const saltar = () => {
        if (!listo) return setCompleta(true)
        setEtapa(e => e !== 'altar' ? e : sinMovimiento ? 'sale' : 'quema')
    }

    // Sin movimiento todo aparece de una.
    const demora = (ms: number): CSSProperties => ({ animationDelay: sinMovimiento ? '0ms' : `${ms}ms` })

    return (
        <div className="menu-delivery fixed inset-0 z-[100] overflow-hidden text-[#f2ede0]" role="dialog" aria-label="Día de los muertos de hambre">
            {/* La noche: un rectángulo de tinta con la mancha quemada como agujero de la máscara. */}
            <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <mask id={mascara} maskUnits="userSpaceOnUse" x="-200" y="-200" width="500" height="500">
                        <rect x="-200" y="-200" width="500" height="500" fill="#fff" />
                        <g ref={huecoRef} transform={escalaHueco(0)}>
                            <path d={HUECO_QUEMADO} fill="#000" />
                        </g>
                    </mask>
                    <filter id={`${mascara}b`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.1" />
                    </filter>
                </defs>
                <rect x="-200" y="-200" width="500" height="500" fill={M.noche} mask={`url(#${mascara})`} />
                {etapa === 'quema' && (
                    <g ref={bordeRef} transform={escalaHueco(0)}>
                        {/* Brasa naranja difusa y el borde chamuscado. */}
                        <path d={HUECO_QUEMADO} fill="none" stroke={M.flor} strokeWidth="2.2" filter={`url(#${mascara}b)`} />
                        <path d={HUECO_QUEMADO} fill="none" stroke={M.naranja} strokeWidth="0.9" />
                        <path d={HUECO_QUEMADO} fill="none" stroke="#2a140a" strokeWidth="0.5" />
                    </g>
                )}
            </svg>

            <div className={`absolute inset-0 ${etapa !== 'altar' ? 'muertos-sale' : ''}`}>
                {/* Luz de velas desde abajo y un resplandor detrás de la calavera. */}
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(238,162,51,0.28),transparent_65%)]" />
                <div aria-hidden className="muertos-aparece absolute left-1/2 top-[34%] size-[min(110vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(211,83,43,0.22)_0%,transparent_62%)]" style={demora(T.calavera)} />

                {!sinMovimiento && (
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        {PETALOS.map((p, i) => (
                            <span
                                key={i}
                                className="muertos-petalo absolute top-0 block rounded-[60%_40%_60%_40%]"
                                style={{
                                    left: `${p.x}%`,
                                    width: p.tam,
                                    height: p.tam * 0.7,
                                    background: p.color,
                                    rotate: `${p.giro}deg`,
                                    '--demora': `${0.8 + p.demora}s`,
                                    '--dura': `${p.dura}s`,
                                } as CSSProperties}
                            />
                        ))}
                    </div>
                )}

                <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={7} comba={16} caer className="absolute inset-x-0 -top-1 md:hidden" />
                <PapelPicado colores={[M.naranja, M.hueso, M.flor]} hilo={M.hueso} cantidad={13} comba={22} caer className="absolute inset-x-0 -top-1 hidden md:block" />

                <div className="muertos-temblor relative mx-auto flex h-full max-w-xl flex-col items-center justify-center px-5 pb-[13svh] pt-20 text-center md:pb-10" style={demora(T.muertos + 120)}>
                    <img src="/logo.webp" alt="Alfajor" className="muertos-aparece h-[min(9svh,64px)] w-auto -rotate-3" style={demora(T.logo)} />

                    {/* La calavera de azúcar con su corona de cempasúchil, entre las volutas. */}
                    <div className="relative mt-[3svh] w-[min(36vw,17svh,170px)]">
                        {CORONA.map((f, i) => (
                            <Cempasuchil
                                key={i}
                                className="muertos-flor-brota absolute -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.tam}%`, rotate: `${f.giro}deg`, ...demora(T.flores + i * 50) }}
                            />
                        ))}
                        <div className="muertos-calavera-entra relative" style={demora(T.calavera)}>
                            <Calavera className="relative w-full drop-shadow-[0_14px_30px_rgba(0,0,0,0.55)]" />
                        </div>
                        <Floritura className="muertos-aparece absolute -left-[62%] top-[6%] w-[36%]" style={demora(T.flores + 300)} />
                        <Floritura espejo className="muertos-aparece absolute -right-[62%] top-[6%] w-[36%]" style={demora(T.flores + 300)} />
                    </div>

                    {/* El póster, palabra por palabra. */}
                    <div className="relative mt-[4svh] w-full">
                        <span className="font-muertos muertos-titulo-entra block origin-bottom whitespace-nowrap text-[min(calc((100vw-40px)/6.75),78px,7svh)] uppercase leading-[0.8] tracking-[-0.02em]" style={demora(T.dia)}>
                            Dia de los
                        </span>
                        <span className="font-muertos muertos-titulo-entra mt-[2.4svh] block origin-bottom whitespace-nowrap text-[min(calc((100vw-40px)/6.1),90px,8.2svh)] uppercase leading-[0.8] tracking-[-0.02em] text-[#d3532b]" style={demora(T.muertos)}>
                            Muertos
                        </span>
                        <span className="font-muertos muertos-titulo-entra mt-[2.4svh] block origin-bottom whitespace-nowrap text-[min(calc((100vw-40px)/7.1),66px,6svh)] uppercase leading-[0.8] tracking-[-0.02em] text-[#eea233]" style={demora(T.hambre)}>
                            De hambre
                        </span>
                    </div>

                    <p className="font-salient muertos-escribe mt-[3.4svh] text-[clamp(24px,6.4vw,36px)] leading-none text-[#f2ede0]" style={demora(T.tradicion)}>
                        Una tradición de Alfajor
                    </p>
                </div>

                {/* Velas al pie, prendiéndose de a una. En pantallas anchas se abren a los costados. */}
                <div aria-hidden className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[3vw] px-4">
                    {[0.9, 1.35, 0.7, 1.15, 0.85].map((alto, i) => (
                        <Vela key={i} alto={alto} demora={sinMovimiento ? 0 : T.velas[i]} className={`w-[min(12vw,58px)] translate-y-2 ${i === 2 ? 'md:invisible md:w-[46vw] md:max-w-[560px]' : ''}`} />
                    ))}
                </div>

                {!sinMovimiento && (
                    <button
                        type="button"
                        onClick={saltar}
                        className="font-twin muertos-aparece absolute right-4 top-[max(96px,12svh)] inline-flex h-9 items-center gap-2 rounded-full border border-[#f2ede0]/25 bg-[#161413]/60 px-3.5 text-[11px] text-[#f2ede0]/70 backdrop-blur-sm transition-colors hover:border-[#f2ede0]/60 hover:text-[#f2ede0]"
                        style={{ animationDelay: '1600ms' }}
                    >
                        Saltar <ArrowRight className="size-3.5" />
                    </button>
                )}
            </div>
        </div>
    )
}

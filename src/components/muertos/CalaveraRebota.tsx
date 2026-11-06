import { useEffect, useRef, useState } from 'react'
import { M, useEtapaIntro } from '@/lib/muertos'
import { Calavera } from './Decoraciones'

// Pedido de uno de los dueños: la calavera de azúcar rebotando por la pantalla como el logo del
// protector de pantalla del DVD. Cambia de color en cada choque y, si pega justo en una esquina, lo
// festeja. Arranca cuando termina la bienvenida, no captura toques y no aparece con movimiento
// reducido. Se mueve con transform en cada cuadro (sin re-render): sólo el color pasa por React.

const COLORES = [
    { color: M.hueso, acento: M.naranja },
    { color: M.naranja, acento: M.tinta },
    { color: M.hueso, acento: M.tinta },
]
// Píxeles por segundo en cada eje.
const VELOCIDAD = 110

export function CalaveraRebota() {
    const etapa = useEtapaIntro()
    const ref = useRef<HTMLDivElement>(null)
    const [tono, setTono] = useState(0)
    const [esquinas, setEsquinas] = useState(0)

    useEffect(() => {
        const el = ref.current
        if (!el || etapa !== 'terminada') return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const { width: ancho, height: alto } = el.getBoundingClientRect()
        const limites = () => ({
            // clientWidth deja afuera la barra de scroll.
            w: Math.max(0, document.documentElement.clientWidth - ancho),
            h: Math.max(0, window.innerHeight - alto),
        })
        let { w, h } = limites()
        let x = Math.random() * w
        let y = Math.random() * h * 0.6
        let vx = VELOCIDAD * (Math.random() < 0.5 ? -1 : 1)
        let vy = VELOCIDAD
        let antes = performance.now()
        let frame = 0
        const paso = (ahora: number) => {
            // Tope al salto: si la pestaña estuvo oculta no aparece del otro lado.
            const dt = Math.min(0.05, (ahora - antes) / 1000)
            antes = ahora
            ;({ w, h } = limites())
            x += vx * dt
            y += vy * dt
            let choques = 0
            if (x <= 0) { x = 0; vx = Math.abs(vx); choques++ } else if (x >= w) { x = w; vx = -Math.abs(vx); choques++ }
            if (y <= 0) { y = 0; vy = Math.abs(vy); choques++ } else if (y >= h) { y = h; vy = -Math.abs(vy); choques++ }
            if (choques) setTono(t => (t + 1) % COLORES.length)
            if (choques === 2) setEsquinas(n => n + 1)
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
            frame = requestAnimationFrame(paso)
        }
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        frame = requestAnimationFrame(paso)
        return () => cancelAnimationFrame(frame)
    }, [etapa])

    if (etapa !== 'terminada') return null
    const { color, acento } = COLORES[tono]

    return (
        <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[35] w-16 will-change-transform md:w-20">
            {/* La key reinicia el festejo en cada esquina. */}
            <div key={esquinas} className={esquinas ? 'muertos-esquina' : ''}>
                <Calavera color={color} acento={acento} className="w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)] transition-colors" />
            </div>
        </div>
    )
}

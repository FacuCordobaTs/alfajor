import { useEffect, useRef, useState } from 'react'
import { M, useEtapaIntro } from '@/lib/muertos'

// Pedido de uno de los dueños: la calavera con sombrero de los stickers rebotando por la pantalla como
// el logo del protector de pantalla del DVD. Cambia de color en cada pared que toca y, si pega justo en
// una esquina, lo festeja. El dibujo (public/muertos/sombrero.webp) se usa de máscara y se pinta con el
// color de turno. Arranca cuando termina la bienvenida, no captura toques y no aparece con movimiento
// reducido. Se mueve con transform en cada cuadro (sin re-render): sólo el color pasa por React.

// Sólo el naranja del sticker y la tinta.
const COLORES = [M.naranja, M.tinta]
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

    return (
        <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[35] w-20 will-change-transform md:w-24">
            {/* La key reinicia el festejo en cada esquina. */}
            <div key={esquinas} className={esquinas ? 'muertos-esquina' : ''}>
                <div className="aspect-[342/326] w-full">
                    <div
                        style={{ backgroundColor: COLORES[tono] }}
                        className="size-full transition-colors duration-150 [mask-image:url(/muertos/sombrero.webp)] [mask-size:contain] [mask-repeat:no-repeat] [-webkit-mask-image:url(/muertos/sombrero.webp)] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat]"
                    />
                </div>
            </div>
        </div>
    )
}

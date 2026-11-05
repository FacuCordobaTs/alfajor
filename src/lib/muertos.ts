// Datos y geometría de la edición temporal "Día de los muertos de hambre" (/muertosdehambre).
// Separado de components/muertos/ para que Fast Refresh no se queje de exports que no son componentes.

/** Paleta de las piezas impresas (bandeja, stickers y flyer): tinta, naranja y papel. El cempasúchil
 * suma el amarillo de la flor, sólo para flores, velas y papel picado. */
export const M = {
    tinta: '#242526',
    noche: '#161413',
    naranja: '#d3532b',
    papel: '#e8e2d2',
    hueso: '#f2ede0',
    flor: '#eea233',
    florClara: '#f6c457',
    florOscura: '#d9701f',
} as const

/** Outlaw Grizzly Hunter y Twinable no traen tildes ni eñes: como en el flyer ("DIA", "SABADO"),
 * los textos que van con esas letras se escriben sin tilde. La ñ queda como n. */
export const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

// La noche del evento (flyer): sábado 7 de noviembre de 2026 desde las 20:00. Pasada la madrugada
// del domingo deja de anunciarse.
export const EVENTO_FIN = new Date('2026-11-08T06:00:00-03:00')
export const eventoVigente = () => Date.now() < EVENTO_FIN.getTime()

export const FRASES_CINTA = ['Pinche cabron', 'Alfajores picantes', 'No manches', 'Tequilazo', 'Mariachis']

/** Generador determinístico: las piezas "al azar" (pétalos, el borde quemado) son siempre iguales. */
function semilla(s: number) {
    return () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
    }
}

/** Contorno cerrado y suave que pasa por los puntos (Catmull-Rom → Bézier). */
function curvaCerrada(puntos: [number, number][]) {
    const n = puntos.length
    const p = (i: number) => puntos[(i + n) % n]
    let d = `M${p(0)[0].toFixed(2)},${p(0)[1].toFixed(2)}`
    for (let i = 0; i < n; i++) {
        const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2)
        const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6]
        const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6]
        d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`
    }
    return d + 'Z'
}

/** Flor con `n` volados: radio que ondula alrededor de (cx, cy). Sirve para el cempasúchil y los sellos. */
export function florPolar(cx: number, cy: number, r: number, n: number, onda: number, giro = 0) {
    const pasos = n * 8
    const puntos: [number, number][] = []
    for (let i = 0; i < pasos; i++) {
        const a = (i / pasos) * Math.PI * 2 + giro
        const rr = r * (1 - onda + onda * Math.abs(Math.cos((a - giro) * n / 2)))
        puntos.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    }
    return curvaCerrada(puntos)
}

/** El agujero quemado del flyer: una mancha irregular centrada en (50, 50), radio ~20. */
export const HUECO_QUEMADO = (() => {
    const azar = semilla(26)
    const puntos: [number, number][] = []
    const n = 15
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const r = 20 * (0.78 + azar() * 0.42)
        puntos.push([50 + Math.cos(a) * r * 0.92, 50 + Math.sin(a) * r * 1.08])
    }
    return curvaCerrada(puntos)
})()

/** Pétalos de cempasúchil que caen en la bienvenida: posición, tamaño, demora y duración fijas. */
export const PETALOS = (() => {
    const azar = semilla(1102)
    return Array.from({ length: 22 }, (_, i) => ({
        x: Math.round(azar() * 100),
        tam: 7 + Math.round(azar() * 9),
        demora: +(azar() * 4.2).toFixed(2),
        dura: +(3.6 + azar() * 2.6).toFixed(2),
        giro: Math.round(azar() * 360),
        color: [M.flor, M.florClara, M.florOscura, M.naranja][i % 4],
    }))
})()

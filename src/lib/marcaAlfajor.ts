// Datos de la identidad de Alfajor que usa components/marca/MarcaAlfajor.tsx (separados para Fast Refresh).

export type Turno = { diaSemana: number; horaApertura: string; horaCierre: string }

export const INSTAGRAM_URL = 'https://www.instagram.com/alfajorconpapas/'
export const PIRU_URL = 'https://info.piru.app'
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const SEMANA = [1, 2, 3, 4, 5, 6, 0]

export const minutos = (hora: string) => {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
}
export const hhmm = (hora: string) => hora.slice(0, 5)

/** Hora de cierre del turno que está corriendo ahora (contempla los que pasan la medianoche). */
function cierreTurnoActual(horarios: Turno[]): string | null {
    const ahora = new Date()
    const hoy = ahora.getDay()
    const ayer = (hoy + 6) % 7
    const m = ahora.getHours() * 60 + ahora.getMinutes()
    for (const h of horarios) {
        const a = minutos(h.horaApertura)
        const c = minutos(h.horaCierre)
        const enCurso = c > a
            ? h.diaSemana === hoy && m >= a && m < c
            : (h.diaSemana === hoy && m >= a) || (h.diaSemana === ayer && m < c)
        if (enCurso) return hhmm(h.horaCierre)
    }
    return null
}

/** El estado del local en una frase: "Abierto · hasta las 23:45" o "Cerrado · abrimos hoy a las 19:45". */
export function textoEstado(horarios: Turno[], estado: { abierto: boolean; proximaApertura: string | null }) {
    if (!estado.abierto) return estado.proximaApertura ? `Cerrado · abrimos ${estado.proximaApertura}` : 'Cerrado por ahora'
    const cierre = cierreTurnoActual(horarios)
    return cierre ? `Abierto · hasta las ${cierre}` : 'Abierto ahora'
}

/** Los sabores para la cinta: "Alfajor Cheese Con Papas" → "Cheese". */
export function sabores(nombres: string[]): string[] {
    const limpios = Array.from(new Set(nombres
        .map(n => n.replace(/^alfajor(es)?\s+/i, '').replace(/\s+(con|sin)\s+papas$/i, '').trim())
        .filter(Boolean)))
    return limpios.length > 0 ? limpios : ['Alfajores salados', 'Papas fritas']
}

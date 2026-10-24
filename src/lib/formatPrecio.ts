/**
 * Precio para mostrar en pantalla: sin decimales cuando es entero ($2000, no $2000.00) y con dos sólo
 * si los tiene ($14100.50). Acepta el número o el texto con que se guarda el precio ("15500.00").
 *
 * Es sólo para mostrar: lo que viaja al backend (precio, itemsTotal, total) sigue en `toFixed(2)`.
 */
export function formatPrecio(valor: number | string | null | undefined): string {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor
    if (numero == null || !Number.isFinite(numero)) return '0'
    return numero.toFixed(2).replace(/\.00$/, '')
}

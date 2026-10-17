export type DatosDomicilio = {
  tipoDomicilio?: 'casa' | 'departamento' | null
  piso?: string
  numeroDepartamento?: string
}

export type DireccionGuardada = DatosDomicilio & {
  direccion: string
  lat: number | null
  lng: number | null
  usadaEn: number
}

const MAX_DIRECCIONES_GUARDADAS = 6

export const normalizarTelefonoDireccion = (telefono: string) => telefono.replace(/\D/g, '')
export const normalizarDireccion = (direccion: string) => direccion
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const storageKeyDirecciones = (restauranteId: number, telefono: string) =>
  `cliente_direcciones_v1_${restauranteId}_${normalizarTelefonoDireccion(telefono)}`

export const leerDireccionesCliente = (restauranteId: number, telefono: string): DireccionGuardada[] => {
  if (!restauranteId || normalizarTelefonoDireccion(telefono).length < 8) return []
  try {
    const guardadas = JSON.parse(localStorage.getItem(storageKeyDirecciones(restauranteId, telefono)) || '[]')
    if (!Array.isArray(guardadas)) return []
    return guardadas
      .filter((item): item is DireccionGuardada => !!item && typeof item.direccion === 'string' && !!item.direccion.trim())
      .slice(0, MAX_DIRECCIONES_GUARDADAS)
  } catch {
    return []
  }
}

const guardarDireccionesCliente = (
  restauranteId: number,
  telefono: string,
  nuevas: DireccionGuardada[],
): DireccionGuardada[] => {
  if (!restauranteId || normalizarTelefonoDireccion(telefono).length < 8) return []

  const combinadas = new Map<string, DireccionGuardada>()
  for (const item of [...leerDireccionesCliente(restauranteId, telefono), ...nuevas]) {
    const direccion = item.direccion.trim()
    const clave = normalizarDireccion(direccion)
    if (!clave) continue
    const anterior = combinadas.get(clave)
    const candidata = {
      ...datosDomicilio(item),
      direccion,
      lat: Number.isFinite(item.lat) ? item.lat : null,
      lng: Number.isFinite(item.lng) ? item.lng : null,
      usadaEn: Number.isFinite(item.usadaEn) ? item.usadaEn : Date.now(),
    }
    combinadas.set(clave, anterior ? {
      ...((candidata.tipoDomicilio && (!anterior.tipoDomicilio || candidata.usadaEn >= anterior.usadaEn))
        ? datosDomicilio(candidata) : datosDomicilio(anterior)),
      direccion: candidata.usadaEn >= anterior.usadaEn ? candidata.direccion : anterior.direccion,
      lat: candidata.lat ?? anterior.lat,
      lng: candidata.lng ?? anterior.lng,
      usadaEn: Math.max(anterior.usadaEn, candidata.usadaEn),
    } : candidata)
  }

  const resultado = [...combinadas.values()]
    .sort((a, b) => b.usadaEn - a.usadaEn)
    .slice(0, MAX_DIRECCIONES_GUARDADAS)
  try {
    localStorage.setItem(storageKeyDirecciones(restauranteId, telefono), JSON.stringify(resultado))
  } catch { /* localStorage puede estar bloqueado */ }
  return resultado
}

export const guardarDireccionCliente = (
  restauranteId: number,
  telefono: string,
  direccion: string,
  lat: number | null,
  lng: number | null,
  domicilio: DatosDomicilio = {},
) => guardarDireccionesCliente(restauranteId, telefono, [{ ...datosDomicilio(domicilio), direccion, lat, lng, usadaEn: Date.now() }])

export const sincronizarDireccionesCliente = async (restauranteId: number, telefono: string) => {
  const telefonoNormalizado = normalizarTelefonoDireccion(telefono)
  if (!restauranteId || telefonoNormalizado.length < 8) return leerDireccionesCliente(restauranteId, telefono)

  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const response = await fetch(`${url}/public/restaurante/${restauranteId}/mis-pedidos/${encodeURIComponent(telefonoNormalizado)}`)
  if (!response.ok) return leerDireccionesCliente(restauranteId, telefonoNormalizado)
  const result = await response.json()
  const pedidos = Array.isArray(result.data) ? result.data : []
  return guardarDireccionesCliente(restauranteId, telefonoNormalizado, pedidos.flatMap((pedido: any) => {
    if (pedido?.tipo !== 'delivery' || typeof pedido.direccion !== 'string' || !pedido.direccion.trim()) return []
    const lat = pedido.latitud == null || pedido.latitud === '' ? null : Number(pedido.latitud)
    const lng = pedido.longitud == null || pedido.longitud === '' ? null : Number(pedido.longitud)
    const usadaEn = new Date(pedido.createdAt || 0).getTime()
    return [{
      ...datosDomicilio(pedido),
      direccion: pedido.direccion,
      lat: lat !== null && Number.isFinite(lat) ? lat : null,
      lng: lng !== null && Number.isFinite(lng) ? lng : null,
      usadaEn: Number.isFinite(usadaEn) ? usadaEn : 0,
    }]
  }))
}

// El backend recibe el domicilio en notas; los campos separados se guardan sólo en el navegador.
const PREFIJO_DOMICILIO = /^Piso ([^\n]+?) Dpto ([^\n]+)(?:\n|$)/

export const notasSinDomicilio = (notas = '') => notas.replace(PREFIJO_DOMICILIO, '').trim()

export const datosDomicilio = (datos: DatosDomicilio & { notas?: string }): DatosDomicilio => {
  const anterior = datos.notas?.match(PREFIJO_DOMICILIO)
  const tipoDomicilio = datos.tipoDomicilio === 'casa' || datos.tipoDomicilio === 'departamento'
    ? datos.tipoDomicilio : anterior ? 'departamento' : null
  return {
    tipoDomicilio,
    piso: tipoDomicilio === 'departamento' ? (datos.piso ?? anterior?.[1] ?? '').trim() : '',
    numeroDepartamento: tipoDomicilio === 'departamento' ? (datos.numeroDepartamento ?? anterior?.[2] ?? '').trim() : '',
  }
}

export const notasConDomicilio = (notas: string, datos: DatosDomicilio) => {
  const limpias = notasSinDomicilio(notas)
  return datos.tipoDomicilio === 'departamento'
    ? [`Piso ${datos.piso?.trim() || ''} Dpto ${datos.numeroDepartamento?.trim() || ''}`, limpias].filter(Boolean).join('\n')
    : limpias
}

export const buscarDomicilioCliente = (restauranteId: number, telefono: string, direccion: string): DatosDomicilio =>
  datosDomicilio(leerDireccionesCliente(restauranteId, telefono).find(item => normalizarDireccion(item.direccion) === normalizarDireccion(direccion)) || {})


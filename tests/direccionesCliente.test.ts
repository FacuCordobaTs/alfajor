import { beforeEach, expect, test } from 'bun:test'
import { guardarDireccionCliente, leerDireccionesCliente, buscarDomicilioCliente, notasConDomicilio, notasSinDomicilio, datosDomicilio, sincronizarDireccionesCliente } from '../src/lib/direccionesCliente'

const almacenamiento = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => almacenamiento.get(key) ?? null,
  setItem: (key: string, value: string) => almacenamiento.set(key, value),
}, configurable: true })
beforeEach(() => almacenamiento.clear())
const telefono = '342 1234567'
const depto = { tipoDomicilio: 'departamento' as const, piso: '4', numeroDepartamento: 'C' }

test('cada dirección conserva su propio domicilio, separado por teléfono y restaurante', () => {
  guardarDireccionCliente(6, telefono, 'San Martín 123', -31, -60, depto)
  guardarDireccionCliente(6, telefono, 'Otra 456', -32, -61, { tipoDomicilio: 'casa' })
  expect(buscarDomicilioCliente(6, '3421234567', ' SAN MARTIN 123 ')).toEqual(depto)
  expect(buscarDomicilioCliente(6, telefono, 'Otra 456').tipoDomicilio).toBe('casa')
  expect(buscarDomicilioCliente(6, telefono, 'Nueva 789').tipoDomicilio).toBeNull()
  expect(leerDireccionesCliente(7, telefono)).toEqual([])
  expect(leerDireccionesCliente(6, '3427654321')).toEqual([])
})

test('guardar sólo coordenadas no borra el departamento; cambiar a casa sí lo limpia', () => {
  guardarDireccionCliente(6, telefono, 'San Martín 123', -31, -60, depto)
  guardarDireccionCliente(6, telefono, 'San Martín 123', -31, -60)
  expect(buscarDomicilioCliente(6, telefono, 'San Martín 123')).toEqual(depto)
  guardarDireccionCliente(6, telefono, 'San Martín 123', -31, -60, { tipoDomicilio: 'casa' })
  expect(buscarDomicilioCliente(6, telefono, 'San Martín 123')).toEqual({ tipoDomicilio: 'casa', piso: '', numeroDepartamento: '' })
})

test('notas anteriores recuperan piso y departamento; editar no duplica y conserva instrucciones', () => {
  const notas = 'Piso PB Dpto A 2\nTocar timbre'
  expect(datosDomicilio({ notas })).toEqual({ tipoDomicilio: 'departamento', piso: 'PB', numeroDepartamento: 'A 2' })
  expect(notasConDomicilio(notas, depto)).toBe('Piso 4 Dpto C\nTocar timbre')
  expect(notasConDomicilio(notasConDomicilio(notas, depto), depto)).toBe('Piso 4 Dpto C\nTocar timbre')
  expect(notasConDomicilio(notas, { tipoDomicilio: 'casa' })).toBe('Tocar timbre')
  expect(notasSinDomicilio(notas)).toBe('Tocar timbre')
})

test('las direcciones antiguas sin domicilio siguen disponibles sin inventar un departamento', () => {
  almacenamiento.set('cliente_direcciones_v1_6_3421234567', JSON.stringify([{ direccion: 'Vieja 123', lat: -31, lng: -60, usadaEn: 1 }]))
  expect(leerDireccionesCliente(6, telefono)).toHaveLength(1)
  expect(buscarDomicilioCliente(6, telefono, 'Vieja 123').tipoDomicilio).toBeNull()
})

test('sincronizar historial recupera domicilio y no pisa correcciones locales más recientes', async () => {
  const fetchOriginal = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: [
    { tipo: 'delivery', direccion: 'Historial 123', latitud: '-31', longitud: '-60', notas: 'Piso 2 Dpto B', createdAt: '2026-01-01' },
    { tipo: 'delivery', direccion: 'Casa 456', latitud: '-31', longitud: '-60', notas: 'Piso 8 Dpto A', createdAt: '2026-01-01' },
  ] }))) as typeof fetch
  try {
    guardarDireccionCliente(6, telefono, 'Casa 456', -31, -60, { tipoDomicilio: 'casa' })
    await sincronizarDireccionesCliente(6, telefono)
    expect(buscarDomicilioCliente(6, telefono, 'Historial 123')).toEqual({ tipoDomicilio: 'departamento', piso: '2', numeroDepartamento: 'B' })
    expect(buscarDomicilioCliente(6, telefono, 'Casa 456').tipoDomicilio).toBe('casa')
  } finally { globalThis.fetch = fetchOriginal }
})

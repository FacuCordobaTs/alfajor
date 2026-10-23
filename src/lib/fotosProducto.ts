/** Fotos de un producto en orden: la portada (`imagenUrl`) y después la galería opcional
 *  (`imagenesExtra`). Sin repetidas; vacío si el producto no tiene foto. */
export function fotosDeProducto(producto: { imagenUrl?: string | null; imagenesExtra?: string[] | null } | null | undefined): string[] {
    if (!producto) return []
    const extras = Array.isArray(producto.imagenesExtra) ? producto.imagenesExtra : []
    return [...new Set([producto.imagenUrl, ...extras].filter((url): url is string => typeof url === 'string' && url.length > 0))]
}

export interface ProductoColor {
  id: string;
  nombre: string;
  hex: string;
}

export interface ProductoRopa {
  id: string;
  nombre: string;
  subtitulo: string;
  categoria: 'todos' | 'hoodies' | 'remeras' | 'camperas' | 'pantalones' | 'accesorios';
  precio: number;
  precioAnterior?: number;
  descripcion: string;
  composicion: string;
  fit: string;
  calificacion: number;
  tag?: string;
  esNuevo?: boolean;
  esDestacado?: boolean;
  imagenes: string[];
  talles: string[];
  colores: ProductoColor[];
}

export interface ItemCarritoRopa {
  producto: ProductoRopa;
  talle: string;
  color: ProductoColor;
  cantidad: number;
  imagenSeleccionada: string;
}

export const CATEGORIAS_ROPA = [
  { id: 'todos', nombre: 'Todos', icono: 'Sparkles' },
  { id: 'hoodies', nombre: 'Hoodies', icono: 'Shirt' },
  { id: 'camperas', nombre: 'Camperas', icono: 'Layers' },
  { id: 'remeras', nombre: 'Remeras', icono: 'Disc' },
  { id: 'pantalones', nombre: 'Pantalones', icono: 'Compass' },
  { id: 'accesorios', nombre: 'Accesorios', icono: 'ShoppingBag' },
] as const;

export const PRODUCTOS_ROPA: ProductoRopa[] = [
  {
    id: 'alf-01',
    nombre: 'Pitti Block Overshirt',
    subtitulo: 'Chaqueta leñadora en paño premium de lana',
    categoria: 'camperas',
    precio: 89900,
    precioAnterior: 115000,
    descripcion: 'Inspirada en el corte boxy streetwear europeo. Confeccionada con mezcla de lana pesada, botones personalizados y forro interno satinado para confort térmico superior.',
    composicion: '80% Lana Regenerada, 20% Poliamida',
    fit: 'Boxy Oversized',
    calificacion: 4.9,
    tag: 'Drop Exclusivo',
    esNuevo: true,
    esDestacado: true,
    imagenes: [
      '/ropa1.jpeg',
      '/ropa9.jpeg',
    ],
    talles: ['S', 'M', 'L', 'XL'],
    colores: [
      { id: 'c1', nombre: 'Azul Check Royal', hex: '#2563eb' },
      { id: 'c2', nombre: 'Naranja Alfajor', hex: '#f97316' },
      { id: 'c3', nombre: 'Carbón Mate', hex: '#1c1917' },
    ],
  },
  {
    id: 'alf-02',
    nombre: 'Sunset Essential Hoodie',
    subtitulo: 'Buzo con capucha 450 GSM de algodón frisa peinada',
    categoria: 'hoodies',
    precio: 74500,
    precioAnterior: 88000,
    descripcion: 'Construcción ultra densa con caída rígida y capucha doble capa que no pierde forma. Bordado tonal sutil Alfajor Studio en el pecho.',
    composicion: '100% Algodón Pesado 450 GSM',
    fit: 'Relaxed Drop-Shoulder',
    calificacion: 4.8,
    tag: 'Más Vendido',
    esNuevo: true,
    esDestacado: true,
    imagenes: [
      '/ropa2.jpeg',
      '/ropa10.jpeg',
    ],
    talles: ['XS', 'S', 'M', 'L', 'XL'],
    colores: [
      { id: 'c1', nombre: 'Naranja Calma', hex: '#ea580c' },
      { id: 'c2', nombre: 'Crema Hueso', hex: '#f5f5f0' },
      { id: 'c3', nombre: 'Azul Cielo', hex: '#7dd3fc' },
    ],
  },
  {
    id: 'alf-03',
    nombre: 'Tactical Flight Crop Jacket',
    subtitulo: 'Campera corta técnica con bolsillos tridimensionales',
    categoria: 'camperas',
    precio: 98000,
    descripcion: 'Silueta cropped vanguardista con tejido antidesgarro ripstop impermeable y cierres sellados termosoldados. Tiradores elásticos regulables.',
    composicion: '100% Nylon Ripstop Hidrófugo',
    fit: 'Cropped Boxy',
    calificacion: 4.9,
    tag: 'Iconic Piece',
    esNuevo: true,
    imagenes: [
      '/ropa3.jpeg',
      '/ropa9.jpeg',
    ],
    talles: ['S', 'M', 'L'],
    colores: [
      { id: 'c1', nombre: 'Verde Pino Técnico', hex: '#2d3b36' },
      { id: 'c2', nombre: 'Negro Asfalto', hex: '#0a0a0a' },
      { id: 'c3', nombre: 'Arena Desierto', hex: '#d6c7b2' },
    ],
  },
  {
    id: 'alf-04',
    nombre: 'Raw Edge Heavy Boxy Tee',
    subtitulo: 'Remera peso pesado 280g con cuello cerrado acanalado',
    categoria: 'remeras',
    precio: 38900,
    precioAnterior: 45000,
    descripcion: 'Hecha para durar años. Hombros caídos con costuras reforzadas de 3 agujas y tratamiento de lavado vintage para textura suave al tacto.',
    composicion: '100% Algodón Pima Peruano 280g',
    fit: 'Heavy Boxy',
    calificacion: 4.7,
    imagenes: [
      '/ropa4.jpeg',
      '/ropa10.jpeg',
    ],
    talles: ['S', 'M', 'L', 'XL', 'XXL'],
    colores: [
      { id: 'c1', nombre: 'Blanco Crudo', hex: '#fafaf9' },
      { id: 'c2', nombre: 'Carbón Faded', hex: '#262626' },
      { id: 'c3', nombre: 'Ocre Alfajor', hex: '#f97316' },
    ],
  },
  {
    id: 'alf-05',
    nombre: 'Wide Carpenter Relaxed Pants',
    subtitulo: 'Pantalón carpintero de tiro medio con caída ancha',
    categoria: 'pantalones',
    precio: 82000,
    descripcion: 'Pantalón amplio con presilla para herramientas, doble rodillera funcional y remaches metálicos con acabado gunmetal.',
    composicion: '100% Gabardina Pesada 12 Oz',
    fit: 'Wide Leg Skater',
    calificacion: 4.8,
    imagenes: [
      '/ropa5.jpeg',
      '/ropa9.jpeg',
    ],
    talles: ['38', '40', '42', '44', '46'],
    colores: [
      { id: 'c1', nombre: 'Denim Índigo Vintage', hex: '#3b82f6' },
      { id: 'c2', nombre: 'Negro Encerado', hex: '#171717' },
      { id: 'c3', nombre: 'Crudo Natural', hex: '#f5f5f4' },
    ],
  },
  {
    id: 'alf-06',
    nombre: 'Studio Unstructured 6-Panel Cap',
    subtitulo: 'Gorra desestructurada con cierre de hebilla metálica',
    categoria: 'accesorios',
    precio: 29500,
    descripcion: 'Gorra clásica en sarga de algodón lavado. Visera precurvada suave y bordado frontal en bajo relieve.',
    composicion: '100% Twill de Algodón Lavado',
    fit: 'Ajustable Unstructured',
    calificacion: 4.9,
    tag: 'Hot Item',
    imagenes: [
      '/ropa6.jpeg',
      '/ropa10.jpeg',
    ],
    talles: ['Único'],
    colores: [
      { id: 'c1', nombre: 'Naranja Cítrico', hex: '#f97316' },
      { id: 'c2', nombre: 'Gris Grafito', hex: '#4b5563' },
      { id: 'c3', nombre: 'Azul Marino', hex: '#1e3a8a' },
    ],
  },
  {
    id: 'alf-07',
    nombre: 'Thermal Ochre Puffer Vest',
    subtitulo: 'Chaleco acolchado con relleno térmico ultra liviano',
    categoria: 'camperas',
    precio: 86000,
    precioAnterior: 99000,
    descripcion: 'Capa intermedia perfecta para layering. Cuello alto protector, bolsillos laterales con polar térmico interior y tancas en cintura.',
    composicion: 'Micro-Ripstop 100% Poliéster Eco-Down',
    fit: 'Puffy Layering Fit',
    calificacion: 4.8,
    imagenes: [
      '/ropa7.jpeg',
      '/ropa9.jpeg',
    ],
    talles: ['S', 'M', 'L', 'XL'],
    colores: [
      { id: 'c1', nombre: 'Ocre Terracota', hex: '#c2410c' },
      { id: 'c2', nombre: 'Negro Mate', hex: '#111827' },
    ],
  },
  {
    id: 'alf-08',
    nombre: 'Heavy Duty Studio Tote',
    subtitulo: 'Bolso tote en lona encerada de 16 Oz con bolsillo interno',
    categoria: 'accesorios',
    precio: 34000,
    descripcion: 'Capacidad para laptop de 16", botella térmica y cuadernos. Manijas reforzadas con costuras en cruz y botón magnético de cierre.',
    composicion: 'Lona Encerada 100% Algodón',
    fit: 'Capacidad 22 Litros',
    calificacion: 4.9,
    imagenes: [
      '/ropa8.jpeg',
      '/ropa10.jpeg',
    ],
    talles: ['Único'],
    colores: [
      { id: 'c1', nombre: 'Arena Natural', hex: '#e7e5e4' },
      { id: 'c2', nombre: 'Negro Profundo', hex: '#0f172a' },
    ],
  },
];

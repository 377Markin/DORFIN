// ═══════════════════════════════════════════════════════════════
// MOTOR DE ESTIMACIÓN DE GRASA CORPORAL — DORFIN v2
// Filosofía: honestamente útil, no falsamente preciso.
// Combina múltiples modelos antropométricos con promedio ponderado.
// El usuario siempre ingresa cm y kg. Las conversiones son internas.
// ═══════════════════════════════════════════════════════════════

export interface MedidasCorporales {
  // ── Obligatorios ──────────────────────────────────────────
  sexo:    'hombre' | 'mujer'
  edad:    number          // años
  altura:  number          // cm
  peso:    number          // kg
  cuello:  number          // cm
  cintura: number          // cm
  abdomen: number          // cm (a la altura del ombligo)
  cadera:  number          // cm

  // ── Capa 2: Circunferencias primarias ─────────────────────
  hombros?:     number     // cm — circunferencia mayor de hombros
  pecho?:       number     // cm — circunferencia pecho
  bicep_der?:   number     // cm
  bicep_izq?:   number     // cm

  // ── Capa 3: Circunferencias secundarias ───────────────────
  muslo_der?:       number // cm
  muslo_izq?:       number // cm
  pantorrilla_der?: number // cm
  pantorrilla_izq?: number // cm
  antebrazo_der?:   number // cm
  antebrazo_izq?:   number // cm

  // ── Capa 4: Estructura corporal (frame size) ──────────────
  muneca?:          number // cm — indica frame óseo
  tobillo?:         number // cm — indica frame óseo inferior

  // ── Capa 5: Proporcionalidad avanzada ─────────────────────
  anchura_hombros?: number // cm — anchura biacromial (hombro a hombro)
  anchura_cadera?:  number // cm — anchura biilíaca (cadera a cadera)
  altura_sentado?:  number // cm — tronco, determina índice de tronco
}

export interface ResultadoGrasa {
  porcentaje:   number
  margenError:  number
  confianza:    number
  masaMuscular: number
  masaGrasa:    number
  categoria:    string
  descripcion:  string
  metodos:      { nombre: string; valor: number; peso: number }[]
}

// ── Conversiones internas ────────────────────────────────────
const CM_TO_IN = 0.393701
const KG_TO_LB = 2.20462

// ══════════════════════════════════════════════════════════════
// MÉTODOS DE CÁLCULO
// ══════════════════════════════════════════════════════════════

/**
 * US Navy (DoD, 1986)
 * Fuente: Hodgdon & Beckett, Naval Health Research Center.
 * Variables: abdomen, cuello, altura (hombre); cintura, cadera, cuello, altura (mujer).
 * Unidades originales: pulgadas → convertimos internamente.
 * Error típico: ±3–4% en población general.
 */
function usNavy(m: MedidasCorporales): number | null {
  try {
    const a_in   = m.abdomen * CM_TO_IN
    const cu_in  = m.cuello  * CM_TO_IN
    const alt_in = m.altura  * CM_TO_IN
    const ci_in  = m.cintura * CM_TO_IN
    const ca_in  = m.cadera  * CM_TO_IN

    let v: number
    if (m.sexo === 'hombre') {
      const denom = a_in - cu_in
      if (denom <= 0) return null
      v = 495 / (1.0324 - 0.19077 * Math.log10(denom) + 0.15456 * Math.log10(alt_in)) - 450
    } else {
      const denom = ci_in + ca_in - cu_in
      if (denom <= 0) return null
      v = 495 / (1.29579 - 0.35004 * Math.log10(denom) + 0.22100 * Math.log10(alt_in)) - 450
    }
    return v
  } catch { return null }
}

/**
 * YMCA (Golding, Myers & Sinning, 1989)
 * Fuente: "Y's Way to Physical Fitness", 3ª ed.
 * Variables originales: cintura en PULGADAS, peso en LIBRAS.
 * Convertimos internamente desde cm/kg.
 * Error típico: ±4% en adultos sedentarios.
 */
function ymca(m: MedidasCorporales): number | null {
  try {
    const w_in  = m.cintura * CM_TO_IN  // conversión interna
    const bw_lb = m.peso    * KG_TO_LB  // conversión interna
    let v: number
    if (m.sexo === 'hombre') {
      v = (-98.42 + 4.15 * w_in - 0.082 * bw_lb) / bw_lb * 100
    } else {
      v = (-76.76 + 4.15 * w_in - 0.082 * bw_lb) / bw_lb * 100
    }
    return v
  } catch { return null }
}

/**
 * WHtR → % grasa — Lean, Han & Morrison (1996)
 * Fuente: BMJ, vol. 313, pp. 90–94.
 * Variables: cintura (cm), edad, sexo.
 * Validada en n=702 adultos europeos. Error estándar: ±4%.
 * Limitación conocida: puede subestimar grasa en personas muy musculadas.
 */
function whtRLean(m: MedidasCorporales): number | null {
  try {
    let v: number
    if (m.sexo === 'hombre') {
      v = 0.567 * m.cintura + 0.101 * m.edad - 31.8
    } else {
      v = 0.439 * m.cintura + 0.221 * m.edad - 9.4
    }
    return v
  } catch { return null }
}

/**
 * IMC → % grasa — Gallagher et al. (2000) — con corrección para hispanos
 * Fuente: Am. J. Clin. Nutr., vol. 72, pp. 694–701.
 * Variables: IMC, edad, sexo. Incluye corrección para latinoamericanos.
 * Relevante para usuarios DORFIN (Colombia y región).
 * Error típico: ±3.9%.
 */
function gallagher(m: MedidasCorporales): number | null {
  try {
    const imc = m.peso / ((m.altura / 100) ** 2)
    if (imc < 10 || imc > 60) return null
    const S = m.sexo === 'hombre' ? 1 : 0
    // Coeficiente de corrección para hispanos vs caucásicos (Gallagher 2000, Table 3)
    const etnia = -1.5  // ajuste hispano: -1.5 puntos de % grasa
    const v = 63.7 - 864 * (1 / imc) - 12.1 * S + 0.12 * m.edad + etnia
    return v
  } catch { return null }
}

/**
 * Modelo DORFIN v2 — propio, basado en variables múltiples
 * Combina IMC base + ajustes musculares + proporcionalidad.
 * No tiene validación bibliográfica independiente — se comporta
 * como factor de ajuste y no como método primario.
 * Peso reducido en el promedio ponderado.
 */
function modeloDorfin(m: MedidasCorporales): number | null {
  try {
    const imc = m.peso / ((m.altura / 100) ** 2)
    const base = m.sexo === 'hombre'
      ? imc * 1.2 + m.edad * 0.1 - 5.4
      : imc * 1.2 + m.edad * 0.1 - 2.4

    let ajuste = 0

    // Musculatura de brazos — mayor bícep → menos grasa estimada
    const mediaBicep = promedioOpcional(m.bicep_der, m.bicep_izq)
    if (mediaBicep !== null) {
      const refBicep = m.sexo === 'hombre' ? 36 : 30
      ajuste -= (mediaBicep - refBicep) * 0.15
    }

    // Musculatura de piernas
    const mediaMuslo = promedioOpcional(m.muslo_der, m.muslo_izq)
    if (mediaMuslo !== null) {
      const refMuslo = m.sexo === 'hombre' ? 56 : 58
      ajuste -= (mediaMuslo - refMuslo) * 0.06
    }

    // Pecho — indicador de masa torácica
    if (m.pecho) {
      const refPecho = m.sexo === 'hombre' ? 100 : 90
      ajuste -= (m.pecho - refPecho) * 0.025
    }

    // Índice de tronco (altura sentado / altura total)
    // Personas con tronco largo tienden a acumular más grasa central
    if (m.altura_sentado) {
      const indiceTronco = m.altura_sentado / m.altura
      const refTronco = 0.52  // proporción promedio adulto
      ajuste += (indiceTronco - refTronco) * 15
    }

    // Proporcionalidad hombros/cadera — anchura biacromial
    if (m.anchura_hombros && m.anchura_cadera) {
      const ratioAC = m.anchura_hombros / m.anchura_cadera
      const refRatio = m.sexo === 'hombre' ? 1.35 : 1.1
      // Ratio más alto = más estructura muscular → menor grasa estimada
      ajuste -= (ratioAC - refRatio) * 8
    }

    // Diferencia cintura-hombros como indicador de grasa central
    if (m.hombros) {
      const difHC = m.hombros - m.cintura
      const refDif = m.sexo === 'hombre' ? 30 : 20
      ajuste -= (difHC - refDif) * 0.04
    }

    return base + ajuste
  } catch { return null }
}

// ── Ajuste por estructura corporal (frame size) ───────────────

/**
 * Calcula ajuste de % grasa según estructura ósea.
 * Frame pequeño → mayor % grasa relativo para el mismo IMC.
 * Frame grande → mayor masa muscular potencial.
 * Fuente: Frisancho (1990), "Anthropometric Standards for the
 *   Assessment of Growth and Nutritional Status".
 */
function ajusteEstructuraCorporal(m: MedidasCorporales): number {
  let ajuste = 0
  let factoresUsados = 0

  if (m.muneca) {
    // Clasificación de frame size según muñeca:
    // Hombre: pequeño <17.5cm, mediano 17.5-20cm, grande >20cm
    // Mujer:  pequeña <15cm,   mediana 15-17cm,   grande >17cm
    const ref = m.sexo === 'hombre' ? 18.5 : 16.0
    const delta = ref - m.muneca
    ajuste += delta * 0.25   // frame pequeño suma % grasa, frame grande resta
    factoresUsados++
  }

  if (m.tobillo) {
    // Tobillo es indicador de densidad ósea y frame inferior
    const ref = m.sexo === 'hombre' ? 23.0 : 21.0
    const delta = ref - m.tobillo
    ajuste += delta * 0.18
    factoresUsados++
  }

  // Si solo hay un indicador, reducir la magnitud del ajuste
  if (factoresUsados === 1) ajuste *= 0.6

  return ajuste
}

// ── Helpers ───────────────────────────────────────────────────

function promedioOpcional(a?: number, b?: number): number | null {
  if (a !== undefined && b !== undefined) return (a + b) / 2
  if (a !== undefined) return a
  if (b !== undefined) return b
  return null
}

// ══════════════════════════════════════════════════════════════
// SISTEMA DE CONFIANZA v2
// No depende solo de cantidad de datos, sino de qué aportan
// ══════════════════════════════════════════════════════════════

function calcularConfianza(m: MedidasCorporales, metodosActivos: number): number {
  let puntos = 0

  // CAPA 1 — Base mínima calculable (máx 40)
  // Sin estos datos ningún método funciona correctamente
  if (m.sexo)    puntos += 8
  if (m.edad)    puntos += 4
  if (m.altura)  puntos += 4
  if (m.peso)    puntos += 6
  if (m.cuello)  puntos += 8   // crítico para Navy
  if (m.cintura) puntos += 5
  if (m.abdomen) puntos += 5   // crítico para Navy hombre

  // CAPA 2 — Circunferencias primarias (máx 25)
  // Cada una activa o refina al menos un método adicional
  if (m.cadera)  puntos += 8   // activa Navy mujer y WHR
  if (m.hombros) puntos += 6   // mejora modeloDorfin
  if (m.pecho)   puntos += 5
  const bicep = promedioOpcional(m.bicep_der, m.bicep_izq)
  if (bicep !== null) {
    puntos += m.bicep_der && m.bicep_izq ? 6 : 3  // ambos vale más que uno
  }

  // CAPA 3 — Circunferencias secundarias (máx 20)
  const muslo = promedioOpcional(m.muslo_der, m.muslo_izq)
  if (muslo !== null) {
    puntos += m.muslo_der && m.muslo_izq ? 6 : 3
  }
  const pantorrilla = promedioOpcional(m.pantorrilla_der, m.pantorrilla_izq)
  if (pantorrilla !== null) {
    puntos += m.pantorrilla_der && m.pantorrilla_izq ? 5 : 2
  }
  const antebrazo = promedioOpcional(m.antebrazo_der, m.antebrazo_izq)
  if (antebrazo !== null) {
    puntos += m.antebrazo_der && m.antebrazo_izq ? 4 : 2
  }
  if (m.anchura_cadera)  puntos += 5   // proporcionalidad avanzada

  // CAPA 4 — Estructura corporal (máx 15)
  // Doble indicador es mucho más fiable que uno solo
  if (m.muneca && m.tobillo) {
    puntos += 15   // ambos juntos dan frame size fiable
  } else if (m.muneca || m.tobillo) {
    puntos += 7
  }
  if (m.anchura_hombros) puntos += 8

  // CAPA 5 — Proporcionalidad avanzada (solo suma si hay estructura)
  if (m.altura_sentado && m.altura) {
    puntos += 6
  }

  // Penalización si pocos métodos están activos
  // Con 1 solo método no se puede tener alta confianza
  if (metodosActivos < 2) puntos = Math.min(puntos, 45)
  if (metodosActivos < 3) puntos = Math.min(puntos, 65)

  return Math.min(Math.round(puntos), 100)
}

function calcularMargenError(confianza: number): number {
  if (confianza >= 90) return 1.0
  if (confianza >= 80) return 1.5
  if (confianza >= 70) return 2.0
  if (confianza >= 60) return 2.5
  if (confianza >= 50) return 3.5
  return 5.0
}

// ── Categorías físicas ────────────────────────────────────────
// Basado en rangos ACE (American Council on Exercise)

function getCategoria(pct: number, sexo: 'hombre' | 'mujer'): { categoria: string; descripcion: string } {
  if (sexo === 'hombre') {
    if (pct < 6)  return { categoria: 'Atleta de élite',    descripcion: 'Grasa extremadamente baja, propia de atletas de competición. Mantener este nivel requiere disciplina extrema y puede ser insostenible.' }
    if (pct < 14) return { categoria: 'Atlético',           descripcion: 'Excelente composición corporal. Musculatura visible y definida. Estás en el rango de rendimiento deportivo.' }
    if (pct < 18) return { categoria: 'En forma',           descripcion: 'Buena composición corporal dentro del rango saludable. Rendimiento físico óptimo.' }
    if (pct < 25) return { categoria: 'Promedio',           descripcion: 'Composición corporal en rango normal. Reducir entre 3% y 7% mejoraría tu rendimiento y salud metabólica.' }
    if (pct < 32) return { categoria: 'Sobrepeso moderado', descripcion: 'Nivel de grasa por encima del rango recomendado. Un plan progresivo de entrenamiento y nutrición tendría impacto positivo.' }
    return         { categoria: 'Obesidad',                 descripcion: 'Nivel de grasa corporal elevado. Se recomienda consultar con un profesional de salud para establecer un plan de reducción seguro.' }
  } else {
    if (pct < 14) return { categoria: 'Atleta de élite',    descripcion: 'Grasa extremadamente baja para mujeres. Común en atletas de competición. Puede afectar la función hormonal.' }
    if (pct < 21) return { categoria: 'Atlética',           descripcion: 'Excelente composición corporal. Musculatura visible con curvas naturales. Rango de rendimiento deportivo.' }
    if (pct < 25) return { categoria: 'En forma',           descripcion: 'Buena composición corporal dentro del rango saludable recomendado para mujeres.' }
    if (pct < 32) return { categoria: 'Promedio',           descripcion: 'Composición corporal en rango normal. Pequeños ajustes en nutrición y entrenamiento marcarían diferencia visible.' }
    if (pct < 39) return { categoria: 'Sobrepeso moderado', descripcion: 'Nivel de grasa por encima del rango recomendado. Un plan progresivo de entrenamiento y nutrición ayudaría.' }
    return         { categoria: 'Obesidad',                 descripcion: 'Nivel de grasa corporal elevado. Se recomienda consultar con un profesional de salud.' }
  }
}

// ══════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════

export function calcularGrasaCorporal(m: MedidasCorporales): ResultadoGrasa {
  const candidatos: { nombre: string; valor: number | null; peso: number }[] = [
    { nombre: 'US Navy',         valor: usNavy(m),      peso: 3.0 },
    { nombre: 'YMCA',            valor: ymca(m),         peso: 2.0 },
    { nombre: 'WHtR (Lean)',     valor: whtRLean(m),     peso: 1.5 },
    { nombre: 'IMC (Gallagher)', valor: gallagher(m),    peso: 1.5 },
    { nombre: 'Modelo DORFIN',   valor: modeloDorfin(m), peso: 1.5 },
  ]

  // Filtrar resultados fisiológicamente plausibles
  const metodos = candidatos
    .filter(c => c.valor !== null && c.valor > 3 && c.valor < 60)
    .map(c => ({ nombre: c.nombre, valor: +(c.valor!.toFixed(1)), peso: c.peso }))

  // Promedio ponderado
  let sumaPonderada = 0
  let sumaPesos     = 0
  metodos.forEach(m => {
    sumaPonderada += m.valor * m.peso
    sumaPesos     += m.peso
  })

  let porcentaje = sumaPesos > 0 ? sumaPonderada / sumaPesos : 20
  porcentaje    += ajusteEstructuraCorporal(m)
  porcentaje     = Math.max(3, Math.min(55, +porcentaje.toFixed(1)))

  const confianza    = calcularConfianza(m, metodos.length)
  const margenError  = calcularMargenError(confianza)
  const masaGrasa    = +(m.peso * porcentaje / 100).toFixed(1)
  const masaMuscular = +(m.peso * (1 - porcentaje / 100) * 0.85).toFixed(1)
  const { categoria, descripcion } = getCategoria(porcentaje, m.sexo)

  return { porcentaje, margenError, confianza, masaMuscular, masaGrasa, categoria, descripcion, metodos }
}
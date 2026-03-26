export interface TaskTemplateStep {
  title: string;
  description: string | null;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: TaskTemplateStep[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'compressor-monthly',
    name: 'Revisión mensual de compresor',
    description: 'Inspección y mantenimiento mensual de compresores de aire',
    icon: 'air',
    steps: [
      { title: 'Verificar nivel de aceite', description: 'Comprobar que el nivel esté entre MIN y MAX' },
      { title: 'Inspeccionar correas y poleas', description: 'Revisar tensión y desgaste de correas' },
      { title: 'Limpiar filtro de aire', description: 'Retirar, limpiar o reemplazar el elemento filtrante' },
      { title: 'Revisar válvulas de seguridad', description: 'Probar funcionamiento de válvulas de alivio de presión' },
      { title: 'Verificar presión de trabajo', description: 'Confirmar que opera dentro del rango establecido' },
      { title: 'Drenar condensado del depósito', description: 'Abrir válvula de drenaje y eliminar agua acumulada' },
    ],
  },
  {
    id: 'hydraulic-pump',
    name: 'Mantenimiento de bomba hidráulica',
    description: 'Revisión preventiva del sistema hidráulico',
    icon: 'water',
    steps: [
      { title: 'Verificar nivel de fluido hidráulico', description: null },
      { title: 'Inspeccionar mangueras y conexiones', description: 'Buscar fugas, grietas o desgaste visible' },
      { title: 'Revisar filtros hidráulicos', description: 'Reemplazar si supera las horas de uso recomendadas' },
      { title: 'Medir temperatura de operación', description: 'No debe superar 60 °C en operación normal' },
      { title: 'Verificar sellos y empaquetaduras', description: 'Buscar indicios de fuga alrededor de los sellos' },
      { title: 'Comprobar presión del sistema', description: 'Registrar presión en vacío y bajo carga' },
    ],
  },
  {
    id: 'electric-motor',
    name: 'Inspección de motor eléctrico',
    description: 'Revisión preventiva de motores eléctricos industriales',
    icon: 'bolt',
    steps: [
      { title: 'Medir corriente de operación', description: 'Comparar con los valores de placa de características' },
      { title: 'Verificar temperatura del devanado', description: 'Usar termómetro infrarrojo en carcasa y bobinas' },
      { title: 'Lubricar rodamientos', description: 'Aplicar grasa según especificación del fabricante' },
      { title: 'Revisar conexiones eléctricas', description: 'Apretar bornes y verificar estado del aislamiento' },
      { title: 'Limpiar ventilación y rejillas', description: 'Eliminar polvo y obstrucciones del sistema de enfriamiento' },
      { title: 'Verificar nivel de vibración', description: 'Comparar con valores de referencia de la línea base' },
    ],
  },
  {
    id: 'generator',
    name: 'Revisión de generador',
    description: 'Mantenimiento preventivo de generadores eléctricos',
    icon: 'electric_bolt',
    steps: [
      { title: 'Verificar nivel de combustible', description: null },
      { title: 'Revisar nivel de aceite del motor', description: null },
      { title: 'Inspeccionar batería de arranque', description: 'Verificar carga y limpiar terminales con corrosión' },
      { title: 'Probar arranque automático', description: 'Simular corte de red y verificar tiempo de respuesta' },
      { title: 'Revisar sistema de refrigeración', description: 'Nivel de refrigerante y condición de mangueras del radiador' },
      { title: 'Verificar transferencia de carga', description: 'Comprobar funcionamiento del interruptor de transferencia automática' },
      { title: 'Registrar horas de operación', description: 'Actualizar bitácora con horas acumuladas' },
    ],
  },
  {
    id: 'safety-inspection',
    name: 'Inspección de seguridad general',
    description: 'Revisión de condiciones de seguridad operativa del área',
    icon: 'security',
    steps: [
      { title: 'Verificar señalización de seguridad', description: 'Confirmar que las señales son visibles y están en buen estado' },
      { title: 'Revisar extintores', description: 'Verificar carga, fecha de vencimiento y accesibilidad' },
      { title: 'Inspeccionar guardas de protección', description: 'Confirmar que están instaladas correctamente en partes móviles' },
      { title: 'Probar paradas de emergencia', description: 'Verificar funcionamiento de botones de paro de emergencia' },
      { title: 'Verificar iluminación del área', description: 'Asegurar iluminación adecuada en zonas de trabajo y pasillos' },
    ],
  },
  {
    id: 'conveyor-belt',
    name: 'Mantenimiento de banda transportadora',
    description: 'Inspección preventiva de sistemas de transporte por banda',
    icon: 'linear_scale',
    steps: [
      { title: 'Verificar alineación de la banda', description: 'Ajustar si se detecta desviación lateral durante operación' },
      { title: 'Revisar tensión de la banda', description: 'Ajustar tensores según especificaciones del fabricante' },
      { title: 'Lubricar rodillos y rodamientos', description: null },
      { title: 'Inspeccionar raspadores y guías', description: 'Revisar desgaste y ajuste de raspadores de limpieza' },
      { title: 'Verificar accionamiento y reductor', description: 'Nivel de aceite en reductor y estado del acoplamiento' },
      { title: 'Revisar estructura y soportes', description: 'Buscar fisuras, tornillos flojos o deformaciones en la estructura' },
    ],
  },
];

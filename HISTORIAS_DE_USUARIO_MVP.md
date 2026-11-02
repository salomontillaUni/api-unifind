# Especificación de Historias de Usuario — MVP Unifind (Sin Auth)

**Proyecto:** Unifind (Red de Contacto y Objetos Perdidos)  
**Materia:** Desarrollo Móvil — Semestre 6  
**Institución:** Corporación Universitaria Autónoma del Cauca (Popayán)  
**Alcance:** Producto Mínimo Viable (MVP) Funcional  
**Premisa del MVP:** La aplicación prescinde temporalmente del flujo de autenticación/login; el usuario ingresa de forma directa al Feed principal como miembro de la comunidad universitaria.

---

## 1. Matriz de Historias de Usuario del MVP

| ID | Épica | Historia de Usuario | Prioridad MoSCoW | Vista XML | Controlador Kotlin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HU-01** | Exploración | Visualización del catálogo de objetos en campus | **Must Have** | `activity_main.xml` | `MainActivity.kt` |
| **HU-02** | Búsqueda | Filtrado dinámico por estado (Perdido/Encontrado) y categoría | **Must Have** | `activity_main.xml` | `MainActivity.kt` |
| **HU-03** | Publicación | Publicación de reporte de objeto (Wizard paso a paso) | **Must Have** | `activity_report.xml` | `ReportActivity.kt` |
| **HU-04** | Seguridad | Configuración de mecanismo anti-fraude (Filtro El Grifo) | **Must Have** | `activity_report.xml` | `ReportActivity.kt` |
| **HU-05** | Validación | Validación de pertenencia mediante pregunta de seguridad | **Must Have** | `activity_detail.xml` | `DetailActivity.kt` |
| **HU-06** | Coordinación| Coordinación de cita en Punto Seguro de Campus | **Should Have** | `activity_chat.xml` | `ChatActivity.kt` |
| **HU-07** | Gamificación | Confirmación de devolución y adjudicación de Puntos de Honor | **Should Have** | `bottom_sheet_rating.xml` | `RatingBottomSheetDialog.kt` |

---

## 2. Detalle y Criterios de Aceptación (Formato Gherkin)

### HU-01: Visualización del catálogo de objetos en campus
* **Como** estudiante de la Uniautónoma del Cauca,  
* **Quiero** explorar un feed con las pertenencias extraviadas y encontradas en los diferentes bloques del campus,  
* **Para** saber si alguien encontró un objeto mío o si un elemento que hallé ya fue reportado.

**Criterios de Aceptación:**
* **Escenario 1 (Listado estructurado):**
  * **Dado que** ingreso a la pantalla principal (`MainActivity`),
  * **Cuando** carga la interfaz,
  * **Entonces** visualizo tarjetas organizadas con imagen/icono, título del objeto, ubicación (ej. *Bloque A · Lab 201*), tiempo de publicación y badge de estado.
* **Escenario 2 (Diferenciación de badges):**
  * **Dado que** observo las publicaciones,
  * **Cuando** una publicación es de tipo *Encontrado*,
  * **Entonces** la etiqueta es amarilla con botón "Verificar Propiedad"; si es *Perdido*, la etiqueta es azul con botón "Lo he visto".

---

### HU-02: Filtrado dinámico por estado y categoría
* **Como** usuario que busca una pertenencia en específico,  
* **Quiero** alternar entre objetos perdidos/encontrados y filtrar por categorías temáticas o palabras clave,  
* **Para** encontrar rápidamente el reporte que me interesa sin recorrer todo el catálogo.

**Criterios de Aceptación:**
* **Escenario 1 (Toggle de estado):**
  * **Dado que** estoy en el Feed,
  * **Cuando** pulso el botón "Perdidos (14)" o "Encontrados (28)",
  * **Entonces** la lista actualiza los resultados mostrando únicamente las tarjetas del estado seleccionado.
* **Escenario 2 (Chips de categoría):**
  * **Dado que** selecciono un chip (ej. *Electrónica*, *Documentos*, *Ropa*),
  * **Cuando** se aplica el filtro,
  * **Entonces** se muestran únicamente los objetos clasificados bajo esa categoría institucional.
* **Escenario 3 (Buscador por texto):**
  * **Dado que** escribo "calculadora" en el campo de búsqueda,
  * **Cuando** presiono enter,
  * **Entonces** la vista muestra las publicaciones cuyo título o descripción coincidan con el término.

---

### HU-03: Publicación de reporte de objeto (Wizard)
* **Como** estudiante que halló o extravió una pertenencia en el campus,  
* **Quiero** diligenciar un formulario estructurado con datos, atributos y ubicación física,  
* **Para** registrar el reporte formalmente en la comunidad universitaria.

**Criterios de Aceptación:**
* **Escenario 1 (Acceso al formulario):**
  * **Dado que** estoy en el Feed,
  * **Cuando** toco el botón flotante "+ Reportar Objeto" (`fabReportItem`),
  * **Entonces** se abre la pantalla `ReportActivity` con la barra de progreso de pasos.
* **Escenario 2 (Selector de situación):**
  * **Dado que** inicio el reporte,
  * **Cuando** elijo "Encontré un Objeto" o "Perdí un Objeto",
  * **Entonces** el botón activo se resalta y adapta el mensaje informativo de custodia.
* **Escenario 3 (Validación de campos obligatorios):**
  * **Dado que** intento publicar sin ingresar el título descriptivo del objeto,
  * **Cuando** pulso "Publicar en la Comunidad Uniautónoma",
  * **Entonces** el sistema resalta el error visual impidiendo el avance.

---

### HU-04: Configuración de mecanismo anti-fraude (Filtro El Grifo)
* **Como** persona que encontró un objeto de valor,  
* **Quiero** definir una pregunta de seguridad y registrar su respuesta confidencial,  
* **Para** prevenir reclamos fraudulentos de personas que no sean los dueños legítimos.

**Criterios de Aceptación:**
* **Escenario 1 (Ingreso de pregunta y respuesta confidencial):**
  * **Dado que** llego al paso 5 del formulario de reporte,
  * **Cuando** redacto una pregunta clave (ej. *"¿Qué iniciales están grabadas en el reverso?"*) y su respuesta correcta,
  * **Entonces** el sistema guarda la respuesta de forma privada para contrastar reclamos posteriores.
* **Escenario 2 (Confidencialidad):**
  * **Dado que** el reporte se publica en el feed,
  * **Cuando** cualquier usuario revisa la publicación,
  * **Entonces** la respuesta secreta jamás es visible públicamente.

---

### HU-05: Validación de pertenencia mediante pregunta de seguridad
* **Como** dueño que identifica su objeto extraviado en el catálogo,  
* **Quiero** contestar la pregunta de comprobación desde la pantalla de detalle,  
* **Para** demostrar mi propiedad legítima y desbloquear el canal seguro de entrega.

**Criterios de Aceptación:**
* **Escenario 1 (Consulta de ficha técnica):**
  * **Dado que** toco una tarjeta de objeto encontrado en el feed,
  * **Cuando** se abre `DetailActivity`,
  * **Entonces** veo la fotografía, el código de reporte (ej. *#UAC-8841*), el punto de custodia asignado (*Bienestar Universitario*) y los 6 atributos técnicos.
* **Escenario 2 (Envío de respuesta satisfactoria):**
  * **Dado que** leo la pregunta de seguridad formulada por el hallador,
  * **Cuando** digito mi respuesta y pulso "Verificar Propiedad y Abrir Chat",
  * **Entonces** se valida la coincidencia y se abre la conversación privada (`ChatActivity`).
* **Escenario 3 (Campo vacío):**
  * **Dado que** dejo el campo de verificación en blanco,
  * **Cuando** pulso el botón,
  * **Entonces** se muestra una alerta solicitando responder la pregunta.

---

### HU-06: Coordinación de cita en Punto Seguro de Campus
* **Como** estudiante que va a devolver o recibir una pertenencia,  
* **Quiero** coordinar los detalles en un chat privado con un Punto Seguro institucional predefinido,  
* **Para** pactar la entrega física en un lugar vigilado y seguro del campus.

**Criterios de Aceptación:**
* **Escenario 1 (Tarjeta de Punto Seguro Kime):**
  * **Dado que** ingreso a `ChatActivity`,
  * **Cuando** reviso la parte superior del chat,
  * **Entonces** observo la tarjeta con la ubicación institucional acordada (*Cafetería Bloque A / Bienestar*) y el botón "Confirmar Entrega de Objeto".
* **Escenario 2 (Intercambio de mensajes):**
  * **Dado que** redacto un mensaje en la barra inferior,
  * **Cuando** presiono el botón de enviar,
  * **Entonces** se añade a la conversación con fecha, hora y confirmación de lectura.

---

### HU-07: Confirmación de devolución y adjudicación de Puntos de Honor
* **Como** usuario que recuperó su objeto con éxito,  
* **Quiero** calificar al compañero con 5 estrellas, asignarle reconocimientos de camaradería y otorgarle Puntos de Honor,  
* **Para** incentivar la honestidad estudiantil y cerrar formalmente el reporte.

**Criterios de Aceptación:**
* **Escenario 1 (Apertura del modal):**
  * **Dado que** se realiza la entrega física,
  * **Cuando** toco "Confirmar Entrega de Objeto" en el chat o entro a la pestaña *Honor*,
  * **Entonces** se despliega el modal `RatingBottomSheetDialog`.
* **Escenario 2 (Adjudicación de Puntos de Honor):**
  * **Dado que** califico con estrellas y selecciono tags (*Puntual*, *Muy Honesto*),
  * **Cuando** pulso "Finalizar y Cerrar Reporte",
  * **Entonces** el sistema acredita **+100 Puntos de Honor** al hallador, actualiza el rango solidario y cierra el reporte.

---

## 3. Justificación para el Docente

1. **¿Por qué este MVP no requiere autenticación en esta etapa?**
   * El MVP se enfoca en validar el **flujo de valor central** de la aplicación: *reportar hallazgos, protegerlos contra fraudes y coordinar entregas seguras en campus*. La autenticación es un servicio transversal que puede conectarse posteriormente sin alterar la lógica de negocio ni las vistas ya maquetadas.
2. **Facilidad de Prueba y Calificación:**
   * Al no exigir login obligatorio en el emulador, el profesor puede evaluar inmediatamente cada una de las funcionalidades y pantallas sin necesidad de registrar cuentas ni crear tokens de sesión.

# Especificación de Historias de Usuario — MVP UniFind Móvil

**Proyecto:** UniFind (Red de Contacto, Custodia en Portería y Objetos Perdidos)  
**Institución:** Corporación Universitaria Autónoma del Cauca (Popayán)  
**Asignatura:** Desarrollo Móvil / Bases de Datos Avanzadas — Semestre 6  
**Alcance:** Producto Mínimo Viable (MVP) Funcional Sincronizado con la App Android  
**Premisas de Arquitectura:**
1. **Flujo A (Modo Exprés Portería - FOUND):** Publicación rápida para halladores que depositan objetos en las porterías del campus o los custodian personalmente, con reclamo formal mediante token de retiro o mediación por chat.
2. **Flujo B (Modo Detallado Dueño - LOST):** Publicación descriptiva de pertenencias extraviadas con señas particulares, facilitando que un tercero notifique su hallazgo dejándolo en portería o contactando al dueño.
3. **Flujo C (Servicios Transversales y Gamificación):** Login institucional transparente (`@uniautonoma.edu.co`), filtro de custodia en portería en el feed, chat seguro con Punto Seguro Kime, y asignación de +100 Puntos de Honor y badges de camaradería.

---

## 1. Matriz de Historias de Usuario del MVP

| ID | Épica / Flujo | Historia de Usuario | Prioridad MoSCoW | Vista XML | Controlador Kotlin | Endpoint Principal |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **HU-00** | Identidad | Login institucional y auto-registro transparente | **Must Have** | `activity_login.xml` | `LoginActivity.kt` | `POST /api/v1/auth/login` |
| **HU-01** | Exploración | Catálogo unificado con visualización de custodia en campus | **Must Have** | `activity_main.xml` | `MainActivity.kt` | `GET /api/v1/items` |
| **HU-02** | Búsqueda | Filtrado dinámico por estado, portería y categorías | **Must Have** | `activity_main.xml` | `MainActivity.kt` | `GET /api/v1/items?custodyType=PORTERIA` |
| **HU-03** | Flujo A (Hallazgo) | Publicación rápida en Modo Exprés Portería (`FOUND`) | **Must Have** | `activity_report.xml` | `ReportActivity.kt` | `POST /api/v1/items` (`FOUND`) |
| **HU-04** | Flujo B (Extravío) | Publicación detallada por el propietario (`LOST`) | **Must Have** | `activity_report.xml` | `ReportActivity.kt` | `POST /api/v1/items` (`LOST`) |
| **HU-05** | Flujo A (Reclamo) | Reclamo de objeto encontrado y generación de token de retiro | **Must Have** | `activity_detail.xml` | `DetailActivity.kt` | `POST /api/v1/items/:id/claim` |
| **HU-06** | Flujo B (Aviso) | Notificación de hallazgo y coordinación en Punto Seguro | **Should Have** | `activity_detail.xml`<br>`activity_chat.xml` | `DetailActivity.kt`<br>`ChatActivity.kt` | `POST /api/v1/items/:id/notify-found`<br>`POST /api/v1/chats/:id/messages` |
| **HU-07** | Gamificación | Cierre de entrega y adjudicación de +100 Puntos de Honor | **Should Have** | `bottom_sheet_rating.xml` | `RatingBottomSheetDialog.kt` | `PATCH /api/v1/items/:id/status`<br>`POST /api/v1/users/:id/rate` |
| **HU-08** | Perfil y Gamificación | Perfil integral, rango cívico, insignias y mis reportes | **Should Have** | `activity_profile.xml` | `ProfileActivity.kt` / `ProfileScreen.kt` | `GET /api/v1/users/:id/profile`<br>`PUT /api/v1/users/:id/profile`<br>`GET /api/v1/users/:id/items` |
| **HU-09** | Portería / Vigilancia | Validación y confirmación de entrega mediante Ticket Digital | **Should Have** | `activity_porteria.xml` | `PorteriaActivity.kt` / `PorteriaScreen.kt` | `GET /api/v1/items/tickets/:token`<br>`POST /api/v1/items/tickets/:token/confirm-delivery` |
| **HU-10** | DevOps / Cloud | Health Check y despliegue en la nube (Render / Docker) | **Must Have** | N/A (Backend / Cloud) | N/A (Infraestructura) | `GET /api/v1/health`<br>`Dockerfile` / `render.yaml` |
| **HU-11** | Sesión y Seguridad | Emisión y almacenamiento de Token de Sesión Institucional | **Could Have** | `activity_login.xml` | `SessionManager.kt` / `DataStore` | `POST /api/v1/auth/login` (`token`) |

---

## 2. Detalle y Criterios de Aceptación (Formato Gherkin)

---

### HU-00: Login Institucional y Auto-Registro Transparente

* **Como** estudiante o funcionario de la Uniautónoma del Cauca,  
* **Quiero** autenticarme en la aplicación ingresando mi correo institucional (`@uniautonoma.edu.co`) y mi código estudiantil,  
* **Para** acceder a la red de confianza de objetos perdidos sin contraseñas engorrosas y registrar mi perfil automáticamente si es mi primera vez.

#### Criterios de Aceptación:
```gherkin
Característica: Autenticación institucional en UniFind
  Como miembro de la comunidad universitaria
  Quiero iniciar sesión con mi correo institucional
  Para interactuar con la red de objetos perdidos

  Escenario: Inicio de sesión exitoso de usuario existente
    Dado que ingreso mi correo "carlos.munoz@uniautonoma.edu.co" en "activity_login.xml"
    Cuando pulso "Ingresar a UniFind"
    Entonces el sistema valida el dominio "@uniautonoma.edu.co"
    Y retorna código HTTP 200 OK con mis datos de reputación, código y puntos de honor
    Y la aplicación navega directamente a "MainActivity.kt"

  Escenario: Auto-registro transparente en primera sesión
    Dado que ingreso un correo institucional nuevo "nuevo.estudiante@uniautonoma.edu.co"
    Cuando pulso "Ingresar a UniFind"
    Entonces el backend crea automáticamente el perfil con 100 Puntos de Honor iniciales
    Y retorna código HTTP 200 OK autorizando el acceso inmediato

  Escenario: Rechazo de correo no institucional
    Dado que intento ingresar con un correo comercial "estudiante@gmail.com"
    Cuando pulso el botón de ingreso
    Entonces el sistema responde con código HTTP 400 Bad Request
    Y la app muestra un mensaje indicando que el correo debe ser "@uniautonoma.edu.co"
```

---

### HU-01: Catálogo Unificado con Visualización de Custodia en Campus

* **Como** usuario de la comunidad universitaria,  
* **Quiero** explorar un feed estructurado con tarjetas que muestren foto, título, zona del campus, tiempo relativo y distintivo de custodia (`PORTERIA` o `PERSONAL`),  
* **Para** identificar rápidamente si mi pertenencia ya fue entregada en portería o la tiene un compañero.

#### Criterios de Aceptación:
```gherkin
Característica: Exploración del feed principal
  Como estudiante en el campus
  Quiero visualizar el catálogo de pertenencias
  Para enterarme de hallazgos y pérdidas en tiempo real

  Escenario: Visualización estructurada de tarjetas
    Dado que me encuentro en la pantalla principal ("MainActivity.kt")
    Cuando carga el listado desde "GET /api/v1/items"
    Entonces cada tarjeta muestra la fotografía del objeto ("photoUrl"), el título, el código visible (ej. "#UAC-8841"), la ubicación ("Sede Principal · Edificio A"), el tiempo transcurrido (ej. "Hace 2 horas") y el tipo de custodia
    Y si el objeto está en portería, se resalta la insignia "En Portería" con indicación de entrega oficial
```

---

### HU-02: Filtrado Dinámico por Estado, Portería y Categorías

* **Como** estudiante que busca un artículo específico,  
* **Quiero** alternar entre objetos perdidos y encontrados, aplicar el filtro rápido de portería ("En Portería"), seleccionar chips de categoría o buscar por texto,  
* **Para** acotar los cientos de registros y encontrar mi pertenencia en segundos.

#### Criterios de Aceptación:
```gherkin
Característica: Filtrado dinámico y búsqueda
  Como usuario que busca su pertenencia
  Quiero aplicar filtros combinados
  Para localizar el reporte exacto

  Escenario: Filtro exclusivo de Portería
    Dado que me encuentro en el feed principal
    Cuando activo el chip "En Portería"
    Entonces la aplicación consume "GET /api/v1/items?custodyType=PORTERIA"
    Y la lista despliega únicamente los objetos resguardados físicamente en las porterías institucionales

  Escenario: Toggle entre Perdidos y Encontrados
    Dado que estoy explorando publicaciones
    Cuando toco la pestaña "Perdidos (LOST)"
    Entonces la lista se refresca con "GET /api/v1/items?type=lost"
    Y los botones de acción cambian a "Lo he visto / Notificar Hallazgo"

  Escenario: Búsqueda por palabra clave o código
    Dado que escribo "UAC-8841" o "calculadora" en el buscador
    Cuando presiono buscar
    Entonces el backend filtra por código exacto o índice de texto ponderado ("$text")
    Y muestra únicamente las coincidencias pertinentes
```

---

### HU-03: Flujo A — Publicación Rápida en Modo Exprés Portería (`FOUND`)

* **Como** estudiante o colaborador que encontró un objeto en el campus,  
* **Quiero** publicar un reporte exprés en menos de 1 minuto adjuntando una foto, título, categoría, zona del campus y marcando si lo dejé en la portería o lo llevo conmigo,  
* **Para** desentenderme del objeto dejándolo en manos oficiales o coordinar su entrega sin perder tiempo en formularios complejos.

#### Criterios de Aceptación:
```gherkin
Característica: Publicación exprés de objeto encontrado
  Como hallador de una pertenencia
  Quiero reportarla rápidamente con foto y custodia
  Para facilitar su restitución inmediata

  Escenario: Publicación con custodia en Portería
    Dado que encontré un termo Stanley en la cafetería
    Cuando diligencio el formulario con foto, categoría "clothing/accessories", zona "Edificio B" y elijo custodia "PORTERIA"
    Y presiono "Publicar Reporte Exprés"
    Entonces el sistema envía "POST /api/v1/items" con type="found" y custodyType="PORTERIA"
    Y el servidor responde 201 Created asignando un código único "#UAC-XXXX"
    Y el objeto queda visible en el feed con el badge oficial de Portería

  Escenario: Publicación con custodia Personal y filtro anti-fraude opcional
    Dado que hallé una calculadora y decido llevarla conmigo ("custodyType: PERSONAL")
    Cuando configuro una pregunta secreta ("¿Qué iniciales están grabadas?") y su respuesta confidencial
    Entonces el servidor almacena la respuesta de forma encriptada/privada
    Y jamás expone la respuesta en el catálogo público
```

---

### HU-04: Flujo B — Publicación Detallada por el Propietario (`LOST`)

* **Como** dueño que extravió una pertenencia valiosa en la universidad,  
* **Quiero** publicar un reporte descriptivo indicando señas particulares ("distinguishingMarks"), marca, color, zona aproximada donde lo olvidé y foto referencial opcional,  
* **Para** que la comunidad y el personal de vigilancia puedan reconocerlo fácilmente si lo encuentran.

#### Criterios de Aceptación:
```gherkin
Característica: Publicación de objeto extraviado por su dueño
  Como propietario de un objeto perdido
  Quiero ingresar señas particulares
  Para que quien lo encuentre sepa cómo identificarlo

  Escenario: Registro exitoso de objeto perdido
    Dado que perdí mi billetera con carnet institucional en la Cafetería Central
    Cuando diligencio el formulario seleccionando "Perdí un Objeto" (type="lost")
    E ingreso señas particulares "Billetera de cuero con sticker de Ingeniería y firma en el carnet"
    Y presiono "Publicar Búsqueda en Campus"
    Entonces el sistema envía "POST /api/v1/items" con type="lost" y custodyType=null
    Y el reporte se publica en el feed con el badge azul "Perdido" y botón "Notificar Hallazgo"
```

---

### HU-05: Flujo A — Reclamo de Objeto Encontrado y Generación de Token de Retiro

* **Como** dueño que reconoce su objeto encontrado en el feed,  
* **Quiero** enviar mi comprobación de propiedad desde la pantalla de detalle (`DetailActivity.kt`),  
* **Para** que si el objeto está en portería se me genere un **Token de Retiro físico** (`TICKET-XXXX-RET`), o si está bajo custodia personal se me habilite el chat directo con el custodio.

#### Criterios de Aceptación:
```gherkin
Característica: Reclamo de pertenencias encontradas
  Como dueño legítimo
  Quiero reclamar mi objeto
  Para retirarlo en portería o coordinar con quien lo tiene

  Escenario: Reclamo exitoso de objeto custodiado en Portería
    Dado que visualizo el detalle de un objeto con "custodyType: PORTERIA"
    Cuando digito mi prueba de propiedad en "ownershipProofText" y presiono "Reclamar Objeto"
    Entonces el sistema ejecuta "POST /api/v1/items/:id/claim"
    Y el servidor responde 200 OK con "claimApproved: true" y un "deliveryToken" (ej. "TICKET-7841-RET")
    Y la app muestra la pantalla de confirmación: "Presenta este ticket en la Portería Principal para retirar tu objeto"
    Y el estado del objeto transiciona automáticamente a "in_process"

  Escenario: Reclamo de objeto bajo custodia Personal
    Dado que el objeto encontrado es custodiado personalmente por un compañero ("custodyType: PERSONAL")
    Cuando envío mi comprobación de propiedad (y respondo la pregunta secreta si aplica)
    Entonces el servidor valida la respuesta, responde 200 OK con "claimApproved: true"
    Y abre inmediatamente el canal de chat seguro con el custodio ("ChatActivity.kt")
```

---

### HU-06: Flujo B — Notificación de Hallazgo y Coordinación en Punto Seguro Kime

* **Como** estudiante que encuentra un objeto que alguien reportó como perdido en el feed,  
* **Quiero** notificar al dueño indicando si lo dejé en la portería (`LEFT_AT_PORTERIA`) o si lo tengo conmigo (`HAVE_IT_WITH_ME`),  
* **Para** resolver la pérdida de mi compañero y pactar la entrega física en un Punto Seguro del Campus (Cafetería Bloque A / Bienestar).

#### Criterios de Aceptación:
```gherkin
Característica: Notificación de hallazgo de objeto perdido
  Como hallador solidario
  Quiero avisarle al dueño dónde está su objeto
  Para ayudarlo a recuperarlo sin demoras

  Escenario: Notificación de entrega en Portería
    Dado que veo una publicación de un cuaderno extraviado ("type: lost")
    Y decido entregarlo en la portería del Bloque B
    Cuando pulso "Notificar Hallazgo", elijo la acción "LEFT_AT_PORTERIA" e ingreso una nota
    Entonces el sistema envía "POST /api/v1/items/:id/notify-found" con action="LEFT_AT_PORTERIA"
    Y el objeto actualiza su custodia a "PORTERIA", pasando su estado a "in_process"
    Y el dueño recibe la notificación con la ubicación exacta para recogerlo

  Escenario: Notificación de custodia personal y apertura de chat
    Dado que elijo la acción "HAVE_IT_WITH_ME"
    Cuando envío la notificación
    Entonces el servidor actualiza el objeto a custodia "PERSONAL"
    Y crea automáticamente la conversación privada ("ChatActivity.kt") con la tarjeta de Punto Seguro Kime
    Y permite el intercambio de mensajes con actualización atómica de contadores de lectura
```

---

### HU-07: Cierre de Entrega y Adjudicación de +100 Puntos de Honor

* **Como** estudiante que recuperó satisfactoriamente su objeto,  
* **Quiero** marcar el caso como devuelto (`returned`), calificar la honestidad de mi compañero con 5 estrellas y seleccionarle reconocimientos cívicos (*Puntual*, *Muy Honesto*),  
* **Para** cerrar formalmente el reporte en el campus y otorgarle **+100 Puntos de Honor** en su perfil solidario.

#### Criterios de Aceptación:
```gherkin
Característica: Cierre de caso y gamificación de honor
  Como beneficiario de una devolución
  Quiero calificar a quien me ayudó
  Para incentivar la honradez y cultura cívica en la universidad

  Escenario: Cierre formal y adjudicación de puntos
    Dado que recibí mi objeto en la portería o de manos del custodio
    Cuando abro el modal "RatingBottomSheetDialog.kt"
    Y asigno 5 estrellas, selecciono los tags ["Puntual", "Muy Honesto"] y pulso "Finalizar y Cerrar Reporte"
    Entonces la aplicación invoca "PATCH /api/v1/items/:id/status" marcándolo como "returned"
    Y seguidamente consume "POST /api/v1/users/:id/rate" enviando la calificación
    Y el servidor acredita +100 Puntos de Honor al custodio, recalcula su promedio y suma sus badges
    Y la app despliega una confirmación visual de agradecimiento institucional
```

---

### HU-08: Perfil Integral, Rango Cívico, Insignias y Mis Reportes

* **Como** miembro activo de la comunidad universitaria,  
* **Quiero** ingresar a mi pantalla de perfil para visualizar mi saldo de Puntos de Honor, rango cívico (*Guardián Novato*, *Custodio Solidario*, *Héroe del Campus*), medallas acumuladas y gestionar mis objetos reportados,  
* **Para** conocer mi reputación solidaria y verificar qué pertenencias mías están activas o devueltas.

#### Criterios de Aceptación:
```gherkin
Característica: Gestión de perfil e historial de pertenencias
  Como usuario autenticado en UniFind
  Quiero consultar mi reputación y publicaciones
  Para monitorear el estado de mis objetos

  Escenario: Consulta exitosa de perfil e insignias
    Dado que me encuentro en la pantalla de perfil ("ProfileActivity.kt")
    Cuando carga la interfaz consumiendo "GET /api/v1/users/:id/profile"
    Entonces observo mis datos institucionales, avatar, saldo total de Puntos de Honor
    Y se visualiza mi rango cívico calculado según mi puntaje
    Y se despliegan las insignias ganadas (ej. ["Puntual", "Custodio Confiable"])
    Y observo el conteo total de reportes (Perdidos, Encontrados y Devueltos)

  Escenario: Actualización de datos de contacto
    Dado que deseo actualizar mi número de teléfono o avatar
    Cuando envío "PUT /api/v1/users/:id/profile" con los nuevos valores
    Entonces el backend actualiza los campos y responde 200 OK con los datos modificados

  Escenario: Listado de mis pertenencias reportadas
    Dado que pulso la pestaña "Mis Reportes"
    Cuando la vista invoca "GET /api/v1/users/:id/items?status=all"
    Entonces la lista muestra exclusivamente las tarjetas de objetos publicados por mí
```

---

### HU-09: Consola de Vigilancia — Validación y Despacho de Tickets en Portería

* **Como** personal de vigilancia o portería del campus,  
* **Quiero** consultar y validar un código de ticket digital de retiro (`deliveryToken`) presentado por un estudiante,  
* **Para** verificar físicamente que el objeto resguardado coincide con el reclamo aprobado y registrar la entrega oficial de forma transparente.

#### Criterios de Aceptación:
```gherkin
Característica: Validación y entrega de tickets en portería
  Como vigilante en la portería institucional
  Quiero validar el ticket digital presentado por un estudiante
  Para entregar la pertenencia física a la persona correcta

  Escenario: Validación exitosa de ticket digital en portería
    Dado que un estudiante presenta su código "TICKET-4091-RET" en la portería
    Cuando el vigilante consulta "GET /api/v1/items/tickets/TICKET-4091-RET"
    Entonces el sistema responde 200 OK con "isValid: true"
    Y muestra la fotografía del objeto, título, ubicación física y datos del reclamante verificado (nombre, código y teléfono)

  Escenario: Confirmación de entrega física por el vigilante
    Dado que el vigilante coteja el documento de identidad del estudiante
    Cuando pulso "Confirmar Entrega Física" enviando "POST /api/v1/items/tickets/:token/confirm-delivery"
    Entonces el backend actualiza el estado del objeto a "returned"
    Y marca el ticket como procesado ("isDelivered: true")
    Y registra la hora exacta y el nombre del vigilante que atendió la entrega

  Escenario: Rechazo de ticket ya utilizado
    Dado que se intenta canjear un ticket que ya fue entregado previamente
    Cuando se envía la confirmación de entrega
    Entonces el servidor responde 400 Bad Request indicando que el ticket ya fue procesado
```

---

### HU-10: Infraestructura y Health Check para Despliegue en la Nube

* **Como** equipo de desarrollo y docentes evaluadores,  
* **Queremos** contar con un endpoint de salud (`/health`) y contenedores Docker para desplegar la API REST en la nube (Render / Railway / VPS),  
* **Para** que la app móvil y la sustentación funcionen en vivo desde cualquier dispositivo físico y red WiFi sin depender de servidores locales.

#### Criterios de Aceptación:
```gherkin
Característica: Monitoreo y despliegue en la nube
  Como evaluador o desarrollador
  Quiero verificar el estado de salud de la API
  Para asegurar alta disponibilidad del backend

  Escenario: Verificación de estado de salud del servicio
    Dado que realizo una solicitud "GET /api/v1/health" o "GET /health"
    Cuando el servidor responde
    Entonces el código de respuesta es 200 OK
    Y el cuerpo JSON indica "status: healthy", tiempo activo ("uptimeSeconds") y estado de conexión a MongoDB ("connected")
```

---

### HU-11: Autenticación con Token de Sesión Institucional

* **Como** aplicación móvil Android,  
* **Quiero** recibir un token de sesión seguro (`token`) al iniciar sesión o auto-registrarme,  
* **Para** almacenar la sesión en `EncryptedSharedPreferences` / `DataStore` y mantener la sesión iniciada sin volver a pedir credenciales.

#### Criterios de Aceptación:
```gherkin
Característica: Persistencia de sesión segura en móvil
  Como cliente Android
  Quiero recibir y almacenar un token de sesión
  Para no solicitar credenciales repetidamente

  Escenario: Recepción de token al iniciar sesión
    Dado que inicio sesión con mi correo institucional en "POST /api/v1/auth/login"
    Cuando la respuesta es exitosa
    Entonces el payload incluye el campo "token" con un identificador de sesión seguro
    Y la aplicación almacena este token para restaurar la sesión automáticamente
```

---

## 3. Justificación Pedagógica y de Diseño

1. **¿Por qué bifurcar en Flujo A (Exprés Portería) y Flujo B (Detallado Dueño)?**
   * En el entorno universitario real, quien **encuentra** algo necesita salir rápido del apuro (tomar una foto y dejarlo en portería en 30 segundos). Quien **pierde** algo necesita dar detalles minuciosos (marcas, calcomanías, contenido) para que no se lo entreguen a otra persona. Adaptar la API a esta realidad elimina la fricción del usuario.
2. **Rol Central de la Portería Institucional:**
   * La portería es el punto neurálgico de custodia física en la Uniautónoma. La generación automática de `deliveryToken` digitaliza el protocolo de retiro físico, permitiendo a los vigilantes cotejar el ticket antes de entregar el artículo.
3. **Mantenimiento del Modo "Sin Auth" y Auto-Login:**
   * El endpoint `POST /api/v1/auth/login` valida la pertenencia institucional pero permite el auto-registro transparente sin contraseñas, permitiendo calificar de forma ágil todas las vistas en el emulador de Android Studio.

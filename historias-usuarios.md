# UniFind — Especificación de Historias de Usuario (HU)

**Corporación Universitaria Autónoma del Cauca**  
**Facultad de Ingeniería — Programa de Ingeniería de Sistemas**  
**Asignatura:** Bases de Datos Avanzadas  
**Docente:** Diego Prado (`diego.prado.o@uniautonoma.edu.co`)  
**Proyecto:** UniFind — Sistema Universitario de Objetos Perdidos y Red de Contacto  

---

## 1. Introducción y Marco de Trabajo

El presente documento recopila las **10 Historias de Usuario** fundamentales que componen el Producto Mínimo Viable (MVP) de la plataforma **UniFind**, diseñada para transformar y modernizar la gestión de objetos extraviados y devueltos en las sedes de la **Corporación Universitaria Autónoma del Cauca**.

Cada historia sigue estrictamente el estándar de la industria:
> **Como** `[rol o tipo de usuario]`,  
> **quiero** `[acción o necesidad]`,  
> **para** `[beneficio o valor obtenido]`.

Asimismo, cada especificación contiene sus respectivos **Criterios de Aceptación** bajo el formato formal **Gherkin (Dado / Cuando / Entonces)** y su correspondiente **Mapeo Técnico en MongoDB y Node.js / Express**, detallando los operadores atómicos, índices y pipelines de agregación implementados.

---

## 2. Matriz de Trazabilidad de Historias de Usuario

| ID | Título de la Historia | Rol | Endpoint | Método | Operación Principal en MongoDB |
|---|---|---|---|:---:|---|
| **HU-01** | Registro en red de confianza universitaria | Estudiante / Docente | `/api/v1/auth/register` | `POST` | `User.create()` con validación de índice único y regex de dominio |
| **HU-02** | Publicación de reporte polimórfico de objeto | Estudiante (Finder/Owner) | `/api/v1/items` | `POST` | `Item.create()` con esquema polimórfico flexible (`Mixed`) |
| **HU-03** | Búsqueda multicriterio y búsqueda por texto | Estudiante | `/api/v1/items` | `GET` | `Item.find()` con índice de texto ponderado `$text` y `$textScore` |
| **HU-04** | Consulta detallada con sanitización de privacidad | Estudiante | `/api/v1/items/:id` | `GET` | `Item.findById()` + `.populate()` con sanitización de datos sensibles |
| **HU-05** | Verificación de titularidad mediante pregunta secreta | Dueño Legítimo | `/api/v1/items/:id/claim-verify` | `POST` | `Item.findById()` con normalización Unicode NFD anti-diacríticos |
| **HU-06** | Apertura de canal de chat privado | Finder / Reclamante | `/api/v1/chats` | `POST` | `Chat.findOne()` / `Chat.create()` y transición de `Item.status` |
| **HU-07** | Mensajería instantánea con actualización atómica | Participante de Chat | `/api/v1/chats/:id/messages` | `POST` | `Message.create()` + `Chat.findByIdAndUpdate()` (`$set`, `$inc`) |
| **HU-08** | Cierre de ciclo de vida del objeto y receptor | Miembro que devuelve | `/api/v1/items/:id/status` | `PATCH` | `Item.findByIdAndUpdate()` con validación y enlace de `returnedTo` |
| **HU-09** | Calificación y reputación post-entrega | Dueño que recupera | `/api/v1/users/:id/rate` | `POST` | `User.findByIdAndUpdate()` con recálculo de promedio ponderado |
| **HU-10** | Analítica de Hotspots de pérdida en el campus | Administrativo / Bienestar | `/api/v1/analytics/hotspots` | `GET` | `Item.aggregate()` con pipeline `$match`, `$group`, `$sort`, `$limit` |

---

## 3. Especificación Detallada de Historias de Usuario

### HU-01: Registro en la Red de Confianza Universitaria

#### Enunciado Oficial
> **Como** estudiante de la Corporación Universitaria Autónoma del Cauca,  
> **quiero** registrarme en UniFind utilizando mi correo institucional institucional (`@uniautonoma.edu.co`) y mi código estudiantil,  
> **para** autenticar mi identidad dentro del campus, acceder a la plataforma y participar de forma transparente y segura en la entrega o reclamo de objetos.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Registro de usuarios institucionales
  Como estudiante universitario
  Quiero autenticar mi identidad
  Para formar parte de la red de confianza de UniFind

  Escenario: Registro exitoso con correo institucional válido
    Dado que el usuario suministra un nombre completo "Valentina Gómez",
      un correo "valentina.gomez@uniautonoma.edu.co" y un código "2022-2045"
    Cuando se envía una petición POST al endpoint "/api/v1/auth/register"
    Entonces el sistema responde con código HTTP 201 Created
    Y el cuerpo de la respuesta contiene un mensaje de éxito y el objeto de usuario
    Y el usuario queda registrado con una reputación inicial de 0 devoluciones y calificación 5.0

  Escenario: Rechazo de registro por dominio de correo no institucional
    Dado que el usuario suministra un correo comercial "valentina@gmail.com"
    Cuando se envía una petición POST al endpoint "/api/v1/auth/register"
    Entonces el sistema responde con código HTTP 400 Bad Request
    Y la respuesta indica que el correo debe pertenecer al dominio "@uniautonoma.edu.co"

  Escenario: Rechazo por duplicidad de credenciales (correo o código ya existente)
    Dado que ya existe un usuario con el correo "carlos.munoz@uniautonoma.edu.co"
    Cuando se intenta registrar otro usuario con el mismo correo institucional
    Entonces el controlador o el índice único de MongoDB genera una violación 11000
    Y el sistema responde con código HTTP 400 Bad Request informando la duplicidad
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/auth/register`
- **Operación MongoDB:**
  ```javascript
  await User.create({
    fullName,
    institutionalEmail: institutionalEmail.toLowerCase().trim(),
    studentCode: studentCode.trim(),
    phone,
    reputation: { returnedCount: 0, rating: 5.0 }
  });
  ```
- **Índices en Colección `users`:**
  - `{ institutionalEmail: 1 }` (Unique)
  - `{ studentCode: 1 }` (Unique)

---

### HU-02: Publicación de Reporte Polimórfico de Objeto Extraviado o Hallado

#### Enunciado Oficial
> **Como** miembro de la comunidad universitaria que extravió un objeto o halló uno en las instalaciones,  
> **quiero** publicar un reporte polimórfico (`lost` o `found`) con detalles de ubicación (campus, edificio, salón), atributos dinámicos, etiquetas y opción de anonimato con pregunta secreta de comprobación,  
> **para** hacer visible el caso a la comunidad universitaria sin comprometer mi tranquilidad ni facilitar reclamos de personas inescrupulosas.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Creación de reportes de objetos
  Como miembro de la comunidad
  Quiero registrar un reporte detallado
  Para que el objeto pueda ser identificado y restituido

  Escenario: Publicación exitosa de un objeto encontrado con pregunta de comprobación
    Dado que Carlos encontró una calculadora científica en el Edificio B
    Y configura "isAnonymous: true", "claimQuestion" y "claimAnswer" secreta
    Cuando envía una petición POST a "/api/v1/items" con el JSON del objeto
    Entonces el sistema responde con código HTTP 201 Created
    Y el estado inicial del objeto se establece automáticamente en "active"
    Y la respuesta sanitizada oculta el número telefónico y datos privados del reportante

  Escenario: Rechazo por omisión de campos mandatorios
    Dado que un usuario intenta reportar un objeto sin especificar "title" o "location.building"
    Cuando envía la solicitud POST a "/api/v1/items"
    Entonces el middleware de validación intercepta el fallo
    Y el sistema responde con código HTTP 400 Bad Request detallando los campos faltantes
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/items`
- **Operación MongoDB:**
  ```javascript
  const newItem = await Item.create({
    title, type, category, description,
    location: { campus, building, specificArea },
    attributes, tags,
    privacy: { isAnonymous, postedBy, claimQuestion, claimAnswer },
    status: 'active'
  });
  ```
- **Esquema Dinámico:** Uso de `Schema.Types.Mixed` en `attributes` para permitir llaves arbitrarias según la naturaleza del artículo (ej. modelo, serial, capacidad, color, talla).

---

### HU-03: Búsqueda Multicriterio y Búsqueda Full-Text Ponderada

#### Enunciado Oficial
> **Como** estudiante que ha perdido una pertenencia en la universidad,  
> **quiero** filtrar los reportes por tipo, categoría, edificio del campus o buscar mediante palabras clave en el título, descripción y etiquetas,  
> **para** localizar oportunamente el reporte correspondiente de mi artículo entre cientos de publicaciones activas.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Búsqueda y filtrado de reportes
  Como estudiante con una pertenencia extraviada
  Quiero buscar con filtros y palabras clave
  Para ubicar con exactitud el reporte de mi objeto

  Escenario: Búsqueda textual mediante índice $text con ponderación
    Dado que existen reportes con etiquetas "calculadora" y descripciones técnicas
    Cuando se envía una petición GET a "/api/v1/items?search=calculadora"
    Entonces el sistema ejecuta una búsqueda full-text sobre título, tags y descripción
    Y retorna código HTTP 200 OK con los resultados ordenados por relevancia de texto ("textScore")

  Escenario: Filtrado multicriterio combinado con paginación
    Dado que el usuario filtra por type="lost", building="Edificio B" y category="electronics"
    Cuando se envía una petición GET a "/api/v1/items?type=lost&building=Edificio%20B&page=1&limit=5"
    Entonces el sistema responde con código HTTP 200 OK
    Y el payload contiene metadatos de paginación ("page", "totalPages", "total", "count")
    Y todos los ítems devueltos coinciden exactamente con los criterios de filtro
```

#### Mapeo Técnico
- **Endpoint:** `GET /api/v1/items?search=&type=&category=&building=&status=&page=&limit=`
- **Operación MongoDB:**
  ```javascript
  const query = {};
  if (type) query.type = type;
  if (building) query['location.building'] = new RegExp(building, 'i');
  if (search) query.$text = { $search: search };

  await Item.find(query)
    .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode');
  ```
- **Índice de Texto Compuesto:**
  ```javascript
  itemSchema.index(
    { title: 'text', description: 'text', tags: 'text' },
    { default_language: 'spanish', weights: { title: 5, tags: 3, description: 1 } }
  );
  ```

---

### HU-04: Consulta Segura de Detalle y Protección de Privacidad del Reportante

#### Enunciado Oficial
> **Como** estudiante que explora un reporte particular,  
> **quiero** consultar la ficha técnica completa del objeto sin que se exponga la respuesta secreta ni la identidad privada de un reportante anónimo,  
> **para** conocer las características físicas del artículo respetando la privacidad del usuario que lo publicó.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Consulta detallada y sanitización de seguridad
  Como usuario del sistema
  Quiero ver el detalle de un objeto
  Sin que se filtren respuestas secretas o datos de usuarios anónimos

  Escenario: Consulta de un objeto con reporte anónimo
    Dado un objeto con "isAnonymous: true" y "claimAnswer: 'Tapa azul con iniciales CM'"
    Cuando se consulta mediante GET "/api/v1/items/:id"
    Entonces el sistema responde con código HTTP 200 OK
    Y el objeto "postedBy" reemplaza el nombre y datos de contacto por "Usuario Anónimo (Comunidad Uniautónoma)"
    Y el atributo "claimAnswer" es completamente omitido de la respuesta JSON

  Escenario: Consulta de un identificador inexistente
    Dado un ID que no corresponde a ningún documento en la colección
    Cuando se envía una petición GET a "/api/v1/items/660e1234567890abcdef1234"
    Entonces el sistema responde con código HTTP 404 Not Found
    Y un mensaje descriptivo de recurso no localizado
```

#### Mapeo Técnico
- **Endpoint:** `GET /api/v1/items/:id`
- **Operación MongoDB:**
  ```javascript
  const item = await Item.findById(id)
    .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
    .populate('returnedTo', 'fullName studentCode');
  ```
- **Sanitización en Controlador:** Supresión estricta de `item.privacy.claimAnswer` y enmascaramiento condicional de `item.privacy.postedBy`.

---

### HU-05: Verificación de Pertenencia mediante Pregunta de Comprobación

#### Enunciado Oficial
> **Como** legítimo propietario de un objeto hallado por un tercero,  
> **quiero** responder la pregunta de comprobación de pertenencia formulada en la publicación,  
> **para** certificar que soy el dueño legítimo sin intermediarios ni filtraciones, quedando facultado para abrir el canal de contacto de entrega.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Verificación de titularidad de objetos
  Como legítimo propietario
  Quiero responder a la pregunta de seguridad
  Para demostrar mi autenticidad como dueño

  Escenario: Verificación exitosa de pertenencia
    Dado que el reporte de la calculadora exige responder "¿De qué color es la tapa protectora y qué iniciales tiene grabadas?"
    Y la respuesta almacenada internamente es "Tapa azul con iniciales CM"
    Cuando el solicitante envía POST "/api/v1/items/:id/claim-verify" con answer="Tapa azul con iniciales CM"
    Entonces el sistema normaliza tildes y mayúsculas, valida la coincidencia
    Y responde con código HTTP 200 OK y "claimVerified: true"

  Escenario: Intento con respuesta incorrecta
    Dado que el solicitante envía una respuesta errónea como "Tapa negra marca Casio"
    Cuando se ejecuta la validación en "/api/v1/items/:id/claim-verify"
    Entonces el sistema responde con código HTTP 400 Bad Request
    Y el cuerpo indica "claimVerified: false" impidiendo la suplantación
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/items/:id/claim-verify`
- **Operación MongoDB:**
  ```javascript
  const item = await Item.findById(id);
  // Normalización Unicode NFD y remoción de diacríticos para comparación semántica
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const isMatch = normalize(req.body.answer).includes(normalize(item.privacy.claimAnswer));
  ```

---

### HU-06: Apertura y Gestión de Canal de Negociación Privado

#### Enunciado Oficial
> **Como** estudiante que comprobó la propiedad de un objeto o que reportó un hallazgo,  
> **quiero** iniciar un canal de chat directo con la otra parte vinculada al artículo,  
> **para** acordar el punto exacto y hora de entrega dentro de las instalaciones universitarias, pasando el reporte a estado "en proceso" (`in_process`).

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Creación y gestión de chats
  Como usuario verificado
  Quiero abrir una conversación privada con el reportante
  Para coordinar la devolución segura del objeto

  Escenario: Creación de un nuevo chat de entrega
    Dado un objeto en estado "active" con reportante Carlos y reclamante Valentina
    Cuando Valentina envía una petición POST a "/api/v1/chats" con "itemId" y "claimantId"
    Entonces el sistema responde con código HTTP 201 Created
    Y se crea el documento en la colección "chats" con los 2 participantes
    Y el estado del objeto en la colección "items" cambia automáticamente a "in_process"

  Escenario: Reutilización de chat existente (idempotencia)
    Dado que ya existe una conversación entre Carlos y Valentina para ese mismo objeto
    Cuando se envía nuevamente la petición POST a "/api/v1/chats"
    Entonces el sistema no duplica la conversación, responde con código HTTP 200 OK
    Y retorna el chat ya establecido con sus participantes populados
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/chats`
- **Operación MongoDB:**
  ```javascript
  const existingChat = await Chat.findOne({
    itemId: item._id,
    participants: { $all: [posterId, partnerId] }
  });
  if (!existingChat) {
    const newChat = await Chat.create({
      itemId: item._id,
      participants: [posterId, partnerId],
      status: 'open',
      unreadCount: { [posterId]: 0, [partnerId]: 0 }
    });
    await Item.findByIdAndUpdate(item._id, { $set: { status: 'in_process' } });
  }
  ```

---

### HU-07: Mensajería Instantánea Segura con Actualización Atómica

#### Enunciado Oficial
> **Como** usuario que negocia la entrega de un objeto en un chat activo,  
> **quiero** enviar mensajes de texto y acuerdos de entrega,  
> **para** comunicarme en tiempo real, registrando de forma atómica el último mensaje y actualizando el contador de no leídos de mi contraparte.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Envío de mensajes y actualización atómica
  Como participante de un chat de entrega
  Quiero enviar un mensaje en la conversación
  Para coordinar los detalles de entrega

  Escenario: Envío exitoso de mensaje con actualización atómica
    Dado un chat abierto entre Carlos y Valentina
    Cuando Valentina envía POST a "/api/v1/chats/:id/messages" con su "senderId" y "content"
    Entonces el sistema responde con código HTTP 201 Created
    Y se inserta el nuevo documento en la colección "messages"
    Y en una sola operación atómica se actualiza el chat:
      $set en "lastMessage" y $inc en "unreadCount.<carlosId>" (+1)

  Escenario: Bloqueo de mensaje por remitente no participante
    Dado un usuario ajeno Andrés que intenta enviar un mensaje a la conversación de Carlos y Valentina
    Cuando se envía la petición con el ID de Andrés en "senderId"
    Entonces el sistema rechaza la solicitud con código HTTP 403 Forbidden
    Y no se altera el estado de la conversación
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/chats/:id/messages`
- **Operación MongoDB:**
  ```javascript
  const newMessage = await Message.create({
    chatId: chat._id,
    senderId,
    content: content.trim(),
    sentAt: new Date()
  });

  const updateOps = {
    $set: { lastMessage: { senderId, text: content.trim(), sentAt: newMessage.sentAt } },
    $inc: { [`unreadCount.${recipientId}`]: 1 }
  };

  await Chat.findByIdAndUpdate(chatId, updateOps, { new: true });
  ```

---

### HU-08: Formalización y Cierre de Devolución con Trazabilidad

#### Enunciado Oficial
> **Como** estudiante que ha entregado satisfactoriamente un objeto a su titular,  
> **quiero** actualizar el estado del reporte a `returned` y vincular formalmente al estudiante receptor mediante su identificador,  
> **para** dar cierre definitivo al caso en la plataforma y dejar constancia auditable de la entrega exitosa.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Cierre de ciclo y vinculación de receptor
  Como miembro que devuelve una pertenencia
  Quiero marcar el objeto como devuelto y vincular al receptor
  Para certificar el cierre exitoso del caso

  Escenario: Transición exitosa a estado "returned"
    Dado un objeto en estado "in_process"
    Cuando el usuario envía una petición PATCH a "/api/v1/items/:id/status"
      con status="returned" y returnedTo="<ID_Valentina>"
    Entonces el sistema valida que el ID de Valentina exista en la colección "users"
    Y actualiza el estado a "returned" asociando su referencia
    Y responde con código HTTP 200 OK con los datos completos del receptor populados

  Escenario: Rechazo por omisión del usuario receptor
    Dado un intento de actualizar a status="returned" sin especificar "returnedTo"
    Cuando se envía la petición PATCH
    Entonces el sistema responde con código HTTP 400 Bad Request
    Y exige el identificador del usuario que recibe el artículo
```

#### Mapeo Técnico
- **Endpoint:** `PATCH /api/v1/items/:id/status`
- **Operación MongoDB:**
  ```javascript
  const item = await Item.findById(id);
  item.status = 'returned';
  item.returnedTo = returnedToId;
  await item.save();

  const populated = await Item.findById(id)
    .populate('privacy.postedBy', 'fullName institutionalEmail studentCode')
    .populate('returnedTo', 'fullName studentCode institutionalEmail');
  ```

---

### HU-09: Sistema de Reputación y Confianza Post-Entrega

#### Enunciado Oficial
> **Como** estudiante que recibió nuevamente su pertenencia extraviada,  
> **quiero** calificar de 1 a 5 estrellas la honestidad y diligencia del compañero que me ayudó,  
> **para** recompensar su compromiso cívico y elevar su reputación pública dentro de la comunidad de la Uniautónoma del Cauca.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Calificación de reputación
  Como usuario que recuperó su objeto
  Quiero calificar a quien me lo entregó
  Para incentivar la honestidad en el campus

  Escenario: Calificación exitosa con recálculo de promedio ponderado
    Dado que Carlos tiene 2 devoluciones previas con una calificación promedio de 4.9
    Cuando Valentina le otorga 5 estrellas mediante POST "/api/v1/users/:id/rate" con rating=5
    Entonces el sistema recalcula la reputación usando la fórmula ponderada:
      ((4.9 * 2) + 5) / 3 = 4.93 -> 4.9 estrellas
    Y "returnedCount" se incrementa a 3
    Y el sistema responde con código HTTP 200 OK con la ficha de reputación actualizada

  Escenario: Intento de auto-calificación fraudulenta
    Dado que un usuario intenta enviar una calificación a su propio ID de usuario
    Cuando se envía la petición con raterId igual al ID de la ruta
    Entonces el sistema rechaza la solicitud con código HTTP 400 Bad Request
```

#### Mapeo Técnico
- **Endpoint:** `POST /api/v1/users/:id/rate`
- **Operación MongoDB:**
  ```javascript
  const user = await User.findById(id);
  const currentCount = user.reputation.returnedCount || 0;
  const currentRating = user.reputation.rating || 5.0;

  const newCount = currentCount + 1;
  const newRating = ((currentRating * currentCount) + numRating) / newCount;
  const roundedRating = Math.round(newRating * 10) / 10;

  user.reputation = { returnedCount: newCount, rating: roundedRating };
  await user.save();
  ```

---

### HU-10: Analítica de Hotspots de Pérdida en el Campus

#### Enunciado Oficial
> **Como** coordinador de bienestar universitario o administrador de planta física,  
> **quiero** consultar un reporte agregado de los edificios y sedes con mayor recurrencia de objetos extraviados (`type: 'lost'`),  
> **para** focalizar patrullajes de seguridad, instalar casilleros o emitir alertas tempranas de prevención en las zonas críticas.

#### Criterios de Aceptación (Gherkin)

```gherkin
Característica: Agregación analítica de zonas críticas
  Como directivo institucional
  Quiero analizar los puntos de mayor pérdida del campus
  Para tomar decisiones operativas y preventivas

  Escenario: Consulta exitosa de Hotspots mediante pipeline de agregación
    Dado que existen múltiples reportes de objetos perdidos en Edificio B, Biblioteca y Cafetería
    Cuando se realiza una petición GET a "/api/v1/analytics/hotspots?limit=5"
    Entonces el sistema ejecuta un pipeline de agregación en MongoDB ($match, $group, $sort, $limit, $project)
    Y responde con código HTTP 200 OK
    Y retorna un arreglo ordenado descendentemente por "totalLostItems"
    Y cada registro expone el campus, el edificio, las categorías más afectadas y ejemplos recientes
```

#### Mapeo Técnico
- **Endpoint:** `GET /api/v1/analytics/hotspots?campus=&limit=`
- **Pipeline de Agregación en MongoDB:**
  ```javascript
  const pipeline = [
    // 1. Filtrar únicamente los reportes de tipo 'lost'
    { $match: { type: 'lost', ...(campus && { 'location.campus': new RegExp(campus, 'i') }) } },

    // 2. Agrupar por campus y edificio
    {
      $group: {
        _id: { campus: '$location.campus', building: '$location.building' },
        totalLostItems: { $sum: 1 },
        categories: { $addToSet: '$category' },
        mostRecentIncident: { $max: '$createdAt' },
        sampleReports: {
          $push: {
            id: '$_id',
            title: '$title',
            category: '$category',
            specificArea: '$location.specificArea',
            status: '$status'
          }
        }
      }
    },

    // 3. Ordenar descendentemente por total de extravíos
    { $sort: { totalLostItems: -1 } },

    // 4. Limitar a los N puntos más vulnerables
    { $limit: limitNumber },

    // 5. Proyectar salida estructurada y limpia
    {
      $project: {
        _id: 0,
        campus: '$_id.campus',
        building: '$_id.building',
        totalLostItems: 1,
        categories: 1,
        mostRecentIncident: 1,
        sampleReports: { $slice: ['$sampleReports', 2] }
      }
    }
  ];

  const hotspots = await Item.aggregate(pipeline);
  ```

---

## 4. Conclusión

Las 10 Historias de Usuario descritas articulan integralmente el flujo de valor de la plataforma **UniFind**, combinando estrictas reglas de negocio universitarias, operaciones atómicas de alta concurrencia en MongoDB y protección integral de la privacidad estudiantil, satisfaciendo a cabalidad los requisitos del Parcial 2 de Bases de Datos Avanzadas.

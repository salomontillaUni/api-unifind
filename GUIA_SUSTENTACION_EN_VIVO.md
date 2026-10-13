# 🎯 GUÍA DE SUSTENTACIÓN EN VIVO (MÁXIMO 5 MINUTOS)
## Proyecto: UniFind — API REST Node.js & MongoDB
**Asignatura:** Bases de Datos Avanzadas | **Docente:** Diego Prado (`diego.prado.o@uniautonoma.edu.co`)  
**Institución:** Corporación Universitaria Autónoma del Cauca

---

> 💡 **INSTRUCCIONES DE USO FRENTE AL PROFESOR:**  
> 1. Abre **Thunder Client** (o **Postman**) con la colección `unifind.postman_collection.json` ya importada (las 11 peticiones están numeradas).  
> 2. Abre una pestaña del navegador o **MongoDB Compass** conectada a `mongodb://127.0.0.1:27017/unifind_db`.  
> 3. En cada punto: **Lee la Historia de Usuario en voz alta**, **copia/pega la URL y el Body** (o presiona Send en la colección), **muestra el código de estado (200/201)** y **muestra la persistencia en MongoDB** cuando aplique.

---

## ⚡ Preparación Inicial (30 segundos antes de pasar)

Ejecuta en tu terminal dentro de la carpeta del proyecto:
```bash
# 1. Poblar la base de datos con los datos de prueba oficiales
npm run seed

# 2. Iniciar el servidor
npm run dev
```
*Salida esperada:* `🚀 Servidor UniFind API ejecutándose en el puerto 3000`

---

## ⏱️ Cronograma de Ejecución y Guión en Vivo

```
[00:00 - 01:00] ──> Funcionalidades 1 a 3 (Registro institucional, Reporte y Búsqueda $text)
[01:00 - 02:00] ──> Funcionalidades 4 a 6 (Privacidad anónima, Validación de Propiedad y Chat)
[02:00 - 03:15] ──> Funcionalidades 7 a 9 (Mensaje atómico, Cierre a Entregado y Calificación)
[03:15 - 04:15] ──> Funcionalidad 10 + Bonus Error (Hotspots analíticos y Regla de rechazo 400)
[04:15 - 05:00] ──> Verificación en MongoDB y Conclusiones del grupo
```

---

### 1️⃣ Funcionalidad 1: Registro de Usuario Institucional
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 1: Como estudiante de la Uniautónoma, quiero registrarme con mi correo institucional, para acceder a la red de confianza de objetos perdidos del campus."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/auth/register`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "fullName": "Daniela Sofía Paz",
  "institutionalEmail": "daniela.paz@uniautonoma.edu.co",
  "studentCode": "2024-5501",
  "phone": "3128904567"
}
```
* **Respuesta esperada:** `201 Created`  
  *Muestra en la respuesta:* El usuario creado con `reputation: { returnedCount: 0, rating: 5.0 }`.
* **Verificación MongoDB:** Colección `users` $\rightarrow$ el documento de Daniela Paz está insertado.

---

### 2️⃣ Funcionalidad 2: Creación de Reporte Polimórfico con Pregunta de Comprobación
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 2: Como estudiante que halló una pertenencia ajena, quiero publicar un reporte indicando ubicación y preguntas clave, para que el dueño legítimo pueda identificarlo."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/items`
* **Body (raw JSON):**
```json
{
  "title": "Audífonos Inalámbricos Sony WH-1000XM4",
  "type": "found",
  "category": "electronics",
  "description": "Audífonos diadema negros con estuche protector olvidados en la sala de lectura.",
  "location": {
    "campus": "Sede Principal",
    "building": "Biblioteca",
    "specificArea": "Mesa de estudio individual 4"
  },
  "attributes": {
    "color": "Negro mate",
    "marca": "Sony",
    "incluyeEstuche": true
  },
  "tags": ["audifonos", "sony", "biblioteca", "tecnologia"],
  "privacy": {
    "isAnonymous": false,
    "postedBy": "670c1f1e1c9d440000a10003",
    "claimQuestion": "¿Qué sticker tiene pegado el estuche de los audífonos?",
    "claimAnswer": "sticker de Batman dorado"
  }
}
```
* **Respuesta esperada:** `201 Created`  
  *Muestra en la respuesta:* Estado `active` y que `claimAnswer` fue sanitizado (no se expone públicamente).
* **Verificación MongoDB:** Colección `items` $\rightarrow$ nuevo reporte guardado.

---

### 3️⃣ Funcionalidad 3: Búsqueda y Filtrado Multicriterio con Índice `$text`
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 3: Como estudiante que extravió un objeto, quiero buscar y filtrar por categoría, texto y sede, para localizar rápidamente publicaciones similares a mi pertenencia."*
* **Método y URL:**  
  `GET http://localhost:3000/api/v1/items?type=found&category=electronics&search=casio`
* **Body:** Ninguno
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:* Retorna la **Calculadora Casio** usando el índice compuesto `$text` ponderado por relevancia (`score`).

---

### 4️⃣ Funcionalidad 4: Detalle de Reporte con Sanitización de Privacidad (Anónimo)
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 4: Como usuario de la comunidad, quiero consultar el detalle de un reporte sin exponer los datos del reportante anónimo, para proteger la privacidad de quien lo encontró."*
* **Método y URL:**  
  `GET http://localhost:3000/api/v1/items/670c1f1e1c9d440000b10001`
* **Body:** Ninguno
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:*  
  1. `privacy.postedBy.fullName` aparece como `"Usuario Anónimo"`.  
  2. El campo `claimAnswer` **está oculto** para proteger la seguridad.

---

### 5️⃣ Funcionalidad 5: Verificación de Propiedad Respondiendo la `claimQuestion`
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 5: Como dueño legítimo de un objeto, quiero responder la pregunta de comprobación, para demostrar mi propiedad y ser habilitado para reclamarlo."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/items/670c1f1e1c9d440000b10001/claim-verify`
* **Body (raw JSON):**
```json
{
  "claimantId": "670c1f1e1c9d440000a10002",
  "answer": "Tapa azul con iniciales CM"
}
```
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:* `"claimVerified": true` y mensaje: *"Respuesta correcta. Propiedad verificada satisfactoriamente"*.

---

### 6️⃣ Funcionalidad 6: Apertura de Canal Privado entre Reportante y Reclamante
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 6: Como solicitante con propiedad verificada, quiero iniciar un chat privado con quien tiene mi objeto, para acordar el punto de entrega seguro dentro del campus."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/chats`
* **Body (raw JSON):**
```json
{
  "itemId": "670c1f1e1c9d440000b10001",
  "claimantId": "670c1f1e1c9d440000a10002"
}
```
* **Respuesta esperada:** `201 Created` (o `200 OK` si ya existía el demo).  
  *Muestra en la respuesta:*  
  1. Chat creado con estado `"open"` y los 2 participantes.  
  2. El objeto asociado cambia automáticamente de estado a `"in_process"`.
* **Verificación MongoDB:** Colección `chats` $\rightarrow$ documento enlazado con `itemId`.

---

### 7️⃣ Funcionalidad 7: Envío de Mensaje Atómico en Canal de Chat
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 7: Como participante de un chat, quiero enviar mensajes en el hilo de conversación, para coordinar la hora y entrega en la sede universitaria."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/chats/670c1f1e1c9d440000c10001/messages`
* **Body (raw JSON):**
```json
{
  "senderId": "670c1f1e1c9d440000a10001",
  "content": "Perfecto Valentina, nos vemos hoy a las 4:00 PM frente a la Biblioteca Central para entregártela."
}
```
* **Respuesta esperada:** `201 Created`  
  *Muestra en la respuesta:* Mensaje creado y en `chatSummary` muestra cómo se actualizó atómicamente `lastMessage` y el contador `unreadCount`.
* **Verificación MongoDB:** Colección `messages` $\rightarrow$ nuevo mensaje insertado.

---

### 8️⃣ Funcionalidad 8: Transición de Estado a Entregado (`returned`)
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 8: Como reportante de un objeto, quiero actualizar su estado a entregado y vincular al receptor, para cerrar formalmente el ciclo del reporte."*
* **Método y URL:**  
  `PATCH http://localhost:3000/api/v1/items/670c1f1e1c9d440000b10001/status`
* **Body (raw JSON):**
```json
{
  "status": "returned",
  "returnedTo": "670c1f1e1c9d440000a10002"
}
```
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:* `status: "returned"` y `returnedTo` poblado con los datos de Valentina Gómez.
* **Verificación MongoDB:** Colección `items` $\rightarrow$ el objeto tiene `status: "returned"`.

---

### 9️⃣ Funcionalidad 9: Calificación y Recálculo Ponderado de Reputación
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 9: Como estudiante que recuperó su pertenencia, quiero calificar la honestidad y puntualidad de quien me la devolvió, para fomentar la buena reputación en la comunidad."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/users/670c1f1e1c9d440000a10001/rate`
* **Body (raw JSON):**
```json
{
  "rating": 5,
  "raterId": "670c1f1e1c9d440000a10002",
  "itemId": "670c1f1e1c9d440000b10001",
  "comment": "¡Excelente persona! Me devolvió la calculadora en perfecto estado y fue muy puntual."
}
```
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:*  
  - `returnedCount` se incrementó a `3`.  
  - `rating` recalculado atómicamente con promedio ponderado.
* **Verificación MongoDB:** Colección `users` $\rightarrow$ Carlos Muñoz tiene su reputación actualizada.

---

### 🔟 Funcionalidad 10: Agregación Analítica de Zonas Críticas (*Hotspots*)
* **🗣️ Lo que dices al profe:**  
  *"Historia de Usuario 10: Como coordinador de Bienestar Universitario, quiero consultar las zonas del campus con más pérdidas reportadas, para desplegar campañas preventivas."*
* **Método y URL:**  
  `GET http://localhost:3000/api/v1/analytics/hotspots?limit=5`
* **Body:** Ninguno
* **Respuesta esperada:** `200 OK`  
  *Muestra en la respuesta:* Agrupamiento generado mediante el **Aggregation Pipeline de MongoDB** (`$match` $\rightarrow$ `$group` por campus y edificio $\rightarrow$ `$sort` descendente $\rightarrow$ `$limit` $\rightarrow$ `$project`). Muestra que el **Edificio B** y la **Biblioteca** concentran la mayor cantidad de pérdidas.

---

### 💥 BONUS EXCLUSIVO: Manejo de Errores y Validación Estricta (Código 400)
* **🗣️ Lo que dices al profe:**  
  *"Profe, para evidenciar el criterio de manejo de errores y validación de reglas de negocio, intentamos registrar un correo personal externo (Gmail) en lugar del institucional."*
* **Método y URL:**  
  `POST http://localhost:3000/api/v1/auth/register`
* **Body (raw JSON):**
```json
{
  "fullName": "Intento Externo",
  "institutionalEmail": "pedro.externo@gmail.com",
  "studentCode": "2024-9999"
}
```
* **Respuesta esperada:** `400 Bad Request`  
* **Mensaje recibido:** `"El correo debe ser institucional con dominio @uniautonoma.edu.co"`  
* *Demuestra:* Validación por regex y middleware centralizado de errores sin que el servidor se caiga.

---

## 📋 Resumen Rápido de IDs Deterministas (Por si el profe pregunta)

| Rol / Recurso | ID en MongoDB | Descripción |
|---|---|---|
| **Carlos Muñoz (Finder)** | `670c1f1e1c9d440000a10001` | Estudiante que encuentra y entrega |
| **Valentina Gómez (Claimant)**| `670c1f1e1c9d440000a10002` | Dueña legítima que reclama y califica |
| **Andrés Salazar (Comunidad)**| `670c1f1e1c9d440000a10003` | Estudiante con reportes de prueba |
| **Calculadora Casio (Item)** | `670c1f1e1c9d440000b10001` | Objeto con pregunta secreta y anonimato |
| **Chat de Demostración** | `670c1f1e1c9d440000c10001` | Canal de coordinación entre Carlos y Valentina |

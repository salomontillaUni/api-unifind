const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItemById,
  verifyClaim,
  claimItem,
  notifyFoundItem,
  updateItemStatus,
  getTicketDetails,
  confirmTicketDelivery,
  updateItem,
  deleteItem,
  getAllTickets
} = require('../controllers/itemController');

// Endpoint 2: Crear reporte polimórfico de objeto (Flujo A FOUND vs Flujo B LOST)
router.post('/', createItem);

// Endpoint 3: Listar objetos con filtros y búsqueda de texto (soporta ?custodyType=PORTERIA)
router.get('/', getItems);

// HU-09: Consola de Vigilancia - Auditoría de todos los tickets generados
router.get('/tickets', getAllTickets);

// HU-09: Consola de Vigilancia - Consultar ticket de retiro en Portería
router.get('/tickets/:token', getTicketDetails);

// HU-09: Consola de Vigilancia - Confirmar entrega física mediante ticket
router.post('/tickets/:token/confirm-delivery', confirmTicketDelivery);

// Endpoint 4: Obtener detalle con sanitización de privacidad (por _id o por #UAC-XXXX)
router.get('/:id', getItemById);

// Actualización y eliminación completa de reportes de objetos (CRUD Panel Admin)
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

// Endpoint 5: Comprobación de propiedad mediante claimQuestion
router.post('/:id/claim-verify', verifyClaim);

// Flujo A: Reclamar objeto encontrado (Portería genera token / Personal abre chat)
router.post('/:id/claim', claimItem);

// Flujo B: Notificar hallazgo de objeto extraviado (LEFT_AT_PORTERIA / HAVE_IT_WITH_ME)
router.post('/:id/notify-found', notifyFoundItem);

// Endpoint 8: Actualización de estado del objeto y vinculación de receptor
router.patch('/:id/status', updateItemStatus);

module.exports = router;

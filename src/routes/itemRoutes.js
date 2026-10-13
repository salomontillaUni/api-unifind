const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItemById,
  verifyClaim,
  updateItemStatus
} = require('../controllers/itemController');

// Endpoint 2: Crear reporte polimórfico de objeto
router.post('/', createItem);

// Endpoint 3: Listar objetos con filtros y búsqueda de texto
router.get('/', getItems);

// Endpoint 4: Obtener detalle con sanitización de privacidad
router.get('/:id', getItemById);

// Endpoint 5: Comprobación de propiedad mediante claimQuestion
router.post('/:id/claim-verify', verifyClaim);

// Endpoint 8: Actualización de estado del objeto y vinculación de receptor
router.patch('/:id/status', updateItemStatus);

module.exports = router;

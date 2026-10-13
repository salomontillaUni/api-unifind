const express = require('express');
const router = express.Router();
const {
  rateUser,
  getUsers,
  getUserById
} = require('../controllers/userController');

// Listar usuarios (soporte para demostración)
router.get('/', getUsers);

// Obtener detalle de usuario
router.get('/:id', getUserById);

// Endpoint 9: Calificación y actualización atómica de reputación
router.post('/:id/rate', rateUser);

module.exports = router;

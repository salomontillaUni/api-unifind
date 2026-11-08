const express = require('express');
const router = express.Router();
const {
  rateUser,
  getUsers,
  getUserById,
  getUserProfile,
  updateUserProfile,
  getUserItems
} = require('../controllers/userController');

// Listar usuarios (soporte para demostración)
router.get('/', getUsers);

// HU-08: Perfil integral de usuario con estadísticas y reputación
router.get('/:id/profile', getUserProfile);
router.put('/:id/profile', updateUserProfile);

// HU-08: Listar pertenencias reportadas por el usuario
router.get('/:id/items', getUserItems);

// Obtener detalle básico de usuario
router.get('/:id', getUserById);

// Endpoint 9: Calificación y actualización atómica de reputación
router.post('/:id/rate', rateUser);

module.exports = router;

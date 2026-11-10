const express = require('express');
const router = express.Router();
const {
  createUser,
  rateUser,
  getUsers,
  getUserById,
  getUserProfile,
  updateUserProfile,
  getUserItems,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Listar usuarios con paginación, búsqueda y filtros
router.get('/', getUsers);

// Crear nuevo usuario institucional (Panel Admin)
router.post('/', createUser);

// HU-08: Perfil integral de usuario con estadísticas y reputación
router.get('/:id/profile', getUserProfile);
router.put('/:id/profile', updateUserProfile);

// HU-08: Listar pertenencias reportadas por el usuario
router.get('/:id/items', getUserItems);

// Obtener detalle básico de usuario
router.get('/:id', getUserById);

// Actualización y eliminación administrativa de usuario
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Endpoint 9: Calificación y actualización atómica de reputación
router.post('/:id/rate', rateUser);

module.exports = router;

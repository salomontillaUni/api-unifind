const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Endpoint 1: Registro de usuario institucional
router.post('/register', registerUser);

// Login / Auto-registro transparente institucional
router.post('/login', loginUser);

module.exports = router;

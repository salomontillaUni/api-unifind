const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// Endpoint 1: Registro de usuario institucional
router.post('/register', registerUser);

module.exports = router;

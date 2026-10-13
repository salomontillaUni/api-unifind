const express = require('express');
const router = express.Router();
const {
  createChat,
  sendMessage,
  getChatMessages,
  getChats
} = require('../controllers/chatController');

// Endpoint 6: Iniciar chat entre reportante y solicitante
router.post('/', createChat);

// Listar todos los chats (soporte para demostración)
router.get('/', getChats);

// Endpoint 7: Enviar mensaje y actualizar atómicamente el chat
router.post('/:id/messages', sendMessage);

// Obtener mensajes de una conversación
router.get('/:id/messages', getChatMessages);

module.exports = router;

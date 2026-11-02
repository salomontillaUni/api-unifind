const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Item = require('../models/Item');
const User = require('../models/User');

const DEFAULT_COMMUNITY_USER_ID = '670c1f1e1c9d440000a10001'; // Carlos Muñoz (Hallador)
const DEFAULT_CLAIMANT_USER_ID = '670c1f1e1c9d440000a10002';  // Valentina Gómez (Reclamante)

/**
 * @desc    Crear o inicializar un canal de chat entre reportante y solicitante - HU-06
 * @route   POST /api/v1/chats
 * @access  Public (Sin Auth)
 */
const createChat = async (req, res, next) => {
  try {
    const { itemId, claimantId, participants } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El campo itemId es obligatorio'
      });
    }

    let item = null;
    const cleanId = itemId.toString().trim().replace(/^#/, '').toUpperCase();

    if (mongoose.Types.ObjectId.isValid(itemId)) {
      item = await Item.findById(itemId);
    }

    if (!item) {
      item = await Item.findOne({
        $or: [{ code: cleanId }, { code: `#${cleanId}` }, { code: itemId }]
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte de objeto con el ID o código: ${itemId}`
      });
    }

    const posterId = (item.privacy?.postedBy || DEFAULT_COMMUNITY_USER_ID).toString();
    let partnerId = claimantId;

    if (!partnerId && Array.isArray(participants) && participants.length >= 2) {
      partnerId = participants.find((p) => p.toString() !== posterId);
    }

    // Soporte 'Sin Auth': Auto-asignar reclamante comunitario por defecto
    if (!partnerId) {
      partnerId = posterId === DEFAULT_CLAIMANT_USER_ID ? DEFAULT_COMMUNITY_USER_ID : DEFAULT_CLAIMANT_USER_ID;
    }

    if (posterId === partnerId.toString()) {
      partnerId = DEFAULT_CLAIMANT_USER_ID;
    }

    // Asegurar que el usuario solicitante exista en la BD
    if (mongoose.Types.ObjectId.isValid(partnerId)) {
      const claimantExists = await User.findById(partnerId);
      if (!claimantExists) {
        await User.create({
          _id: partnerId,
          fullName: 'Valentina Gómez Restrepo',
          institutionalEmail: 'valentina.gomez@uniautonoma.edu.co',
          studentCode: '2022-2045'
        }).catch(() => {});
      }
    }

    // Verificar si ya existe un chat activo para este ítem entre estos participantes
    const existingChat = await Chat.findOne({
      itemId: item._id,
      participants: { $all: [posterId, partnerId] }
    })
      .populate('participants', 'fullName institutionalEmail studentCode reputation')
      .populate('itemId', 'code title type category status location');

    if (existingChat) {
      // Asegurar que el estado del ítem refleje in_process
      if (item.status === 'active') {
        item.status = 'in_process';
        await item.save();
      }

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Chat existente recuperado para este objeto',
        data: existingChat
      });
    }

    // Crear el nuevo canal de chat
    const newChat = await Chat.create({
      itemId: item._id,
      participants: [posterId, partnerId],
      status: 'open',
      unreadCount: {
        [posterId]: 0,
        [partnerId.toString()]: 0
      }
    });

    // Transición automática del objeto a 'in_process'
    if (item.status === 'active') {
      item.status = 'in_process';
      await item.save();
    }

    const populatedChat = await Chat.findById(newChat._id)
      .populate('participants', 'fullName institutionalEmail studentCode reputation')
      .populate('itemId', 'code title type category status location');

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Chat privado creado exitosamente y estado del objeto actualizado a in_process',
      data: populatedChat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enviar un mensaje y actualizar atómicamente el estado del chat - HU-06
 * @route   POST /api/v1/chats/:id/messages
 * @access  Public (Sin Auth)
 */
const sendMessage = async (req, res, next) => {
  try {
    const { id: chatId } = req.params;
    let { senderId, content, attachments } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El contenido del mensaje no puede estar vacío'
      });
    }

    const chat = await Chat.findById(chatId).populate('itemId');
    if (!chat) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún chat con el ID: ${chatId}`
      });
    }

    // Soporte 'Sin Auth': Auto-asignar remitente si no se envía en body
    if (!senderId) {
      const posterId = chat.itemId?.privacy?.postedBy?.toString() || DEFAULT_COMMUNITY_USER_ID;
      const nonPoster = chat.participants.find((p) => p.toString() !== posterId);
      senderId = nonPoster ? nonPoster.toString() : (chat.participants[1]?.toString() || DEFAULT_CLAIMANT_USER_ID);
    }

    // Asegurar que el remitente esté registrado entre los participantes
    if (!chat.participants.some((p) => p.toString() === senderId.toString())) {
      chat.participants.push(senderId);
      await chat.save();
    }

    // 1. Crear documento Message
    const newMessage = await Message.create({
      chatId: chat._id,
      senderId,
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      sentAt: new Date()
    });

    // 2. Identificar el receptor para incrementar su contador de no leídos
    const recipient = chat.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

    const updateOps = {
      $set: {
        lastMessage: {
          senderId,
          text: content.trim(),
          sentAt: newMessage.sentAt
        }
      }
    };

    if (recipient) {
      updateOps.$inc = { [`unreadCount.${recipient.toString()}`]: 1 };
    }

    // Actualización atómica en una sola operación
    const updatedChat = await Chat.findByIdAndUpdate(chatId, updateOps, {
      new: true
    }).populate('participants', 'fullName institutionalEmail');

    const populatedMessage = await Message.findById(newMessage._id).populate(
      'senderId',
      'fullName institutionalEmail'
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Mensaje enviado y conversación actualizada atómicamente',
      data: populatedMessage,
      chatSummary: {
        chatId: updatedChat._id,
        status: updatedChat.status,
        lastMessage: updatedChat.lastMessage,
        unreadCount: updatedChat.unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener lista de mensajes de una conversación
 * @route   GET /api/v1/chats/:id/messages
 * @access  Public
 */
const getChatMessages = async (req, res, next) => {
  try {
    const { id: chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró el chat con ID: ${chatId}`
      });
    }

    const messages = await Message.find({ chatId })
      .sort({ sentAt: 1 })
      .populate('senderId', 'fullName institutionalEmail');

    return res.status(200).json({
      success: true,
      statusCode: 200,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar todos los chats (soporte para demostración)
 * @route   GET /api/v1/chats
 * @access  Public
 */
const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find()
      .populate('itemId', 'code title type category status location')
      .populate('participants', 'fullName institutionalEmail studentCode')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChat,
  sendMessage,
  getChatMessages,
  getChats
};

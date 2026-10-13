const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Item = require('../models/Item');
const User = require('../models/User');

/**
 * @desc    Crear o inicializar un canal de chat entre reportante y solicitante
 * @route   POST /api/v1/chats
 * @access  Public
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

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte de objeto con el ID: ${itemId}`
      });
    }

    const posterId = item.privacy.postedBy.toString();
    let partnerId = claimantId;

    if (!partnerId && Array.isArray(participants) && participants.length >= 2) {
      partnerId = participants.find((p) => p.toString() !== posterId);
    }

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Se requiere claimantId o un arreglo de participants con los involucrados'
      });
    }

    if (posterId === partnerId.toString()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El reportante del objeto no puede iniciar un chat de entrega consigo mismo'
      });
    }

    // Verificar que el solicitante exista en la BD
    const claimantExists = await User.findById(partnerId);
    if (!claimantExists) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: 'El usuario solicitante no existe en la base de datos'
      });
    }

    // Verificar si ya existe un chat activo para este ítem entre estos participantes
    const existingChat = await Chat.findOne({
      itemId: item._id,
      participants: { $all: [posterId, partnerId] }
    })
      .populate('participants', 'fullName institutionalEmail studentCode reputation')
      .populate('itemId', 'title type category status location');

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
      .populate('itemId', 'title type category status location');

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
 * @desc    Enviar un mensaje y actualizar atómicamente el estado del chat
 * @route   POST /api/v1/chats/:id/messages
 * @access  Public
 */
const sendMessage = async (req, res, next) => {
  try {
    const { id: chatId } = req.params;
    const { senderId, content, attachments } = req.body;

    if (!senderId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Los campos senderId y content son obligatorios'
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún chat con el ID: ${chatId}`
      });
    }

    // Validar que el senderId pertenezca al chat
    const isParticipant = chat.participants.some(
      (participantId) => participantId.toString() === senderId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        error: 'El remitente no es participante de esta conversación'
      });
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
 * @desc    Listar todos los chats (útil para auditoría y visualización de pruebas)
 * @route   GET /api/v1/chats
 * @access  Public
 */
const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find()
      .populate('itemId', 'title type category status')
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

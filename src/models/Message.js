const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: [true, 'El ID del chat es obligatorio']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El remitente del mensaje es obligatorio']
    },
    content: {
      type: String,
      required: [true, 'El contenido del mensaje no puede estar vacío'],
      trim: true
    },
    attachments: {
      type: [String],
      default: []
    },
    isRead: {
      type: Boolean,
      default: false
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Índice para listar mensajes por chat ordenados cronológicamente
messageSchema.index({ chatId: 1, sentAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

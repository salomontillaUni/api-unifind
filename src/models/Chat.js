const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'El ID del objeto relacionado es obligatorio']
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 2;
        },
        message: 'El chat debe contener al menos dos participantes'
      },
      required: [true, 'Los participantes son obligatorios']
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'agreed', 'rejected', 'closed'],
        message: 'Estado de chat inválido'
      },
      default: 'open'
    },
    lastMessage: {
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      text: {
        type: String,
        default: ''
      },
      sentAt: {
        type: Date,
        default: null
      }
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Índice para consultas de chats por participante y por ítem
chatSchema.index({ itemId: 1 });
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);

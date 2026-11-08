const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    title: {
      type: String,
      required: [true, 'El título del objeto es obligatorio'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'El tipo es obligatorio (lost o found)'],
      enum: {
        values: ['lost', 'found'],
        message: 'El tipo debe ser lost o found'
      }
    },
    status: {
      type: String,
      enum: {
        values: ['pending_review', 'active', 'in_process', 'returned', 'archived', 'rejected'],
        message: 'Estado no válido'
      },
      default: 'pending_review'
    },
    category: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true
    },
    location: {
      campus: {
        type: String,
        required: [true, 'El campus o sede es obligatorio'],
        trim: true,
        default: 'Sede Principal'
      },
      building: {
        type: String,
        required: [true, 'El edificio o bloque es obligatorio'],
        trim: true
      },
      specificArea: {
        type: String,
        trim: true,
        default: ''
      }
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    custodyType: {
      type: String,
      enum: ['PORTERIA', 'PERSONAL', null],
      default: null
    },
    distinguishingMarks: {
      type: String,
      default: '',
      trim: true
    },
    brandAndColor: {
      type: String,
      default: '',
      trim: true
    },
    photoUrl: {
      type: String,
      default: '',
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    privacy: {
      isAnonymous: {
        type: Boolean,
        default: false
      },
      postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      claimQuestion: {
        type: String,
        trim: true,
        default: ''
      },
      claimAnswer: {
        type: String,
        trim: true,
        default: ''
      }
    },
    claimRecord: {
      claimantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      ownershipProofText: {
        type: String,
        default: ''
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      deliveryToken: {
        type: String,
        default: ''
      },
      claimedAt: {
        type: Date,
        default: null
      }
    },
    findingNotification: {
      notifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      action: {
        type: String,
        enum: ['LEFT_AT_PORTERIA', 'HAVE_IT_WITH_ME', null],
        default: null
      },
      finderNote: {
        type: String,
        default: ''
      },
      notifiedAt: {
        type: Date,
        default: null
      }
    },
    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    moderationNotes: {
      type: String,
      trim: true,
      default: ''
    },
    moderatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Índice de texto compuesto para búsqueda full-text optimizada
itemSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  {
    default_language: 'spanish',
    weights: { title: 5, tags: 3, description: 1 },
    name: 'item_text_search_index'
  }
);

// Índices adicionales para acelerar filtros comunes
itemSchema.index({ code: 1 });
itemSchema.index({ custodyType: 1 });
itemSchema.index({ 'claimRecord.deliveryToken': 1 });
itemSchema.index({ type: 1, status: 1 });
itemSchema.index({ 'location.building': 1 });
itemSchema.index({ category: 1 });

module.exports = mongoose.model('Item', itemSchema);

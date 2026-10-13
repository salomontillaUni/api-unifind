const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
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
        values: ['active', 'in_process', 'returned', 'archived'],
        message: 'Estado no válido'
      },
      default: 'active'
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
        ref: 'User',
        required: [true, 'El usuario que publica es obligatorio']
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
    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
itemSchema.index({ type: 1, status: 1 });
itemSchema.index({ 'location.building': 1 });
itemSchema.index({ category: 1 });

module.exports = mongoose.model('Item', itemSchema);

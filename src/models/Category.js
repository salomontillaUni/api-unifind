const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'El slug de la categoría es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    icon: {
      type: String,
      default: 'Package',
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Índices para acelerar búsquedas
categorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);

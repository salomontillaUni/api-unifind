const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true
    },
    institutionalEmail: {
      type: String,
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@uniautonoma\.edu\.co$/,
        'El correo debe ser institucional con dominio @uniautonoma.edu.co'
      ]
    },
    studentCode: {
      type: String,
      required: [true, 'El código estudiantil es obligatorio'],
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    reputation: {
      returnedCount: {
        type: Number,
        default: 0,
        min: 0
      },
      rating: {
        type: Number,
        default: 5.0,
        min: 1.0,
        max: 5.0
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);

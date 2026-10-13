const User = require('../models/User');

/**
 * @desc    Registrar un nuevo usuario universitario
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { fullName, institutionalEmail, studentCode, phone } = req.body;

    if (!fullName || !institutionalEmail || !studentCode) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Los campos fullName, institutionalEmail y studentCode son obligatorios'
      });
    }

    // Validación explícita de correo institucional
    const institutionalRegex = /^[a-zA-Z0-9._%+-]+@uniautonoma\.edu\.co$/;
    if (!institutionalRegex.test(institutionalEmail.trim())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El correo debe ser institucional con dominio @uniautonoma.edu.co'
      });
    }

    // Verificar existencia previa
    const existingEmail = await User.findOne({ institutionalEmail: institutionalEmail.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El correo institucional ya se encuentra registrado'
      });
    }

    const existingCode = await User.findOne({ studentCode: studentCode.trim() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El código estudiantil ya se encuentra registrado'
      });
    }

    // Creación de usuario con reputación inicial por defecto
    const newUser = await User.create({
      fullName: fullName.trim(),
      institutionalEmail: institutionalEmail.toLowerCase().trim(),
      studentCode: studentCode.trim(),
      phone: phone ? phone.trim() : '',
      reputation: {
        returnedCount: 0,
        rating: 5.0
      }
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Usuario registrado exitosamente en la red de confianza UniFind',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser
};

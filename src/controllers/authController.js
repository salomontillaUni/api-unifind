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
        rating: 5.0,
        honorPoints: 100,
        badges: ['Miembro Uniautónoma']
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

/**
 * @desc    Iniciar sesión o auto-registro transparente para emulador y app móvil
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const emailInput = req.body.institutionalEmail || req.body.email;
    const codeInput = req.body.studentCode || req.body.studentId || req.body.code;
    const nameInput = req.body.fullName || req.body.name;

    if (!emailInput) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El correo institucional es obligatorio para iniciar sesión'
      });
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    const institutionalRegex = /^[a-zA-Z0-9._%+-]+@uniautonoma\.edu\.co$/;
    if (!institutionalRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El correo debe ser institucional con dominio @uniautonoma.edu.co'
      });
    }

    // Buscar si ya existe por correo o por código
    let user = await User.findOne({ institutionalEmail: cleanEmail });
    if (!user && codeInput) {
      user = await User.findOne({ studentCode: codeInput.toString().trim() });
    }

    if (user) {
      // Asegurar que cuente con honorPoints y badges si es un registro previo
      if (user.reputation && user.reputation.honorPoints === undefined) {
        user.reputation.honorPoints = 100;
        user.reputation.badges = user.reputation.badges || [];
        await user.save();
      }

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Sesión iniciada exitosamente',
        data: user
      });
    }

    // Auto-registro transparente para agilizar pruebas en emulador/dispositivo
    const emailPrefix = cleanEmail.split('@')[0];
    const generatedName = nameInput || emailPrefix.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const generatedCode = codeInput ? codeInput.toString().trim() : `2024-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      fullName: generatedName,
      institutionalEmail: cleanEmail,
      studentCode: generatedCode,
      phone: req.body.phone || '',
      reputation: {
        returnedCount: 0,
        rating: 5.0,
        honorPoints: 100,
        badges: ['Miembro Uniautónoma']
      }
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Usuario verificado y registrado automáticamente en UniFind',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser
};

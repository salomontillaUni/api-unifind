const User = require('../models/User');

/**
 * @desc    Calificar honestidad y cumplimiento del usuario que devolvió el objeto - HU-07
 * @route   POST /api/v1/users/:id/rate
 * @access  Public (Sin Auth)
 */
const rateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating = 5, raterId, itemId, comment, tags, badges } = req.body;

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'La calificación debe ser un valor numérico entre 1 y 5 estrellas'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún usuario con el ID: ${id}`
      });
    }

    if (raterId && raterId.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Un usuario no puede calificarse a sí mismo'
      });
    }

    if (!user.reputation) {
      user.reputation = {
        returnedCount: 0,
        rating: 5.0,
        honorPoints: 100,
        badges: []
      };
    }

    const currentCount = user.reputation.returnedCount || 0;
    const currentRating = user.reputation.rating ?? 5.0;
    const currentHonor = user.reputation.honorPoints !== undefined ? user.reputation.honorPoints : 100;
    const currentBadges = Array.isArray(user.reputation.badges) ? user.reputation.badges : [];

    // 1. Recalcular promedio ponderado de estrellas
    let newRating;
    const newCount = currentCount + 1;

    if (currentCount === 0) {
      newRating = numRating;
    } else {
      newRating = ((currentRating * currentCount) + numRating) / newCount;
    }
    const roundedRating = Math.round(newRating * 10) / 10;

    // 2. Sumar +100 Puntos de Honor (Criterio de aceptación HU-07)
    const newHonorPoints = currentHonor + 100;

    // 3. Agregar nuevos reconocimientos/badges (ej. 'Puntual', 'Muy Honesto')
    const incomingBadges = Array.isArray(badges) ? badges : (Array.isArray(tags) ? tags : []);
    const mergedBadges = Array.from(new Set([...currentBadges, ...incomingBadges.filter(Boolean)]));

    user.reputation = {
      returnedCount: newCount,
      rating: roundedRating,
      honorPoints: newHonorPoints,
      badges: mergedBadges
    };

    await user.save();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Calificación registrada exitosamente, +100 Puntos de Honor acreditados y reputación actualizada',
      data: {
        userId: user._id,
        fullName: user.fullName,
        studentCode: user.studentCode,
        institutionalEmail: user.institutionalEmail,
        reputation: user.reputation,
        evaluatedDetails: {
          submittedRating: numRating,
          raterId: raterId || null,
          itemId: itemId || null,
          comment: comment ? comment.trim() : null,
          awardedHonorPoints: 100,
          awardedBadges: incomingBadges
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar todos los usuarios
 * @route   GET /api/v1/users
 * @access  Public
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener información de un usuario por ID
 * @route   GET /api/v1/users/:id
 * @access  Public
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró el usuario con ID: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rateUser,
  getUsers,
  getUserById
};

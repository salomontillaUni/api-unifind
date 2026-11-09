const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const { sanitizeItem } = require('./itemController');

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
 * @desc    Listar todos los usuarios con paginación, búsqueda y filtro por rol
 * @route   GET /api/v1/users
 * @access  Public / Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;
    const query = {};

    if (role && role.trim()) {
      query.role = role.trim();
    }

    if (search && search.trim()) {
      const term = search.trim();
      const searchRegex = new RegExp(term, 'i');
      query.$or = [
        { fullName: searchRegex },
        { institutionalEmail: searchRegex },
        { studentCode: searchRegex }
      ];
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
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

/**
 * @desc    Obtener perfil integral del usuario con estadísticas e insignias - HU-08
 * @route   GET /api/v1/users/:id/profile
 * @access  Public (Sin Auth)
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select('-__v');
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ studentCode: id }, { institutionalEmail: id.toLowerCase().trim() }]
      }).select('-__v');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún usuario con el identificador: ${id}`
      });
    }

    const honorPoints = user.reputation?.honorPoints ?? 100;
    let rank = 'Guardián Novato';
    if (honorPoints >= 300) {
      rank = 'Héroe del Campus';
    } else if (honorPoints >= 150) {
      rank = 'Custodio Solidario';
    }

    // Estadísticas de reportes del usuario
    const [reportedLostCount, reportedFoundCount, returnedCount, userItems] = await Promise.all([
      Item.countDocuments({ 'privacy.postedBy': user._id, type: 'lost' }),
      Item.countDocuments({ 'privacy.postedBy': user._id, type: 'found' }),
      Item.countDocuments({ 'privacy.postedBy': user._id, status: 'returned' }),
      Item.find({ 'privacy.postedBy': user._id })
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const sanitizedItems = userItems.map((item) => sanitizeItem(item));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          institutionalEmail: user.institutionalEmail,
          studentCode: user.studentCode,
          role: user.role || 'student',
          phone: user.phone || '',
          avatarUrl: user.avatarUrl || '',
          reputation: {
            rating: user.reputation?.rating ?? 5.0,
            returnedCount: user.reputation?.returnedCount ?? 0,
            honorPoints,
            rank,
            badges: user.reputation?.badges || []
          }
        },
        stats: {
          totalReported: reportedLostCount + reportedFoundCount,
          reportedLost: reportedLostCount,
          reportedFound: reportedFoundCount,
          returnedSuccess: returnedCount
        },
        recentItems: sanitizedItems
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar perfil de usuario (teléfono, avatar, nombre) - HU-08
 * @route   PUT /api/v1/users/:id/profile
 * @access  Public (Sin Auth)
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phone, avatarUrl } = req.body;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ studentCode: id }, { institutionalEmail: id.toLowerCase().trim() }]
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún usuario con el identificador: ${id}`
      });
    }

    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Perfil de usuario actualizado exitosamente',
      data: {
        id: user._id,
        fullName: user.fullName,
        institutionalEmail: user.institutionalEmail,
        studentCode: user.studentCode,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar pertenencias reportadas por el usuario - HU-08
 * @route   GET /api/v1/users/:id/items
 * @access  Public (Sin Auth)
 */
const getUserItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ studentCode: id }, { institutionalEmail: id.toLowerCase().trim() }]
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró el usuario con ID: ${id}`
      });
    }

    const filter = { 'privacy.postedBy': user._id };
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type.toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Item.countDocuments(filter);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      total,
      page: Number(page),
      data: items.map((i) => sanitizeItem(i))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualización administrativa de usuario (role, phone, honorPoints, fullName, avatarUrl)
 * @route   PUT /api/v1/users/:id
 * @access  Public / Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, phone, honorPoints, fullName, avatarUrl } = req.body;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ studentCode: id }, { institutionalEmail: id.toLowerCase().trim() }]
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún usuario con el ID o código: ${id}`
      });
    }

    if (role !== undefined) {
      const allowedRoles = ['student', 'guard', 'admin', 'superadmin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: `Rol inválido: '${role}'. Roles permitidos: ${allowedRoles.join(', ')}`
        });
      }
      user.role = role;
    }

    if (phone !== undefined) user.phone = phone.trim();
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();

    if (honorPoints !== undefined) {
      const numPoints = Number(honorPoints);
      if (isNaN(numPoints)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: 'honorPoints debe ser un valor numérico'
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
      user.reputation.honorPoints = numPoints;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Usuario actualizado exitosamente',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar usuario de la plataforma
 * @route   DELETE /api/v1/users/:id
 * @access  Public / Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ studentCode: id }, { institutionalEmail: id.toLowerCase().trim() }]
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún usuario con el ID o código: ${id}`
      });
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Usuario eliminado exitosamente',
      data: {
        id: user._id,
        fullName: user.fullName,
        studentCode: user.studentCode,
        institutionalEmail: user.institutionalEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rateUser,
  getUsers,
  getUserById,
  getUserProfile,
  updateUserProfile,
  getUserItems,
  updateUser,
  deleteUser
};

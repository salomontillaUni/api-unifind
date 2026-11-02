const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');

// IDs comunitarios por defecto para soporte 'Sin Auth'
const DEFAULT_COMMUNITY_USER_ID = '670c1f1e1c9d440000a10001'; // Carlos Andrés Muñoz (Hallador)
const DEFAULT_CLAIMANT_USER_ID = '670c1f1e1c9d440000a10002';  // Valentina Gómez Restrepo (Reclamante)

/**
 * Cálculo amigable de tiempo relativo transcurrido (ej. 'Hace 2 horas', 'Hace 15 min', 'Reciente')
 */
const calculateTimeAgo = (date) => {
  if (!date) return 'Reciente';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Reciente';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHour === 1) return 'Hace 1 hora';
  if (diffHour < 24) return `Hace ${diffHour} horas`;
  if (diffDay === 1) return 'Hace 1 día';
  if (diffDay < 7) return `Hace ${diffDay} días`;
  const diffWeeks = Math.floor(diffDay / 7);
  if (diffWeeks === 1) return 'Hace 1 semana';
  return `Hace ${diffWeeks} semanas`;
};

/**
 * Función auxiliar para sanitizar y enriquecer un objeto Item para consumo móvil y web
 * Si isAnonymous es true, enmascara los datos de postedBy.
 * Oculta siempre claimAnswer para no exponer la respuesta secreta (HU-04).
 * Enriquece con campos planos (id, code, campusLocation, roomReference, timeAgo, etc.)
 */
const sanitizeItem = (itemDoc) => {
  const item = itemDoc.toObject ? itemDoc.toObject() : { ...itemDoc };

  if (item.privacy) {
    // Nunca exponer la respuesta de comprobación en respuestas públicas
    delete item.privacy.claimAnswer;

    if (item.privacy.isAnonymous) {
      const posterId = item.privacy.postedBy?._id || item.privacy.postedBy || DEFAULT_COMMUNITY_USER_ID;
      item.privacy.postedBy = {
        _id: posterId,
        fullName: 'Usuario Anónimo',
        isAnonymous: true
      };
    }
  }

  const rawId = item._id ? item._id.toString() : '';
  const fallbackSuffix = rawId ? rawId.slice(-4).toUpperCase() : Math.floor(1000 + Math.random() * 9000);
  const codeValue = item.code || `#UAC-${fallbackSuffix}`;

  const campus = item.location?.campus || 'Sede Principal';
  const building = item.location?.building || '';
  const specificArea = item.location?.specificArea || '';

  const campusLocation = building ? `${campus} · ${building}` : campus;
  const roomReference = specificArea || building || 'Campus Uniautónoma';

  return {
    ...item,
    id: rawId,
    code: codeValue,
    campusLocation,
    roomReference,
    timeAgo: calculateTimeAgo(item.createdAt),
    securityQuestion: item.privacy?.claimQuestion || '',
    requiresVerification: Boolean(item.privacy?.claimQuestion),
    rewardPoints: 100
  };
};

/**
 * Normalizador de categorías para coincidir con variantes en español e inglés
 */
const mapCategoryQuery = (cat) => {
  if (!cat) return null;
  const c = cat.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (c.includes('electr') || c.includes('tech') || c.includes('gadget')) {
    return { $in: [/^electr/i, /^tech/i, /^gadget/i] };
  }
  if (c.includes('docum') || c.includes('carnet') || c.includes('papel')) {
    return { $in: [/^doc/i, /^carnet/i, /^papel/i] };
  }
  if (c.includes('ropa') || c.includes('cloth') || c.includes('acces') || c.includes('wear')) {
    return { $in: [/^ropa/i, /^cloth/i, /^access/i, /^prend/i] };
  }
  if (c.includes('libro') || c.includes('book') || c.includes('cuadern')) {
    return { $in: [/^lib/i, /^book/i, /^cuad/i, /^doc/i] };
  }
  return { $regex: new RegExp(`^${cat.trim()}$`, 'i') };
};

/**
 * @desc    Crear un nuevo reporte de objeto (perdido o encontrado) - HU-03 & HU-04
 * @route   POST /api/v1/items
 * @access  Public (Sin Auth)
 */
const createItem = async (req, res, next) => {
  try {
    const {
      title,
      type,
      situation,
      category,
      description,
      location,
      campusLocation,
      roomReference,
      building,
      campus,
      attributes,
      tags,
      privacy,
      isAnonymous,
      postedBy,
      securityQuestion,
      claimQuestion,
      securityAnswerExpected,
      claimAnswer,
      securityAnswer,
      code
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El título del objeto es obligatorio'
      });
    }

    // Resolver tipo (lost o found), aceptando variantes de situación del wizard móvil
    let resolvedType = type || situation || 'found';
    if (resolvedType === 'perdi' || resolvedType === 'perdido') resolvedType = 'lost';
    if (resolvedType === 'encontre' || resolvedType === 'encontrado') resolvedType = 'found';
    if (!['lost', 'found'].includes(resolvedType)) resolvedType = 'found';

    // Resolver ubicación: soporte para objeto anidado o campos planos del móvil
    let resolvedCampus = 'Sede Principal';
    let resolvedBuilding = building || 'Edificio Principal';
    let resolvedArea = roomReference || '';

    if (location && typeof location === 'object') {
      resolvedCampus = location.campus ? location.campus.trim() : resolvedCampus;
      resolvedBuilding = location.building ? location.building.trim() : resolvedBuilding;
      resolvedArea = location.specificArea ? location.specificArea.trim() : resolvedArea;
    } else if (campusLocation && typeof campusLocation === 'string') {
      const parts = campusLocation.split('·');
      if (parts.length > 1) {
        resolvedCampus = parts[0].trim();
        resolvedBuilding = parts[1].trim();
      } else {
        resolvedBuilding = campusLocation.trim();
      }
    }

    if (campus) resolvedCampus = campus.trim();

    // Soporte 'Sin Auth': Auto-asignar usuario comunitario si no se especifica
    const resolvedPostedBy =
      privacy?.postedBy ||
      postedBy ||
      DEFAULT_COMMUNITY_USER_ID;

    // Verificar si el usuario existe (si no, no bloquear en entorno de pruebas)
    if (mongoose.Types.ObjectId.isValid(resolvedPostedBy)) {
      const userExists = await User.findById(resolvedPostedBy);
      if (!userExists) {
        // En caso de que no exista aún en BD, asegurar uno básico
        await User.create({
          _id: resolvedPostedBy,
          fullName: 'Carlos Andrés Muñoz',
          institutionalEmail: 'carlos.munoz@uniautonoma.edu.co',
          studentCode: '2023-1001',
          phone: '3104567890'
        }).catch(() => {});
      }
    }

    // Mapeo amigable de preguntas de seguridad (HU-04)
    const finalQuestion = (securityQuestion || claimQuestion || privacy?.claimQuestion || '').trim();
    const finalAnswer = (securityAnswerExpected || claimAnswer || securityAnswer || privacy?.claimAnswer || '').trim();
    const isAnon = Boolean(
      isAnonymous !== undefined ? isAnonymous : privacy?.isAnonymous
    );

    // Generar automáticamente código único si no se envía
    let resolvedCode = code ? code.trim().toUpperCase() : null;
    if (!resolvedCode) {
      resolvedCode = `UAC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const newItem = await Item.create({
      code: resolvedCode,
      title: title.trim(),
      type: resolvedType,
      category: category ? category.trim() : 'general',
      description: description ? description.trim() : title.trim(),
      location: {
        campus: resolvedCampus,
        building: resolvedBuilding,
        specificArea: resolvedArea
      },
      attributes: attributes || {},
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      privacy: {
        isAnonymous: isAnon,
        postedBy: resolvedPostedBy,
        claimQuestion: finalQuestion,
        claimAnswer: finalAnswer
      },
      status: 'active'
    });

    const populatedItem = await Item.findById(newItem._id).populate(
      'privacy.postedBy',
      'fullName institutionalEmail phone reputation studentCode'
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Reporte de objeto registrado exitosamente en la comunidad Uniautónoma',
      data: sanitizeItem(populatedItem)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar objetos con filtros multicriterio, búsqueda por texto y paginación - HU-01 & HU-02
 * @route   GET /api/v1/items
 * @access  Public (Sin Auth)
 */
const getItems = async (req, res, next) => {
  try {
    const { type, category, building, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (category) {
      const categoryFilter = mapCategoryQuery(category);
      if (categoryFilter) {
        query.category = categoryFilter;
      }
    }

    if (building) {
      query['location.building'] = { $regex: new RegExp(building.trim(), 'i') };
    }

    // Filtro por status (si se envía 'all', muestra todos; de lo contrario aplica filtro)
    if (status && status !== 'all') {
      query.status = status;
    }

    let sortOptions = { createdAt: -1 };

    // Si se especifica término de búsqueda
    if (search && search.trim()) {
      const term = search.trim();
      const cleanTerm = term.replace(/^#/, '');

      if (/^UAC-\d+/i.test(cleanTerm)) {
        query.code = new RegExp(`^#?${cleanTerm}$`, 'i');
      } else {
        query.$text = { $search: term };
        sortOptions = { score: { $meta: 'textScore' } };
      }
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber)
      .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
      .populate('returnedTo', 'fullName studentCode');

    const sanitizedItems = items.map(sanitizeItem);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      count: sanitizedItems.length,
      data: sanitizedItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener detalle de un objeto por MongoDB _id o por código (ej. 'UAC-8841') - HU-05
 * @route   GET /api/v1/items/:id
 * @access  Public (Sin Auth)
 */
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanCode = id.replace(/^#/, '').toUpperCase();

    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Item.findById(id)
        .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
        .populate('returnedTo', 'fullName studentCode');
    }

    if (!item) {
      item = await Item.findOne({
        $or: [
          { code: cleanCode },
          { code: `#${cleanCode}` },
          { code: id }
        ]
      })
        .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
        .populate('returnedTo', 'fullName studentCode');
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador o código: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: sanitizeItem(item)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validar pertenencia de un objeto respondiendo a la pregunta de seguridad - HU-05
 * @route   POST /api/v1/items/:id/claim-verify
 * @access  Public (Sin Auth)
 */
const verifyClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { claimantId } = req.body;
    const answer = req.body.answer || req.body.claimAnswer || req.body.securityAnswer;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El campo answer o claimAnswer con la respuesta de comprobación es obligatorio'
      });
    }

    const cleanCode = id.replace(/^#/, '').toUpperCase();
    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Item.findById(id);
    }

    if (!item) {
      item = await Item.findOne({
        $or: [{ code: cleanCode }, { code: `#${cleanCode}` }, { code: id }]
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador o código: ${id}`
      });
    }

    if (!item.privacy || (!item.privacy.claimAnswer && !item.privacy.claimQuestion)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Este reporte no tiene configurada una pregunta de comprobación de pertenencia'
      });
    }

    // Normalizador de cadenas para comparación insensible a mayúsculas, espacios y acentos
    const normalizeText = (text) =>
      (text || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const expectedAnswer = item.privacy.claimAnswer || item.privacy.claimQuestion;
    const normalizedInput = normalizeText(answer);
    const normalizedExpected = normalizeText(expectedAnswer);

    const isMatch =
      normalizedInput === normalizedExpected ||
      normalizedInput.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedInput);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        claimVerified: false,
        message: 'La respuesta no coincide con los detalles registrados por quien encontró el objeto'
      });
    }

    // Soporte 'Sin Auth': Reclamante por defecto (Valentina Gómez)
    const resolvedClaimantId = claimantId || DEFAULT_CLAIMANT_USER_ID;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      claimVerified: true,
      message: 'Respuesta correcta. Propiedad verificada satisfactoriamente. Ahora puede iniciar el chat de entrega segura.',
      itemId: item._id,
      itemCode: item.code || `#UAC-${item._id.toString().slice(-4).toUpperCase()}`,
      claimantId: resolvedClaimantId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar el estado del objeto (ej. in_process -> returned) y vincular receptor - HU-07
 * @route   PATCH /api/v1/items/:id/status
 * @access  Public (Sin Auth)
 */
const updateItemStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, returnedTo } = req.body;

    const allowedStatuses = ['active', 'in_process', 'returned', 'archived'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Estado inválido. Valores permitidos: ${allowedStatuses.join(', ')}`
      });
    }

    const cleanCode = id.replace(/^#/, '').toUpperCase();
    let item = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Item.findById(id);
    }

    if (!item) {
      item = await Item.findOne({
        $or: [{ code: cleanCode }, { code: `#${cleanCode}` }, { code: id }]
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador o código: ${id}`
      });
    }

    if (status === 'returned') {
      // Soporte 'Sin Auth': Auto-asignar reclamante si no viene en body
      const resolvedReceiver = returnedTo || DEFAULT_CLAIMANT_USER_ID;

      if (mongoose.Types.ObjectId.isValid(resolvedReceiver)) {
        const receiverExists = await User.findById(resolvedReceiver);
        if (!receiverExists) {
          await User.create({
            _id: resolvedReceiver,
            fullName: 'Valentina Gómez Restrepo',
            institutionalEmail: 'valentina.gomez@uniautonoma.edu.co',
            studentCode: '2022-2045'
          }).catch(() => {});
        }
      }

      item.returnedTo = resolvedReceiver;
    }

    item.status = status;
    await item.save();

    const updatedItem = await Item.findById(item._id)
      .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
      .populate('returnedTo', 'fullName studentCode institutionalEmail');

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Estado del reporte actualizado exitosamente a '${status}'`,
      data: sanitizeItem(updatedItem)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  verifyClaim,
  updateItemStatus,
  sanitizeItem,
  calculateTimeAgo,
  mapCategoryQuery
};

const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const Chat = require('../models/Chat');

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
 * Normalizador de cadenas para comparación insensible a mayúsculas, espacios y acentos
 */
const normalizeText = (text) =>
  (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Función auxiliar para sanitizar y enriquecer un objeto Item para consumo móvil y web
 * Si isAnonymous es true, enmascara los datos de postedBy.
 * Oculta siempre claimAnswer para no exponer la respuesta secreta (HU-04).
 * Enriquece con campos DTO móviles (id, code, campusLocation, roomReference, custodyType, etc.)
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

  const photo = item.photoUrl || (Array.isArray(item.images) && item.images[0]) || '';

  return {
    ...item,
    id: rawId,
    code: codeValue,
    campusLocation,
    roomReference,
    timeAgo: calculateTimeAgo(item.createdAt),
    securityQuestion: item.privacy?.claimQuestion || '',
    requiresVerification: Boolean(item.privacy?.claimQuestion),
    rewardPoints: 100,
    custodyType: item.custodyType || null,
    distinguishingMarks: item.distinguishingMarks || '',
    brandAndColor: item.brandAndColor || '',
    photoUrl: photo,
    images: Array.isArray(item.images) ? item.images : (photo ? [photo] : []),
    claimRecord: item.claimRecord || null,
    findingNotification: item.findingNotification || null
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
 * @desc    Crear un nuevo reporte bifurcado: Flujo A (FOUND - Exprés Portería) vs Flujo B (LOST - Detallado Dueño)
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
      custodyType,
      custody,
      campusZone,
      location,
      campusLocation,
      roomReference,
      locationReference,
      building,
      campus,
      photoUrl,
      images,
      brand,
      model,
      brandAndColor,
      distinguishingMarks,
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

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'La categoría del objeto es obligatoria'
      });
    }

    // Resolver tipo (lost o found), aceptando mayúsculas y variantes del asistente móvil
    const rawType = (type || situation || 'found').toString().trim().toLowerCase();
    const isLost = rawType === 'lost' || rawType === 'perdi' || rawType === 'perdido';
    const resolvedType = isLost ? 'lost' : 'found';

    // Resolver zona de campus / edificio
    let resolvedBuilding = campusZone || building || 'Edificio Principal';
    let resolvedArea = locationReference || roomReference || '';
    let resolvedCampus = campus || 'Sede Principal';

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

    // Resolver fotos
    const resolvedPhoto = photoUrl || (Array.isArray(images) && images[0]) || '';
    const resolvedImages = Array.isArray(images) && images.length > 0 ? images : (resolvedPhoto ? [resolvedPhoto] : []);

    // Soporte 'Sin Auth': Auto-asignar usuario comunitario si no se especifica
    const resolvedPostedBy = privacy?.postedBy || postedBy || DEFAULT_COMMUNITY_USER_ID;

    if (mongoose.Types.ObjectId.isValid(resolvedPostedBy)) {
      const userExists = await User.findById(resolvedPostedBy);
      if (!userExists) {
        await User.create({
          _id: resolvedPostedBy,
          fullName: 'Carlos Andrés Muñoz',
          institutionalEmail: 'carlos.munoz@uniautonoma.edu.co',
          studentCode: '2023-1001',
          phone: '3104567890'
        }).catch(() => {});
      }
    }

    // Generar automáticamente código único si no se envía
    let resolvedCode = code ? code.trim().toUpperCase() : null;
    if (!resolvedCode) {
      resolvedCode = `UAC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let finalCustodyType = null;
    let finalDistinguishingMarks = '';
    let finalBrandAndColor = '';
    let finalDescription = '';
    let finalClaimQuestion = '';
    let finalClaimAnswer = '';
    let finalIsAnonymous = false;

    // --- BIFURCACIÓN DE FLUJOS ---
    if (resolvedType === 'found') {
      // FLUJO A: MODO EXPRÉS PORTERÍA / HALLADOR
      const rawCustody = (custodyType || custody || 'PORTERIA').toString().toUpperCase().trim();
      finalCustodyType = rawCustody === 'PERSONAL' ? 'PERSONAL' : 'PORTERIA';

      finalBrandAndColor = brandAndColor || (brand ? `${brand} ${model || ''}`.trim() : '');
      finalDescription = description ? description.trim() : `Encontrado en ${resolvedBuilding} bajo custodia ${finalCustodyType}`;

      finalClaimQuestion = (securityQuestion || claimQuestion || privacy?.claimQuestion || '').trim();
      finalClaimAnswer = (securityAnswerExpected || claimAnswer || securityAnswer || privacy?.claimAnswer || '').trim();
      finalIsAnonymous = Boolean(isAnonymous !== undefined ? isAnonymous : privacy?.isAnonymous);
    } else {
      // FLUJO B: MODO DETALLADO DUEÑO (OBJETO EXTRAVIADO)
      finalCustodyType = null; // El dueño no se custodia a sí mismo
      finalDistinguishingMarks = (distinguishingMarks || description || '').trim();
      finalBrandAndColor = (brandAndColor || (brand ? `${brand} ${model || ''}`.trim() : '')).trim();
      finalDescription = description ? description.trim() : (finalDistinguishingMarks ? `Extraviado con señas: ${finalDistinguishingMarks}` : title.trim());

      // El dueño no formula preguntas secretas de custodia
      finalClaimQuestion = '';
      finalClaimAnswer = '';
      finalIsAnonymous = false;
    }

    const newItem = await Item.create({
      code: resolvedCode,
      title: title.trim(),
      type: resolvedType,
      category: category.trim(),
      description: finalDescription,
      custodyType: finalCustodyType,
      distinguishingMarks: finalDistinguishingMarks,
      brandAndColor: finalBrandAndColor,
      photoUrl: resolvedPhoto,
      images: resolvedImages,
      location: {
        campus: resolvedCampus,
        building: resolvedBuilding,
        specificArea: resolvedArea
      },
      attributes: {
        brand: brand || '',
        model: model || '',
        ...attributes
      },
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      privacy: {
        isAnonymous: finalIsAnonymous,
        postedBy: resolvedPostedBy,
        claimQuestion: finalClaimQuestion,
        claimAnswer: finalClaimAnswer
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
      message: `Reporte de objeto (${resolvedType.toUpperCase()}) registrado exitosamente`,
      data: sanitizeItem(populatedItem)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar objetos con filtros multicriterio (tipo, custodia, categoría, búsqueda) - HU-01 & HU-02
 * @route   GET /api/v1/items
 * @access  Public (Sin Auth)
 */
const getItems = async (req, res, next) => {
  try {
    const { type, category, building, custodyType, porteria, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (type) {
      const lowerType = type.toString().toLowerCase().trim();
      if (['lost', 'found'].includes(lowerType)) {
        query.type = lowerType;
      }
    }

    // Filtro por tipo de custodia (PORTERIA / PERSONAL)
    if (custodyType) {
      query.custodyType = custodyType.toString().toUpperCase().trim();
    } else if (porteria === 'true') {
      query.custodyType = 'PORTERIA';
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

    if (status && status !== 'all') {
      query.status = status;
    }

    let sortOptions = { createdAt: -1 };

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
    const { answer, claimantId } = req.body;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El campo answer con la respuesta de comprobación es obligatorio'
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

    const resolvedClaimantId = claimantId || DEFAULT_CLAIMANT_USER_ID;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      claimVerified: true,
      message: 'Respuesta correcta. Propiedad verificada satisfactoriamente.',
      itemId: item._id,
      itemCode: item.code || `#UAC-${item._id.toString().slice(-4).toUpperCase()}`,
      claimantId: resolvedClaimantId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reclamar un objeto encontrado (Flujo A: FOUND)
 *          - Si custodyType === 'PORTERIA': Genera deliveryToken físico de retiro.
 *          - Si custodyType === 'PERSONAL': Vincula o abre canal de chat con el custodio.
 * @route   POST /api/v1/items/:id/claim
 * @access  Public (Sin Auth)
 */
const claimItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ownershipProofText, claimantId, securityAnswer, answer } = req.body;

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
        error: `No se encontró ningún reporte con el ID o código: ${id}`
      });
    }

    if (item.type !== 'found') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El endpoint /claim es exclusivo para objetos de tipo encontrado (found)'
      });
    }

    if (!ownershipProofText || !ownershipProofText.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El texto de comprobación de propiedad (ownershipProofText) es obligatorio'
      });
    }

    // Si tiene pregunta de seguridad y se envía respuesta, validar coincidencia
    if (item.privacy?.claimQuestion && (securityAnswer || answer)) {
      const provided = securityAnswer || answer;
      const expected = item.privacy.claimAnswer || item.privacy.claimQuestion;
      const normalizedProvided = normalizeText(provided);
      const normalizedExpected = normalizeText(expected);

      const matches =
        normalizedProvided === normalizedExpected ||
        normalizedProvided.includes(normalizedExpected) ||
        normalizedExpected.includes(normalizedProvided);

      if (!matches) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          claimApproved: false,
          error: 'La respuesta de seguridad no coincide con los detalles del custodio'
        });
      }
    }

    const resolvedClaimant = claimantId || DEFAULT_CLAIMANT_USER_ID;

    // Asegurar existencia del reclamante
    if (mongoose.Types.ObjectId.isValid(resolvedClaimant)) {
      const userExists = await User.findById(resolvedClaimant);
      if (!userExists) {
        await User.create({
          _id: resolvedClaimant,
          fullName: 'Valentina Gómez Restrepo',
          institutionalEmail: 'valentina.gomez@uniautonoma.edu.co',
          studentCode: '2022-2045'
        }).catch(() => {});
      }
    }

    item.status = 'in_process';

    // CASO 1: OBJETO EN CUSTODIA PORTERÍA
    if (item.custodyType === 'PORTERIA' || !item.custodyType) {
      const deliveryToken = `TICKET-${Math.floor(1000 + Math.random() * 9000)}-RET`;

      item.claimRecord = {
        claimantId: resolvedClaimant,
        ownershipProofText: ownershipProofText.trim(),
        status: 'approved',
        deliveryToken,
        claimedAt: new Date()
      };

      await item.save();

      return res.status(200).json({
        success: true,
        statusCode: 200,
        claimApproved: true,
        custodyType: 'PORTERIA',
        deliveryToken,
        pickupLocation: 'Portería Principal - Campus Uniautónoma',
        message: 'Reclamo aprobado exitosamente. Presenta este token en la Portería Principal para retirar el objeto.',
        data: sanitizeItem(item)
      });
    }

    // CASO 2: OBJETO EN CUSTODIA PERSONAL
    const posterId = (item.privacy?.postedBy || DEFAULT_COMMUNITY_USER_ID).toString();

    item.claimRecord = {
      claimantId: resolvedClaimant,
      ownershipProofText: ownershipProofText.trim(),
      status: 'approved',
      deliveryToken: '',
      claimedAt: new Date()
    };

    await item.save();

    // Crear o recuperar chat privado con el custodio
    let chat = await Chat.findOne({
      itemId: item._id,
      participants: { $all: [posterId, resolvedClaimant] }
    });

    if (!chat) {
      chat = await Chat.create({
        itemId: item._id,
        participants: [posterId, resolvedClaimant],
        status: 'open',
        unreadCount: {
          [posterId]: 0,
          [resolvedClaimant]: 0
        }
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      claimApproved: true,
      custodyType: 'PERSONAL',
      chatId: chat._id,
      message: 'Reclamo aprobado. Se ha habilitado el canal de chat seguro con la persona que custodia el objeto.',
      data: sanitizeItem(item),
      chat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Notificar el hallazgo de un objeto extraviado (Flujo B: LOST)
 *          - LEFT_AT_PORTERIA: Lo deja en portería y pasa a custodia PORTERIA.
 *          - HAVE_IT_WITH_ME: Lo tiene consigo, custodia PERSONAL y abre chat con el dueño.
 * @route   POST /api/v1/items/:id/notify-found
 * @access  Public (Sin Auth)
 */
const notifyFoundItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, finderNote, finderId } = req.body;

    const allowedActions = ['LEFT_AT_PORTERIA', 'HAVE_IT_WITH_ME'];
    if (!action || !allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `La acción es obligatoria y debe ser una de: ${allowedActions.join(', ')}`
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
        error: `No se encontró ningún reporte con el ID o código: ${id}`
      });
    }

    if (item.type !== 'lost') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El endpoint /notify-found es exclusivo para objetos reportados como extraviados (lost)'
      });
    }

    const resolvedFinder = finderId || DEFAULT_COMMUNITY_USER_ID;

    // Asegurar existencia del hallador
    if (mongoose.Types.ObjectId.isValid(resolvedFinder)) {
      const finderExists = await User.findById(resolvedFinder);
      if (!finderExists) {
        await User.create({
          _id: resolvedFinder,
          fullName: 'Carlos Andrés Muñoz',
          institutionalEmail: 'carlos.munoz@uniautonoma.edu.co',
          studentCode: '2023-1001'
        }).catch(() => {});
      }
    }

    item.status = 'in_process';
    item.findingNotification = {
      notifiedBy: resolvedFinder,
      action,
      finderNote: (finderNote || '').trim(),
      notifiedAt: new Date()
    };

    if (action === 'LEFT_AT_PORTERIA') {
      item.custodyType = 'PORTERIA';
      await item.save();

      return res.status(200).json({
        success: true,
        statusCode: 200,
        action: 'LEFT_AT_PORTERIA',
        custodyType: 'PORTERIA',
        message: 'Notificación registrada con éxito. El objeto ha quedado registrado bajo custodia de Portería.',
        data: sanitizeItem(item)
      });
    }

    // action === 'HAVE_IT_WITH_ME'
    item.custodyType = 'PERSONAL';
    await item.save();

    const ownerId = (item.privacy?.postedBy || DEFAULT_CLAIMANT_USER_ID).toString();

    let chat = await Chat.findOne({
      itemId: item._id,
      participants: { $all: [resolvedFinder, ownerId] }
    });

    if (!chat) {
      chat = await Chat.create({
        itemId: item._id,
        participants: [resolvedFinder, ownerId],
        status: 'open',
        unreadCount: {
          [resolvedFinder]: 0,
          [ownerId]: 0
        }
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      action: 'HAVE_IT_WITH_ME',
      custodyType: 'PERSONAL',
      chatId: chat._id,
      message: 'Notificación registrada. Se ha habilitado el chat directo entre el hallador y el dueño del objeto.',
      data: sanitizeItem(item),
      chat
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
  claimItem,
  notifyFoundItem,
  updateItemStatus,
  sanitizeItem,
  calculateTimeAgo,
  mapCategoryQuery
};

const Item = require('../models/Item');
const User = require('../models/User');

/**
 * Función auxiliar para sanitizar la privacidad de un objeto Item
 * Si isAnonymous es true, enmascara los datos de postedBy.
 * Oculta siempre claimAnswer para no exponer la respuesta secreta.
 */
const sanitizeItem = (itemDoc) => {
  const item = itemDoc.toObject ? itemDoc.toObject() : { ...itemDoc };

  if (item.privacy) {
    // Nunca exponer la respuesta de comprobación en respuestas públicas
    delete item.privacy.claimAnswer;

    if (item.privacy.isAnonymous) {
      const posterId = item.privacy.postedBy?._id || item.privacy.postedBy;
      item.privacy.postedBy = {
        _id: posterId,
        fullName: 'Usuario Anónimo',
        isAnonymous: true
      };
    }
  }

  return item;
};

/**
 * @desc    Crear un nuevo reporte de objeto (perdido o encontrado)
 * @route   POST /api/v1/items
 * @access  Public
 */
const createItem = async (req, res, next) => {
  try {
    const {
      title,
      type,
      category,
      description,
      location,
      attributes,
      tags,
      privacy
    } = req.body;

    if (!title || !type || !category || !description || !location || !location.building || !privacy || !privacy.postedBy) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Campos requeridos faltantes: title, type, category, description, location.building y privacy.postedBy son obligatorios'
      });
    }

    // Verificar que el usuario que publica exista
    const userExists = await User.findById(privacy.postedBy);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: 'El usuario especificado en privacy.postedBy no existe en la base de datos'
      });
    }

    const newItem = await Item.create({
      title: title.trim(),
      type,
      category: category.trim(),
      description: description.trim(),
      location: {
        campus: location.campus ? location.campus.trim() : 'Sede Principal',
        building: location.building.trim(),
        specificArea: location.specificArea ? location.specificArea.trim() : ''
      },
      attributes: attributes || {},
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      privacy: {
        isAnonymous: Boolean(privacy.isAnonymous),
        postedBy: privacy.postedBy,
        claimQuestion: privacy.claimQuestion ? privacy.claimQuestion.trim() : '',
        claimAnswer: privacy.claimAnswer ? privacy.claimAnswer.trim() : ''
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
      message: 'Reporte de objeto registrado exitosamente',
      data: sanitizeItem(populatedItem)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Listar objetos con filtros multicriterio, búsqueda por texto y paginación
 * @route   GET /api/v1/items
 * @access  Public
 */
const getItems = async (req, res, next) => {
  try {
    const { type, category, building, status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (building) {
      query['location.building'] = { $regex: new RegExp(building.trim(), 'i') };
    }

    if (status) {
      query.status = status;
    }

    let sortOptions = { createdAt: -1 };

    // Si se especifica término de búsqueda, utilizar índice de texto $text
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
      sortOptions = { score: { $meta: 'textScore' } };
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
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
 * @desc    Obtener detalle de un objeto por ID con sanitización de privacidad
 * @route   GET /api/v1/items/:id
 * @access  Public
 */
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id)
      .populate('privacy.postedBy', 'fullName institutionalEmail phone reputation studentCode')
      .populate('returnedTo', 'fullName studentCode');

    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador: ${id}`
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
 * @desc    Validar pertenencia de un objeto respondiendo a la pregunta de comprobación
 * @route   POST /api/v1/items/:id/claim-verify
 * @access  Public
 */
const verifyClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer, claimantId } = req.body;

    if (!answer || typeof answer !== 'string') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El campo answer con la respuesta de comprobación es obligatorio'
      });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador: ${id}`
      });
    }

    if (!item.privacy || (!item.privacy.claimAnswer && !item.privacy.claimQuestion)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'Este reporte no tiene configurada una pregunta de comprobación de pertenencia'
      });
    }

    // Normalizador de cadenas para comparación insensible a mayúsculas y acentos
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

    const isMatch = normalizedInput === normalizedExpected || normalizedInput.includes(normalizedExpected) || normalizedExpected.includes(normalizedInput);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        claimVerified: false,
        message: 'La respuesta no coincide con los detalles registrados por quien encontró el objeto'
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      claimVerified: true,
      message: 'Respuesta correcta. Propiedad verificada satisfactoriamente. Ahora puede iniciar un chat de entrega.',
      itemId: item._id,
      claimantId: claimantId || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar el estado del objeto (ej. in_process -> returned) y vincular receptor
 * @route   PATCH /api/v1/items/:id/status
 * @access  Public
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

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró ningún reporte con el identificador: ${id}`
      });
    }

    if (status === 'returned') {
      if (!returnedTo) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          error: 'Para marcar el objeto como "returned", es obligatorio proporcionar el campo returnedTo con el ID del estudiante receptor'
        });
      }

      const receiverExists = await User.findById(returnedTo);
      if (!receiverExists) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          error: 'El usuario receptor especificado en returnedTo no existe en la base de datos'
        });
      }

      item.returnedTo = returnedTo;
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
  updateItemStatus
};

const mongoose = require('mongoose');
const Category = require('../models/Category');

/**
 * @desc    Obtener lista de categorías con soporte de filtros
 * @route   GET /api/v1/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const { isActive, search } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: new RegExp(term, 'i') },
        { slug: new RegExp(term, 'i') },
        { description: new RegExp(term, 'i') }
      ];
    }

    const categories = await Category.find(query).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Crear una nueva categoría de objetos
 * @route   POST /api/v1/categories
 * @access  Public / Admin
 */
const createCategory = async (req, res, next) => {
  try {
    let { name, slug, icon = 'Package', description = '', isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: 'El nombre de la categoría es obligatorio'
      });
    }

    const trimmedName = name.trim();

    if (!slug || !slug.trim()) {
      slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    } else {
      slug = slug.trim().toLowerCase();
    }

    // Verificar si ya existe por nombre o slug
    const existing = await Category.findOne({
      $or: [{ name: new RegExp(`^${trimmedName}$`, 'i') }, { slug }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        error: `Ya existe una categoría con el nombre '${trimmedName}' o slug '${slug}'`
      });
    }

    const category = await Category.create({
      name: trimmedName,
      slug,
      icon: icon ? icon.trim() : 'Package',
      description: description ? description.trim() : '',
      isActive: Boolean(isActive)
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Categoría creada exitosamente',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar una categoría existente por ID o Slug
 * @route   PUT /api/v1/categories/:id
 * @access  Public / Admin
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, description, isActive } = req.body;

    let category = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }
    if (!category) {
      category = await Category.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró la categoría con identificador o slug: ${id}`
      });
    }

    if (name !== undefined) category.name = name.trim();
    if (slug !== undefined) category.slug = slug.trim().toLowerCase();
    if (icon !== undefined) category.icon = icon.trim();
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Eliminar una categoría por ID o Slug (física o soft delete)
 * @route   DELETE /api/v1/categories/:id
 * @access  Public / Admin
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { soft } = req.query;

    let category = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }
    if (!category) {
      category = await Category.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        error: `No se encontró la categoría con identificador o slug: ${id}`
      });
    }

    if (soft === 'true') {
      category.isActive = false;
      await category.save();
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Categoría desactivada exitosamente (soft delete)',
        data: category
      });
    }

    await Category.findByIdAndDelete(category._id);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Categoría eliminada exitosamente de la base de datos',
      data: { id: category._id, name: category.name, slug: category.slug }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};

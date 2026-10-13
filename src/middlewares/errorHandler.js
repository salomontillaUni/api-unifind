/**
 * Middleware centralizado para manejo de errores en Express
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = null;

  // Manejo de errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación en los datos enviados';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Manejo de IDs inválidos de Mongoose (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Formato de identificador inválido: ${err.value}`;
  }

  // Manejo de claves duplicadas en MongoDB (Código 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'campo';
    message = `El valor ingresado para '${duplicatedField}' ya se encuentra registrado en el sistema`;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Middleware para rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};

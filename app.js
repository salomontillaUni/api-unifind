require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const itemRoutes = require('./src/routes/itemRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const userRoutes = require('./src/routes/userRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint raíz de bienvenida y estado del servicio
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'UniFind API REST',
    version: '1.0.0',
    institution: 'Corporación Universitaria Autónoma del Cauca',
    description: 'Sistema Universitario de Objetos Perdidos y Red de Contacto',
    endpointsBase: '/api/v1'
  });
});

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UniFind API v1 activa y lista para recibir peticiones',
    modules: [
      { prefix: '/api/v1/auth', description: 'Registro y autenticación' },
      { prefix: '/api/v1/items', description: 'Gestión y búsqueda de reportes de objetos' },
      { prefix: '/api/v1/chats', description: 'Canales de comunicación privados' },
      { prefix: '/api/v1/users', description: 'Usuarios y calificaciones de reputación' },
      { prefix: '/api/v1/analytics', description: 'Agregaciones analíticas y hotspots del campus' }
    ]
  });
});

// Montaje de rutas con prefijo de versión /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Manejo de ruta no encontrada (404)
app.use(notFoundHandler);

// Manejo centralizado de errores
app.use(errorHandler);

module.exports = app;

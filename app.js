require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const itemRoutes = require('./src/routes/itemRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const userRoutes = require('./src/routes/userRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');

const app = express();

// Configuración de CORS para permitir Next.js (localhost:3000 y localhost:3001), móvil y herramientas de test
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origin (como apps móviles nativas, Postman, curl) o dentro de la lista
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);
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

// HU-10: Health Check para Render / Railway / Cloud monitoring
const healthCheckHandler = (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'unifind'
    }
  });
};

app.get('/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UniFind API v1 activa y lista para recibir peticiones',
    modules: [
      { prefix: '/api/v1/auth', description: 'Registro y autenticación' },
      { prefix: '/api/v1/items', description: 'Gestión y búsqueda de reportes de objetos' },
      { prefix: '/api/v1/categories', description: 'Catálogo y gestión de categorías de objetos' },
      { prefix: '/api/v1/chats', description: 'Canales de comunicación privados' },
      { prefix: '/api/v1/users', description: 'Usuarios y calificaciones de reputación' },
      { prefix: '/api/v1/analytics', description: 'Agregaciones analíticas y hotspots del campus' }
    ]
  });
});

// Montaje de rutas con prefijo de versión /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Manejo de ruta no encontrada (404)
app.use(notFoundHandler);

// Manejo centralizado de errores
app.use(errorHandler);

module.exports = app;

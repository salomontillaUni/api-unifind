require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Inicialización de la base de datos y arranque del servidor HTTP
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Servidor UniFind API ejecutándose en el puerto ${PORT}`);
      console.log(`📍 URL Base: http://localhost:${PORT}/api/v1`);
      console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });

    // Cierre limpio (Graceful shutdown)
    const gracefulShutdown = (signal) => {
      console.log(`\n[UniFind] Recibida señal ${signal}. Cerrando servidor HTTP limpiamente...`);
      server.close(() => {
        console.log('[UniFind] Servidor cerrado. Proceso finalizado.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error(`[UniFind] Error fatal al iniciar el servidor: ${error.message}`);
    process.exit(1);
  }
};

startServer();

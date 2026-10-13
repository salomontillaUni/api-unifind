const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unifind_db';
    const conn = await mongoose.connect(mongoUri);

    console.log(`[MongoDB] Conectado exitosamente: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Error en conexión a la base de datos: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Desconectado de la base de datos');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Error persistente: ${err.message}`);
});

module.exports = connectDB;

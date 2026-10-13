require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Item = require('./src/models/Item');
const Chat = require('./src/models/Chat');
const Message = require('./src/models/Message');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unifind_db';
    console.log(`[Seed] Conectando a MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Limpiando colecciones existentes...');
    await Promise.all([
      User.deleteMany({}),
      Item.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({})
    ]);

    console.log('[Seed] Insertando usuarios universitarios de prueba...');
    const USER_CARLOS_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10001');
    const USER_VALENTINA_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10002');
    const USER_ANDRES_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10003');

    const ITEM_CASIO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10001');
    const ITEM_CARNET_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10002');
    const ITEM_CUADERNO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10003');
    const ITEM_TERMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10004');
    const ITEM_CHAQUETA_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10005');

    const CHAT_DEMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000c10001');
    const MSG_DEMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000d10001');

    const users = await User.insertMany([
      {
        _id: USER_CARLOS_ID,
        fullName: 'Carlos Andrés Muñoz',
        institutionalEmail: 'carlos.munoz@uniautonoma.edu.co',
        studentCode: '2023-1001',
        phone: '3104567890',
        reputation: {
          returnedCount: 2,
          rating: 4.9
        }
      },
      {
        _id: USER_VALENTINA_ID,
        fullName: 'Valentina Gómez Restrepo',
        institutionalEmail: 'valentina.gomez@uniautonoma.edu.co',
        studentCode: '2022-2045',
        phone: '3157891234',
        reputation: {
          returnedCount: 0,
          rating: 5.0
        }
      },
      {
        _id: USER_ANDRES_ID,
        fullName: 'Andrés Felipe Salazar',
        institutionalEmail: 'andres.salazar@uniautonoma.edu.co',
        studentCode: '2021-3088',
        phone: '3189012345',
        reputation: {
          returnedCount: 1,
          rating: 5.0
        }
      }
    ]);

    const [carlos, valentina, andres] = users;

    console.log('[Seed] Insertando reportes polimórficos de objetos...');
    const items = await Item.insertMany([
      {
        _id: ITEM_CASIO_ID,
        title: 'Calculadora Científica Casio fx-991LAX',
        type: 'found',
        status: 'active',
        category: 'electronics',
        description: 'Calculadora científica gris con pantalla solar encontrada en una banca al finalizar clase de Física.',
        location: {
          campus: 'Sede Principal',
          building: 'Edificio B',
          specificArea: 'Salón 204'
        },
        attributes: {
          color: 'Gris oscuro',
          modelo: 'fx-991LAX',
          estadoFisico: 'Buen estado'
        },
        tags: ['calculadora', 'casio', 'ingenieria', 'electronica'],
        privacy: {
          isAnonymous: true,
          postedBy: carlos._id,
          claimQuestion: '¿De qué color es la tapa protectora y qué iniciales tiene grabadas?',
          claimAnswer: 'tapa azul con iniciales CM'
        }
      },
      {
        _id: ITEM_CARNET_ID,
        title: 'Carnet Estudiantil y Tarjeta Bancaria',
        type: 'lost',
        status: 'active',
        category: 'documents',
        description: 'Billetera pequeña con carnet institucional de Uniautónoma y tarjeta débito Bancolombia.',
        location: {
          campus: 'Sede Principal',
          building: 'Cafetería Central',
          specificArea: 'Mesa exterior cerca al quiosco'
        },
        attributes: {
          color: 'Negro',
          documento: 'Carnet estudiantil Uniautónoma'
        },
        tags: ['carnet', 'documentos', 'billetera', 'cafeteria'],
        privacy: {
          isAnonymous: false,
          postedBy: valentina._id,
          claimQuestion: '¿Cuál es el nombre completo y código del titular en el carnet?',
          claimAnswer: 'Valentina Gómez Restrepo 2022-2045'
        }
      },
      {
        _id: ITEM_CUADERNO_ID,
        title: 'Cuaderno argollado de Cálculo Integral',
        type: 'lost',
        status: 'active',
        category: 'documents',
        description: 'Cuaderno cuadriculado de 100 hojas con notas de las tres primeras semanas de clase.',
        location: {
          campus: 'Sede Principal',
          building: 'Biblioteca',
          specificArea: 'Sala de estudio piso 2'
        },
        attributes: {
          materia: 'Cálculo Integral',
          pasta: 'Azul con motivos geométricos'
        },
        tags: ['cuaderno', 'calculo', 'biblioteca'],
        privacy: {
          isAnonymous: false,
          postedBy: andres._id
        }
      },
      {
        _id: ITEM_TERMO_ID,
        title: 'Termo metálico azul tipo Stanley',
        type: 'lost',
        status: 'active',
        category: 'accessories',
        description: 'Termo térmico con sticker de desarrollo web extraviado en mesa de laboratorio.',
        location: {
          campus: 'Sede Principal',
          building: 'Edificio B',
          specificArea: 'Laboratorio de Química'
        },
        attributes: {
          capacidad: '750ml',
          color: 'Azul mate'
        },
        tags: ['termo', 'stanley', 'laboratorio', 'edificio b'],
        privacy: {
          isAnonymous: false,
          postedBy: valentina._id
        }
      },
      {
        _id: ITEM_CHAQUETA_ID,
        title: 'Chaqueta impermeable negra con capota',
        type: 'lost',
        status: 'active',
        category: 'clothing',
        description: 'Chaqueta deportiva negra talla M olvidada en el perchero del pasillo.',
        location: {
          campus: 'Sede Principal',
          building: 'Edificio B',
          specificArea: 'Pasillo tercer piso'
        },
        attributes: {
          talla: 'M',
          marca: 'Adidas'
        },
        tags: ['chaqueta', 'ropa', 'edificio b', 'pasillo'],
        privacy: {
          isAnonymous: false,
          postedBy: andres._id
        }
      }
    ]);

    const [calculadoraItem] = items;

    console.log('[Seed] Insertando conversación de prueba y mensajes iniciales...');
    const demoChat = await Chat.create({
      _id: CHAT_DEMO_ID,
      itemId: calculadoraItem._id,
      participants: [carlos._id, valentina._id],
      status: 'open',
      lastMessage: {
        senderId: valentina._id,
        text: 'Hola Carlos, creo que la calculadora que encontraste es la mía. Ya respondí la pregunta de comprobación.',
        sentAt: new Date()
      },
      unreadCount: {
        [carlos._id.toString()]: 1,
        [valentina._id.toString()]: 0
      }
    });

    await Message.create({
      _id: MSG_DEMO_ID,
      chatId: demoChat._id,
      senderId: valentina._id,
      content: 'Hola Carlos, creo que la calculadora que encontraste es la mía. Ya respondí la pregunta de comprobación.',
      attachments: [],
      sentAt: new Date()
    });

    console.log('====================================================');
    console.log('✅ Base de datos poblada exitosamente con datos reales:');
    console.log(`- Usuarios creados: ${users.length}`);
    console.log(`- Reportes de objetos: ${items.length}`);
    console.log(`- Chats inicializados: 1`);
    console.log('----------------------------------------------------');
    console.log('IDs de referencia para pruebas en Thunder Client:');
    console.log(`- Carlos (Finder anónimo):   ${carlos._id}`);
    console.log(`- Valentina (Claimant):      ${valentina._id}`);
    console.log(`- Andrés (Estudiante):       ${andres._id}`);
    console.log(`- Objeto con claimQuestion:  ${calculadoraItem._id}`);
    console.log(`- Chat de demostración:      ${demoChat._id}`);
    console.log('====================================================');

    await mongoose.disconnect();
    console.log('[Seed] Desconexión limpia de MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error al poblar base de datos: ${error.message}`);
    process.exit(1);
  }
};

seedData();

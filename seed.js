require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Item = require('./src/models/Item');
const Category = require('./src/models/Category');
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
      Category.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({})
    ]);

    console.log('[Seed] Insertando categorías oficiales del campus...');
    const categories = await Category.insertMany([
      {
        name: 'Tecnología',
        slug: 'tecnologia',
        icon: 'Laptop',
        description: 'Dispositivos electrónicos, calculadoras, cargadores y periféricos',
        isActive: true
      },
      {
        name: 'Documentos',
        slug: 'documentos',
        icon: 'FileText',
        description: 'Carnés institucionales, cédulas, tarjetas bancarias y documentos oficiales',
        isActive: true
      },
      {
        name: 'Ropa',
        slug: 'ropa',
        icon: 'Shirt',
        description: 'Prendas de vestir, chaquetas, suéteres, gorras y bufandas',
        isActive: true
      },
      {
        name: 'Llaves',
        slug: 'llaves',
        icon: 'Key',
        description: 'Llaveros, llaves de casillero, candados y residencias',
        isActive: true
      },
      {
        name: 'Académico',
        slug: 'academico',
        icon: 'BookOpen',
        description: 'Cuadernos, libros, carpetas, estuches y materiales de estudio',
        isActive: true
      }
    ]);

    console.log('[Seed] Insertando usuarios universitarios con roles y sistema de Puntos de Honor...');
    const USER_CARLOS_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10001');
    const USER_VALENTINA_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10002');
    const USER_ANDRES_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10003');
    const USER_ADMIN_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000a10004');

    const ITEM_CASIO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10001');
    const ITEM_CARNET_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10002');
    const ITEM_CUADERNO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10003');
    const ITEM_TERMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10004');
    const ITEM_CHAQUETA_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10005');
    const ITEM_AUDIFONOS_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000b10006');

    const CHAT_DEMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000c10001');
    const MSG_DEMO_ID = new mongoose.Types.ObjectId('670c1f1e1c9d440000d10001');

    const users = await User.insertMany([
      {
        _id: USER_CARLOS_ID,
        fullName: 'Carlos Andrés Muñoz',
        institutionalEmail: 'carlos.munoz@uniautonoma.edu.co',
        studentCode: '2023-1001',
        role: 'student',
        phone: '3104567890',
        reputation: {
          returnedCount: 2,
          rating: 4.9,
          honorPoints: 200,
          badges: ['Puntual', 'Custodio Confiable']
        }
      },
      {
        _id: USER_VALENTINA_ID,
        fullName: 'Valentina Gómez Restrepo',
        institutionalEmail: 'valentina.gomez@uniautonoma.edu.co',
        studentCode: '2022-2045',
        role: 'student',
        phone: '3157891234',
        reputation: {
          returnedCount: 0,
          rating: 5.0,
          honorPoints: 100,
          badges: ['Comunidad Solidaria']
        }
      },
      {
        _id: USER_ANDRES_ID,
        fullName: 'Andrés Felipe Salazar (Vigilancia)',
        institutionalEmail: 'andres.salazar@uniautonoma.edu.co',
        studentCode: 'GUARD-001',
        role: 'guard',
        phone: '3189012345',
        reputation: {
          returnedCount: 1,
          rating: 5.0,
          honorPoints: 150,
          badges: ['Honestidad UAC', 'Vigilante Oficial']
        }
      },
      {
        _id: USER_ADMIN_ID,
        fullName: 'Administrador del Sistema UniFind',
        institutionalEmail: 'admin.unifind@uniautonoma.edu.co',
        studentCode: 'ADMIN-001',
        role: 'admin',
        phone: '3001234567',
        reputation: {
          returnedCount: 10,
          rating: 5.0,
          honorPoints: 500,
          badges: ['Supervisión Campus', 'Administrador']
        }
      }
    ]);

    const [carlos, valentina, andres] = users;

    console.log('[Seed] Insertando reportes sincronizados con los flujos móviles de Portería y Dueño...');
    const items = await Item.insertMany([
      {
        _id: ITEM_CASIO_ID,
        code: 'UAC-8841',
        title: 'Calculadora Científica Casio fx-570ES',
        type: 'found',
        status: 'active',
        category: 'electronics',
        custodyType: 'PERSONAL',
        brandAndColor: 'Casio Gris Oscuro',
        photoUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500',
        images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500'],
        description: 'Calculadora científica gris con tapa protectora encontrada en el Laboratorio 201 después de clase.',
        location: {
          campus: 'Sede Principal',
          building: 'Edificio A',
          specificArea: 'Lab 201'
        },
        attributes: {
          color: 'Gris oscuro',
          modelo: 'fx-570ES Plus',
          estadoFisico: 'Excelente'
        },
        tags: ['calculadora', 'casio', 'ingenieria', 'laboratorio', 'electronica'],
        privacy: {
          isAnonymous: true,
          postedBy: carlos._id,
          claimQuestion: '¿Qué iniciales están grabadas en el reverso?',
          claimAnswer: 'CM'
        }
      },
      {
        _id: ITEM_TERMO_ID,
        code: 'UAC-4091',
        title: 'Termo metálico azul tipo Stanley',
        type: 'found',
        status: 'active',
        category: 'clothing',
        custodyType: 'PORTERIA',
        brandAndColor: 'Stanley Azul Mate',
        photoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500',
        images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=500'],
        description: 'Encontrado en Cafetería piso 1 bajo custodia PORTERIA.',
        location: {
          campus: 'Sede Principal',
          building: 'Edificio B',
          specificArea: 'Cafetería piso 1'
        },
        attributes: {
          capacidad: '750ml',
          color: 'Azul mate'
        },
        tags: ['termo', 'stanley', 'cafeteria', 'porteria'],
        privacy: {
          isAnonymous: false,
          postedBy: carlos._id,
          claimQuestion: '¿Qué sticker tiene pegado en la parte inferior?',
          claimAnswer: 'React Developer'
        },
        claimRecord: {
          claimantId: valentina._id,
          ownershipProofText: 'Termo azul que olvidé en la mesa de cafetería, tiene sticker de React Developer.',
          status: 'pending',
          deliveryToken: 'TICKET-4091-RET',
          claimedAt: new Date()
        }
      },
      {
        _id: ITEM_AUDIFONOS_ID,
        code: 'UAC-9933',
        title: 'Auriculares Inalámbricos Sony WH-1000XM4',
        type: 'found',
        status: 'active',
        category: 'electronics',
        custodyType: 'PORTERIA',
        brandAndColor: 'Sony Negro Mate',
        photoUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
        description: 'Encontrado en Biblioteca piso 2 bajo custodia PORTERIA.',
        location: {
          campus: 'Sede Principal',
          building: 'Biblioteca',
          specificArea: 'Sala de estudio piso 2'
        },
        attributes: {
          marca: 'Sony',
          modelo: 'WH-1000XM4'
        },
        tags: ['audifonos', 'sony', 'porteria', 'biblioteca'],
        privacy: {
          isAnonymous: false,
          postedBy: andres._id
        }
      },
      {
        _id: ITEM_CARNET_ID,
        code: 'UAC-2045',
        title: 'Carnet Estudiantil y Tarjeta Bancaria',
        type: 'lost',
        status: 'active',
        category: 'documents',
        custodyType: null,
        distinguishingMarks: 'Billetera con sticker de Ingeniería y firma institucional en el carnet',
        brandAndColor: 'Billetera cuero negro',
        photoUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500',
        images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=500'],
        description: 'Extraviado con señas: Billetera con sticker de Ingeniería y firma institucional en el carnet',
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
          postedBy: valentina._id
        }
      },
      {
        _id: ITEM_CUADERNO_ID,
        code: 'UAC-3088',
        title: 'Cuaderno argollado de Cálculo Integral',
        type: 'lost',
        status: 'active',
        category: 'documents',
        custodyType: null,
        distinguishingMarks: 'Sticker de Tux Linux en la portada y apuntes con tinta morada',
        brandAndColor: 'Cuaderno Norma Azul 100 hojas',
        photoUrl: '',
        images: [],
        description: 'Extraviado con señas: Sticker de Tux Linux en la portada y apuntes con tinta morada',
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
        _id: ITEM_CHAQUETA_ID,
        code: 'UAC-5512',
        title: 'Chaqueta impermeable negra con capota',
        type: 'lost',
        status: 'active',
        category: 'clothing',
        custodyType: null,
        distinguishingMarks: 'Cremallera roja y pequeño parche reflectivo en manga izquierda',
        brandAndColor: 'Adidas Negra Talla M',
        photoUrl: '',
        images: [],
        description: 'Extraviado con señas: Cremallera roja y pequeño parche reflectivo en manga izquierda',
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
        text: 'Hola Carlos, creo que la calculadora Casio es la mía. Ya respondí la pregunta de comprobación.',
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
      content: 'Hola Carlos, creo que la calculadora Casio es la mía. Ya respondí la pregunta de comprobación.',
      attachments: [],
      sentAt: new Date()
    });

    console.log('====================================================');
    console.log('✅ Base de datos poblada exitosamente para MVP Móvil y Panel Admin:');
    console.log(`- Categorías registradas: ${categories.length}`);
    console.log(`- Usuarios creados: ${users.length} (Estudiantes, Vigilante, Administrador)`);
    console.log(`- Reportes de objetos: ${items.length}`);
    console.log(`- Chats inicializados: 1`);
    console.log('----------------------------------------------------');
    console.log('IDs y Códigos de referencia:');
    console.log(`- Carlos Muñoz (Estudiante):        ${carlos._id}`);
    console.log(`- Valentina Gómez (Estudiante):     ${valentina._id}`);
    console.log(`- Andrés Salazar (Vigilancia):      ${andres._id}`);
    console.log(`- Admin Uniautónoma (Admin):        ${USER_ADMIN_ID}`);
    console.log(`- Calculadora Casio (PERSONAL):     ${calculadoraItem._id} (Código: UAC-8841)`);
    console.log(`- Termo Stanley (PORTERIA):         ${ITEM_TERMO_ID} (Código: UAC-4091)`);
    console.log(`- Audífonos Sony (PORTERIA):        ${ITEM_AUDIFONOS_ID} (Código: UAC-9933)`);
    console.log(`- Carnet Estudiantil (LOST):        ${ITEM_CARNET_ID} (Código: UAC-2045)`);
    console.log(`- Chat de demostración:             ${demoChat._id}`);
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

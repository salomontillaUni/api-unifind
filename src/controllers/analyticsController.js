const Item = require('../models/Item');

/**
 * @desc    Obtener zonas con mayor volumen de objetos extraviados (Hotspots) mediante Aggregation Pipeline
 * @route   GET /api/v1/analytics/hotspots
 * @access  Public
 */
const getHotspots = async (req, res, next) => {
  try {
    const { campus, limit = 5 } = req.query;
    const limitNumber = Math.max(1, parseInt(limit, 10) || 5);

    const matchStage = {
      type: 'lost'
    };

    if (campus) {
      matchStage['location.campus'] = { $regex: new RegExp(campus.trim(), 'i') };
    }

    const pipeline = [
      // 1. Filtrar únicamente los reportes de objetos perdidos
      {
        $match: matchStage
      },
      // 2. Agrupar por sede (campus) y edificio/bloque
      {
        $group: {
          _id: {
            campus: '$location.campus',
            building: '$location.building'
          },
          totalLostItems: { $sum: 1 },
          categories: { $addToSet: '$category' },
          mostRecentIncident: { $max: '$createdAt' },
          sampleReports: {
            $push: {
              id: '$_id',
              title: '$title',
              category: '$category',
              specificArea: '$location.specificArea',
              status: '$status'
            }
          }
        }
      },
      // 3. Ordenar descendentemente por la cantidad de objetos perdidos
      {
        $sort: {
          totalLostItems: -1
        }
      },
      // 4. Limitar a los N puntos críticos más vulnerables
      {
        $limit: limitNumber
      },
      // 5. Proyectar resultado con nombres claros para presentación ejecutiva
      {
        $project: {
          _id: 0,
          campus: '$_id.campus',
          building: '$_id.building',
          totalLostItems: 1,
          categories: 1,
          mostRecentIncident: 1,
          sampleReports: { $slice: ['$sampleReports', 2] }
        }
      }
    ];

    const hotspots = await Item.aggregate(pipeline);

    // Conteo global de objetos perdidos para contexto estadístico
    const totalLostCount = await Item.countDocuments({ type: 'lost' });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Zonas críticas (Hotspots) de pérdida en el campus obtenidas exitosamente',
      summary: {
        totalGlobalLostItems: totalLostCount,
        hotspotsIdentified: hotspots.length
      },
      data: hotspots
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHotspots
};

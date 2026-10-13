const express = require('express');
const router = express.Router();
const { getHotspots } = require('../controllers/analyticsController');

// Endpoint 10: Aggregation Pipeline de Hotspots de pérdida en el campus
router.get('/hotspots', getHotspots);

module.exports = router;

exports.computeChartArea = function(computedCSV) {
  // Use reduceColumns with grouping — single server-side pass instead of
  // filter + aggregate_sum per year (avoids O(n*years) server operations)
  var grouped = computedCSV.reduceColumns({
    selectors: ['year', 'value'],
    reducer: ee.Reducer.sum().group({
      groupField: 0,
      groupName: 'year'
    })
  });
  var groups = ee.List(grouped.get('groups'));
  var features = ee.FeatureCollection(groups.map(function(g) {
    g = ee.Dictionary(g);
    return ee.Feature(null, {
      'periodo': g.get('year'),
      'Área SHAC': g.get('sum')
    });
  }));

  var mean = features.aggregate_mean('Área SHAC');
  var csvConArea = features.map(function(f){
    return f.set('Promedio', mean);
  });
  
  
  return csvConArea;
};


// 3. Función exportada
exports.chartArea = function(selectedSHAC,tablaArea) {
  
  
  // Batch min/max into a single server call (saves one HTTP round-trip)
  var stats = ee.List([
    tablaArea.aggregate_min('Área SHAC'),
    tablaArea.aggregate_max('Área SHAC')
  ]).getInfo();
  var minValue = stats[0];
  var maxValue = stats[1];
  var center = (maxValue + minValue) / 2;
  

  
  var chart = ui.Chart.feature.byFeature({
    features: tablaArea,
    xProperty: 'periodo',
    yProperties: ['Área SHAC', 'Promedio']
  })
  .setChartType('ComboChart')
  .setSeriesNames(['Área SHAC', 'Promedio'])
  .setOptions({
    title: 'Área (ha) por Temporada — ' + selectedSHAC,
    hAxis: {
      title: 'Temporada',
      format: 'yyyy',
    },
    vAxis: {
      title: 'Área (ha)',
      viewWindow: {
        min: 0,
        max: center + (maxValue - minValue)
      }
    },
    seriesType: 'line',  // default type
    series: {
      0: {type: 'bars', color: '2656a3'},  // first series as bar
      1: {color: 'red', lineDashStyle: [7, 4], pointSize: 0}  // second series as dashed line
    },
    lineWidth: 2,
    pointSize: 4
  });

  


  
  // 3.4 Devuelve la tabla por si quieres procesarla
  return chart;
};

exports.computeCSV = function(csv, selectedSHAC){
  
  // selectedSHAC puede ser el ID (ej: "SHAC_260") o string vacío para "Todos los SHACs"
  // Buscar por ID en el CSV. Si está vacío, buscar por SHAC_ID vacío o null
  var selectedFeature;
  if (selectedSHAC === '' || selectedSHAC === null) {
    // Para "Todos los SHACs", buscar donde SHAC_ID está vacío o es null
    selectedFeature = csv.filter(ee.Filter.or(
      ee.Filter.eq('SHAC_ID', ''),
      ee.Filter.eq('SHAC_ID', null)
    )).first();
  } else {
    // Buscar por ID específico
    selectedFeature = csv.filter(ee.Filter.eq('SHAC_ID', selectedSHAC)).first();
  }
  
  // Step 1: Get lists
  var clase = ee.List(selectedFeature.get('CLASE'));
  var temp = ee.List(selectedFeature.get('Temp'));

  var paired = temp.zip(clase);  // [['2021-2022', 0.7], ['2019-2020', 0.4], ...]
 
 
  // Step 2: Flatten into one Feature per pair
  var flatList = paired.map(function(pair) {
    pair = ee.List(pair);
    var year = pair.get(0);
    var dict = ee.Dictionary(pair.get(1));
    var keys = dict.keys();
  
    // Return a list of features, one per key
    return keys.map(function(k) {
      var clase = ee.String(k);
      var value = ee.Number(dict.get(clase));
      return ee.Feature(null, {
        year: year,
        Clase: clase,
        value: value
      });
    });
  }).flatten();  // Flatten list of lists
  
  var chartFeatures = ee.FeatureCollection(flatList);
  
  chartFeatures = chartFeatures.map(function(f) {
    var periodo = ee.String(f.get('year'));
    var yearStart = ee.Number.parse(periodo.split('_').get(0));  // Extracts "2021" from "2021_2022"
    return f.set('yearStart', yearStart);
  });
  
  return chartFeatures.sort('yearStart');
};



exports.chartUsoSuelo = function(chartFeatures, shacName){
  var excludedClases = [
    'AREAS ARTIFICIALES',
    'AREAS DESPROVISTAS DE VEGETACION',
    'CUERPOS DE AGUA',
    'NIEVES Y GLACIARES'
  ]; 
  
  var chartFeaturesFiltered = chartFeatures.filter(ee.Filter.inList('Clase', excludedClases).not());
  
  // Construir el título con el nombre del SHAC
  var title = 'Superficie regada por uso de suelo por año';
  if (shacName) {
    title = title + ' — ' + shacName;
  }
  
  return ui.Chart.feature.groups({
    features: chartFeaturesFiltered,
    xProperty: 'year',
    yProperty: 'value',
    seriesProperty: 'Clase'
  })
  .setChartType('ColumnChart')
  .setOptions({
    title: title,
    hAxis: {title: 'Temporada'},
    vAxis: {title: 'Superficie regada (Ha)'},
    legend: {position: 'right', maxLines: 3},
    isStacked: false
  });
};




//Second row of charts 
exports.computeGlobalUsoSuelo = function(uso_suelo){
  // Compute area per feature (required for geometry-based area calculation)
  uso_suelo = uso_suelo.map(function(feature){
    var areaHa = feature.geometry().area().divide(10000);  // Area in hectares
    return feature.set('area_ha', areaHa);
  });
  
  // Group by class using reduceColumns — single server-side pass instead of
  // distinct + filter-per-class + aggregate_sum (avoids O(n*classes) operations)
  var grouped = uso_suelo.reduceColumns({
    selectors: ['clase', 'area_ha'],
    reducer: ee.Reducer.sum().group({
      groupField: 0,
      groupName: 'clase'
    })
  });
  var groups = ee.List(grouped.get('groups'));
  var areasByClass = ee.FeatureCollection(groups.map(function(g) {
    g = ee.Dictionary(g);
    return ee.Feature(null, {
      property_value: g.get('clase'),
      total_area_ha: g.get('sum')
    });
  }));
  return areasByClass;
};




exports.chartGlobalUsoSuelo = function(tablaUsoSuelo){
  
  
  return ui.Chart.feature.byFeature({
    features: tablaUsoSuelo,
    xProperty: 'property_value',
    yProperties: ['total_area_ha']
  })
  .setChartType('PieChart')
  .setOptions({
    title: 'Área (ha) por Uso de suelo para la región ',
    vAxis: { title: 'Área (ha)' },
    legend: { position: 'top-left' }
  });
  
};






exports.computeGlobalRegada = function(csv, region, uso_suelo){
  var totalSurface = ee.Number(region.geometry().area().divide(10000));
  
  
  var globalRegada = csv.map(function(feature){
  
  
  //Transform the lists in proper features
  // Step 1: Get lists
  var clase = ee.List(feature.get('CLASE'));
  var temp = ee.List(feature.get('Temp'));

  var paired = temp.zip(clase);  // [['2021-2022', 0.7], ['2019-2020', 0.4], ...]
 
 
  // Step 2: Flatten into one Feature per pair
  var flatList = paired.map(function(pair) {
    pair = ee.List(pair);
    var year = pair.get(0);
    var dict = ee.Dictionary(pair.get(1));
    var keys = dict.keys();
  
    // Return a list of features, one per key
    return keys.map(function(k) {
      var clase = ee.String(k);
      var value = ee.Number(dict.get(clase));
      return ee.Feature(null, {
        year: year,
        Clase: clase,
        value: value
      });
    });
  }).flatten();  // Flatten list of lists
  
  var chartFeatures = ee.FeatureCollection(flatList);
  
  
  return chartFeatures;
  }).flatten();
  
  
  
  // Irrigated surface
  var grouped = globalRegada.reduceColumns({
    selectors: ['year', 'value'],
    reducer: ee.Reducer.sum().group({
      groupField: 0,
      groupName: 'year'
    })
  });
  var groups = ee.List(grouped.get('groups'));
  var irrigatedSurface = ee.FeatureCollection(groups.map(function(g) {
    g = ee.Dictionary(g);
    return ee.Feature(null, {
      'year': g.get('year'),
      'area': ee.Number(g.get('sum')),
      'type': 'irrigated'
    });
  }));
  
  // Snow Surface
  var snowFeature = uso_suelo.filter(ee.Filter.eq('CLASE', 'NIEVES Y GLACIARES'));
  var snowSurface = ee.Number(snowFeature.geometry().area().divide(10000));
  
  // Pre-compute constant snow percentage outside the map (same for every year)
  var snowPercent = snowSurface.divide(totalSurface).multiply(10000).round().divide(100);
  
  // Compute per-year percentages
  var resultFC = irrigatedSurface.map(function(feature){
    var irrigated = ee.Number(feature.get('area')).divide(totalSurface).multiply(10000).round().divide(100);
    var year = feature.get('year');
    var other = ee.Number.expression(
      "100 - snow - irrigated ", {
      irrigated: irrigated,
      snow: snowPercent
    });
    return ee.Feature(null,{
      year: year,
      Nieve: snowPercent,
      Regada: irrigated,
      Otros: other
    });
  });
  return resultFC;
  
};




exports.chartIrrigated = function(resultFC){

  
  return ui.Chart.feature.byFeature({
    features: resultFC,
    xProperty: 'year',
    yProperties: ['Regada', 'Nieve', 'Otros']
  })
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Distribución según tipo de superficie para la región',
    isStacked: 'true',
    hAxis: {title: 'Temporada'},
    vAxis: {
      format: '#\'%\'',
      minValue: 0,
      maxValue: 100
    }
  })
  ;
  
  
};








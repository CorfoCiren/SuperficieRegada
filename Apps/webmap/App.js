
/*******************************************************************************
 * Modulos *
 * Import all the modules from other scripts
 ******************************************************************************/
var startTime = new Date().getTime();

var ImgClass = require('users/corfobbppciren2024/App_SR_User:Img_collection'); 
var catClass = require('users/corfobbppciren2024/App_SR_User:CatastroFruticola'); 
var usoClass = require('users/corfobbppciren2024/App_SR_User:usoSuelo'); 
var init = require('users/corfobbppciren2024/App_SR_User:inicio');
var ShacClass = require('users/corfobbppciren2024/App_SR_User:Shacs'); 
var leyenda = require('users/corfobbppciren2024/App_SR_User:Leyenda');
var chartUtils = require('users/corfobbppciren2024/App_SR_User:chartUtils');
var s = require('users/corfobbppciren2024/App_SR_User:Style').styles; 

var region = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/Coquimbo");
var shac_layer = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/SHACs_IV_Region_MOD");
var uso_suelo = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Uso_de_Suelo/cut_Coquimbo_2021");
var Rcat_frut = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Catastro_Fruticola/Catastro_Fruticola_2024");

var valparaisoComunas = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/ComunasValparaiso");
var cat_frut = Rcat_frut.style(s.catFrutStyle);


var c = {}; // Define a JSON object for storing UI components.
var disp_year = init.getTemp();
var disp_year_hist = init.getTempHist();
var exceptions = init.getExceptions();
var claves = Object.keys(exceptions);
var maxLengthExceptions = init.getMaxLength();
var shac_names = init.shac_names.sort().getInfo();
var listAssets  = init.listAsset;
var shacCodeToPeriods = init.getShacCodeToPeriods();
var shacAssetIndex = init.getShacAssetIndex();
var basePath = init.getBasePath();

var tablaArea = null; //tabla para almacenar estadisticas por SHAC
var ClaseStyles = init.ClaseStyles;
uso_suelo = uso_suelo.map(function(feature) {
  return feature.set('style', ClaseStyles.get(feature.get('clase')));
});

var styledUsoSuelo = uso_suelo.style({
  styleProperty: 'style',
});



/*******************************************************************************
 * Funciones internas *
 * 
 * Una sección para definir las funciones que se utilizaran internamente
 ******************************************************************************/

// Función helper para normalizar el nombre del SHAC (reutilizable)
function normalizeSHACName(selectedSHAC) {
  if (!selectedSHAC) return null;
  return selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_');
}

// Función helper para obtener el código del SHAC (reutilizable)
function getSHACCode(selectedSHAC) {
  var shpSHAC = normalizeSHACName(selectedSHAC);
  if (!shpSHAC) return null;
  return ImgClass.SHAC_Dict[shpSHAC];
}

// Función helper para formatear temporada para display (guión bajo -> guión)
function formatSeasonForDisplay(season) {
  if (!season) return '';
  return season.replace(/_/g, '-');
}

// Función helper para formatear SHAC para display (guión bajo -> espacios)
function formatSHACForDisplay(shacName) {
  if (!shacName) return '';
  return shacName.replace(/_/g, ' ');
}

// Función helper para agregar capas de superficie regada (evita duplicación)
function addSurfaceRegadaLayers(newlink, selectedBand, styleType, layerOffset, labelOffset, c, s) {
  if(newlink.length > 0){
    for(var i = 0; i < newlink.length; i++){
      //1. Agregar layer
      var styledFC = newlink[i].style(s.seasonStyles[styleType]);
      // Si hay múltiples capas (excepciones), agregar número, sino solo la temporada
      var displayBand = formatSeasonForDisplay(selectedBand);
      var layerName = newlink.length > 1 
        ? 'Superficie regada ' + displayBand + ' (' + (i + 1) + ')'
        : 'Superficie regada ' + displayBand;
      var layer = ui.Map.Layer(styledFC, {}, layerName);
      c.map.layers().insert(i + layerOffset, layer);
        
      //2. Editar labels
      var downloadUrlKML = newlink[i].getDownloadURL({format: 'kml'});
      c.downloadBand.kmlLabel[i + labelOffset].setValue('Descarga KML capa ' + styleType.replace('selector', '') + ' ('+ (i+1) +'/' + newlink.length+')');
      c.downloadBand.kmlLabel[i + labelOffset].setUrl(downloadUrlKML);
      c.downloadBand.kmlLabel[i + labelOffset].style().set(s.ableLabel);
      
      var downloadUrlGeo = newlink[i].getDownloadURL({format: 'geojson'});
      c.downloadBand.gjsonLabel[i + labelOffset].setValue('Descarga GeoJSON capa ' + styleType.replace('selector', '') + ' ('+ (i+1) +'/' + newlink.length+')');
      c.downloadBand.gjsonLabel[i + labelOffset].setUrl(downloadUrlGeo);
      c.downloadBand.gjsonLabel[i + labelOffset].style().set(s.ableLabel);
    }
    
    c.downloadBand.title.setValue('Descargar Superficie Regada');
    c.downloadBand.title.style().set(s.widgetTitle);
    c.downloadBand.info.setValue('Descarga de la superficie regada de la zona seleccionada en formato KML o GeoJSON según el año');
    c.downloadBand.info.style().set(s.aboutText);
    c.historica.boton.setDisabled(false);
  }
}

function layerExists(layers, layerName) {
  var exists = false;
  layers.forEach(function(layer) {
    if (layer.getName() === layerName) {  // Comprobar si el nombre coincide
      exists = true;
      
    }
  });
  
  return exists;
}

function layerVisible(layers, layerName) {
  var exists = false;
  layers.forEach(function(layer) {
    if (layer.getName() === layerName && layer.getShown()) {  // Comprobar si el nombre coincide y esta visible
      exists = true;
      
    }
  });

  return exists;
}

/*******************************************************************************
 * Components *
 * 
 * A section to define the widgets that will compose your app.
 * 
 * Guidelines:
 * 1. Except for static text and constraints, accept default values;
 *    initialize them in the initialization section.
 * 2. Limit composition of widgets to those belonging to an inseparable unit
 *    (i.e. a group of widgets that would make no sense out of order). 
 ******************************************************************************/

// Licencias
c.licencias = {};
c.licencias.copernicus = ui.Label(
  'Los datos de Sentinel-2 y Sentinel-1 son proporcionados por el programa Copernicus' 
  +'de la Unión Europea y procesados por la Agencia Espacial Europea (ESA).' +
'Fuente: Copernicus Open Access Hub (https://scihub.copernicus.eu/).');
c.licencias.nasa = ui.Label(
  'Los datos del modelo digital de elevación (NASADEM) son proporcionados por la NASA.'+
'Fuente: NASA Earth Science Division (https://earthdata.nasa.gov/).');
c.licencias.chirps = ui.Label(
  'Los datos de precipitación CHIRPS son proporcionados por el Climate Hazards Group' +
  'de la Universidad de California en Santa Bárbara (UCSB).'+
'Fuente: UCSB-CHG (https://www.chc.ucsb.edu/data/chirps).');

var panelLicencias = ui.Panel([
  c.licencias.copernicus,
  c.licencias.nasa,
  c.licencias.chirps
]);

// Define a control panel for user input.
c.controlPanel = ui.Panel();

// Define a series of panel widgets to be used as horizontal dividers.
c.dividers = {};
c.dividers.divider1 = ui.Panel();
c.dividers.divider2 = ui.Panel();
c.dividers.divider3 = ui.Panel();
c.dividers.divider4 = ui.Panel();
c.dividers.divider5 = ui.Panel();
// Define the main interactive map.
c.map = ui.Map();
c.map.setOptions("ROADMAP");

// Define an app info widget group.
c.info = {};
c.info.titleLabel = ui.Label('Superficie Regada');
c.info.aboutLabel = ui.Label(
  'Mapa de superficie regada por unidad SHAC para las temporadas recientes de la región. Para consultar la información asociada a un punto de interés, simplemente haga clic sobre el mapa. Para acceder a más detalles o explorar distintas unidades SHAC, utilice los botones disponibles en el panel lateral.');
c.info.paperLabel = ui.Label({
  value: 'Repositorio GitHub',
  targetUrl: 'https://github.com/jvaldiviesob/Humedad_de_Suelo'
});
c.info.websiteLabel = ui.Label({
  value: 'Publicación de referencia',
  targetUrl: 'https://www.nature.com/articles/s41597-023-02011-7'
});
c.info.panel = ui.Panel([
  c.info.titleLabel, c.info.aboutLabel,
  //c.info.paperLabel, c.info.websiteLabel
]);

//posicion capas: [REGION, SHAC, SR|FRUT|SUELO]


//region
var styled_region = region.style(s.visParams_region);
var layer_region = ui.Map.Layer(styled_region, {}, 'Región de Coquimbo');
c.map.layers().add(layer_region); //queda en posicion 1

// Chart bar 
//var periodo = '2019_2020';
//tablaArea = shac_names.map(function(shac){
//  var shpSHAC = shac.replace(/\s*-\s*/g, ' ').split(' ').join('');
//  var assetId = basePath + periodo + "_SHAC_" + shpSHAC;
//  var fc = ee.FeatureCollection(assetId);
//  var areaHa = ee.Number(fc.geometry().area()).divide(10000);
//}); 

// Define a data year selector widget group.
c.selectSHAC = {};
c.selectSHAC.warning = ui.Label('', {
  color: 'red',
  fontSize: '12px'
});
c.selectSHAC.label = ui.Label('Resultados Modelo de Superficie Regada');
c.selectSHAC.aboutText = ui.Label('Los enlaces para descargar los archivos se encuentran al final de este panel, por favor desplácese hacia abajo.');
c.selectSHAC.aboutText.style().set('shown', false); // Ocultar inicialmente
c.selectSHAC.selector = ui.Select({
  items: shac_names,
  placeholder: 'Seleccione un SHAC',
  onChange: function(selectedSHAC) {
    c.selectSHAC.warning.setValue('');

    // 0. Reiniciar etiquetas 
    resetLabels();
    
    // Ocultar mensaje sobre enlaces de descarga cuando se cambia el SHAC
    c.selectSHAC.aboutText.style().set('shown', false);
    
    if(selectedSHAC){
      // 1. Reiniciar el selector de Band
      c.selectBand.selector1.setValue(null);
      c.selectBand.selector1.setDisabled(true);
      c.selectBand.selector2.setValue(null);
      c.selectBand.selector2.setDisabled(true);
      
      c.historica.selector.setDisabled(false);
      c.historica.selector.setValue(null);
      
      // 2. Eliminar capas highlighted y de Superficie Regada
      var layers = c.map.layers();
      for (var i = 0; i < layers.length(); i++) {
        var layer = layers.get(i);
        var layerName = layer.getName();
        
        if (layerName.indexOf('Superficie regada') !== -1) {
          c.map.remove(layer);
          i--;
        }
        if (layerName === 'SHAC seleccionado') {
          c.map.remove(layer);
          break;
        }
      }
      // 3. Zoom hacia SHAC y habilitar temporada
      var catFrutExist = layerExists(layers, 'Catastro Frutícola');
      var usExist = layerExists(layers, 'Uso de Suelo');
      var catFrutVis = layerVisible(layers, 'Catastro Frutícola');
      var usVis = layerVisible(layers, 'Uso de Suelo');
      if (selectedSHAC) {
          if(catFrutVis || usVis){
            c.selectSHAC.warning.setValue('Para mejor visualización de la superficie regada quite la(s) capa(s) de Uso de Suelo y/o Catastro Frutiícola');
          }
        // Zoom hacia el SHAC
        ShacClass.zoomSHAC(selectedSHAC, shac_layer, c.map);
        // Habilitar el selector de Band si hay un SHAC seleccionado
        c.selectBand.selector1.setDisabled(false);
        c.selectBand.selector2.setDisabled(false);
      }
      
      // 4. Reiniciar sup regada historica
      c.historica.boton.setDisabled(true);
      c.historica.boton.setLabel('Agregar sup. regada historica');
      
      // 5. Use pre-computed index for instant client-side lookup (no server round-trip)
      var shpSHAC = selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_');
      var shacCode = ImgClass.SHAC_Dict[shpSHAC];
      var codeNum = shacCode ? shacCode.replace('SHAC_', '') : null;
      var generatedYears = codeNum ? (shacCodeToPeriods[codeNum] || []) : [];
      
      // 6. Estadisticas y gráfico de sup. regada por temporada
      if (generatedYears.length > 0) {
        var periodsMap = shacAssetIndex[codeNum] || {};
        var featuresConArea = generatedYears.map(function(periodo) {
          var assetPaths = periodsMap[periodo] || [];
          if (assetPaths.length === 1) {
            return ee.Feature(null, {
              periodo: periodo,
              area_ha: ee.Number(ee.FeatureCollection(assetPaths[0]).geometry().area()).divide(10000)
            });
          }
          var merged = ee.FeatureCollection(assetPaths[0]);
          for (var j = 1; j < assetPaths.length; j++) {
            merged = merged.merge(ee.FeatureCollection(assetPaths[j]));
          }
          return ee.Feature(null, {
            periodo: periodo,
            area_ha: ee.Number(merged.geometry().area()).divide(10000)
          });
        });
        tablaArea = ee.FeatureCollection(featuresConArea);

        var newChart = chartUtils.chartArea(shpSHAC, tablaArea);
        try {
          if (newChart && typeof newChart.setOptions === 'function') {
            newChart.style().set(s.styleChartArea);
          }
        } catch (e) {}
        c.chart.container.widgets().reset([newChart]);
        c.chart.chartPanel.style().set('shown', true);
      } else {
        c.chart.chartPanel.style().set('shown', false);
      }
  
    }
  }
});

c.selectSHAC.panel = ui.Panel([c.selectSHAC.label, c.selectSHAC.aboutText, c.selectSHAC.selector]);



c.chart = {};
c.chart.shownButton = ui.Button({ 
  label: 'Ocultar gráfico', 
  onClick: function() { 
    chartUtils.showHideChart(c); 
  } });
  
c.chart.container = ui.Panel();  
c.chart.chartPanel = ui.Panel([c.chart.shownButton, c.chart.container]);


// Definir grupo de descarga para SR
c.downloadBand = {}; //Etiqueta de descarga que se actualizará dinámicamente
c.downloadBand.title = ui.Label('');
c.downloadBand.info = ui.Label('');

//Cantidad de ui.Label a agregar es dinamica segun el tamano de los valores de las listas
//del diccionario exceptions.
c.downloadBand.kmlLabel = [ui.Label('')]; 

for (var i = 0; i < maxLengthExceptions + 1; i++) {
  c.downloadBand.kmlLabel.push(ui.Label('')); // Agregar un nuevo ui.Label a la lista
}

c.downloadBand.gjsonLabel = [ui.Label('')];
for (var i = 0; i < maxLengthExceptions + 1; i++) {
  c.downloadBand.gjsonLabel.push(ui.Label('')); // Agregar un nuevo ui.Label a la lista
}


/*
//Cantidad de ui.Label a agregar es dinamica segun el tamano de los valores de las listas
//del diccionario exceptions.
c.downloadBand.kmlLabel = []; 
for (var i = 0; i < disp_year.length *(maxLengthExceptions + 1); i++) {
  c.downloadBand.kmlLabel.push(ui.Label('')); // Agregar un nuevo ui.Label a la lista
  c.downloadBand.kmlLabel[i].style().set(s.disableLabel);
}


c.downloadBand.gjsonLabel = [];
for (var i = 0; i < disp_year.length *(maxLengthExceptions + 1); i++) {
  c.downloadBand.gjsonLabel.push(ui.Label('')); // Agregar un nuevo ui.Label a la lista
  c.downloadBand.gjsonLabel[i].style().set(s.disableLabel);
}

var indice_season_dict = {};
for (var i=0; i < disp_year.length; i++){
  indice_season_dict[disp_year[i]] = i;
}*/


// Define a data band selector widget group.
c.selectSHAC.aboutLabel = ui.Label(
  'Puede seleccionar una temporada para comparar' );
c.selectBand = {};

c.selectBand.selector1 = ui.Select({
  items: disp_year,
  placeholder: 'Seleccione una temporada',
  onChange: function(selectedBand) {
    var selectedSHAC = c.selectSHAC.selector.getValue();
    if (selectedBand) {

      // 0. Reiniciar etiquetas
      resetLabels();
      var newlink = ImgClass.collection(basePath, selectedSHAC, selectedBand,exceptions,claves,c,s,shacAssetIndex);
      var layer2 = c.map.layers().get(2);
      if(layer2){
        if(layer2.getName() === 'SHAC seleccionado') {
          c.map.layers().remove(layer2);
      }}
      
      if(newlink.length > 0){
        addSurfaceRegadaLayers(newlink, selectedBand, 'selector1', 3, 0, c, s);
        // Mostrar el mensaje sobre los enlaces de descarga
        c.selectSHAC.aboutText.style().set('shown', true);
      } else {
        c.selectSHAC.warning.setValue('No existe imagen para la selección');
      }
      }  
    }
});


c.selectBand.selector2 = ui.Select({
  items: disp_year,
  placeholder: 'Seleccione una temporada',
  onChange: function(selectedBand) {
    var selectedSHAC = c.selectSHAC.selector.getValue();
    if (selectedBand) {

      // 0. Reiniciar etiquetas
      resetLabels();
      var newlink = ImgClass.collection(basePath, selectedSHAC, selectedBand,exceptions,claves,c,s,shacAssetIndex);
      var layer2 = c.map.layers().get(2);
      if(layer2){
        if(layer2.getName() === 'SHAC seleccionado') {
          c.map.layers().remove(layer2);
      }}
      
      if(newlink.length > 0){
        addSurfaceRegadaLayers(newlink, selectedBand, 'selector2', 4, 1, c, s);
        // Mostrar el mensaje sobre los enlaces de descarga
        c.selectSHAC.aboutText.style().set('shown', true);
      } else {
        c.selectSHAC.warning.setValue('No existe imagen para la selección');
      }
      }  
    }
});







c.selectBand.panel = ui.Panel([ c.selectBand.selector1, c.selectBand.selector2]);
c.downloadBand.panel = ui.Panel([
  c.downloadBand.title,
  c.downloadBand.kmlLabel[0],
  c.downloadBand.gjsonLabel[0], // Agregar etiquetas de GeoJSON,
  c.downloadBand.kmlLabel[1],
  c.downloadBand.gjsonLabel[1]
]);



/*
c.downloadBand.panel = ui.Panel([
  c.downloadBand.title,
  c.downloadBand.info
]);

for(i=0; i < c.downloadBand.gjsonLabel.length; i++){
  c.downloadBand.panel.add(c.downloadBand.gjsonLabel[i]);
  c.downloadBand.panel.add(c.downloadBand.kmlLabel[i]);
}




c.checkboxesBand = {};
c.checkboxesBand.label = ui.Label('Seleccione una temporada :');
c.checkboxesBand.panel = ui.Panel([c.checkboxesBand.label]);
c.checkboxesBand.legend = leyenda.createBandsLegend(disp_year);

c.checkboxesBand.selectors = disp_year.map(function(season) { 
  var checkbox = ui.Checkbox({
    label: season,
    disabled: true,
    onChange: function(bool) {
      var selectedSHAC = c.selectSHAC.selector.getValue();
      
      // 1. Removing the layer showing the area
      var layer2 = c.map.layers().get(2);
      if(layer2){
        if(layer2.getName() === 'SHAC seleccionado') {
          c.map.layers().remove(layer2);
      }}
      
      
      // 2. If the checkbox was clicked
      if(bool === true){
        var layerCreated = false;
        
        //2.1 If the layer already exists
        c.map.layers().map(function(layer){
          if(layer.getName() === 'Superficie regada ' + season){
            layer.setShown(true);
            layerCreated = true;
          }
        });
        
        if(layerCreated === false){
          var newlink = ImgClass.collection(basePath, selectedSHAC, season, exceptions,claves,c,s);
          if(newlink.length > 0){
            for(var i = 0; i < newlink.length; i++){
              //2.1.A Agregar layer
              var style = s.c.selectBand.selector[season];
              
              var styledVector = newlink[i].style(style);
              
              var layer = ui.Map.Layer(styledVector, {}, 'Superficie regada ' + season);
              c.map.layers().set(c.map.layers().length() + 2 , layer);
              
              //2.1.B Editar labels
              var indice_season = (i+1) * indice_season_dict[season];
              
              var downloadUrlKML = newlink[i].getDownloadURL({format: 'kml'});
              c.downloadBand.kmlLabel[indice_season].setValue('Descarga KML ' + season + ' ('+ (i+1) +'/' + newlink.length+')');
              c.downloadBand.kmlLabel[indice_season].setUrl(downloadUrlKML);
              c.downloadBand.kmlLabel[indice_season].style().set(s.ableLabel);
              
              var downloadUrlGeo = newlink[i].getDownloadURL({format: 'geojson'});
              c.downloadBand.gjsonLabel[indice_season].setValue('Descarga GeoJSON ' + season + ' (' + (i+1) +'/' + newlink.length+')');
              c.downloadBand.gjsonLabel[indice_season].setUrl(downloadUrlGeo);
              c.downloadBand.gjsonLabel[indice_season].style().set(s.ableLabel);
              
              c.downloadBand.title.setValue('Descargar Superficie Regada');
              c.downloadBand.title.style().set(s.widgetTitle);
              c.downloadBand.info.setValue('Descarga de la superficie regada de la zona seleccionada en formato KML o GeoJSON según el año');
              c.downloadBand.info.style().set(s.aboutText);
              
              //2.2 Show the legend
              c.checkboxesBand.legend.style().set('shown', true);
              
              
              
            }
          }
          
        }
        
      }
      
      
      if(bool === false){
        c.map.layers().map(function(layer){
          if(layer.getName() === 'Superficie regada ' + season){
            layer.setShown(false);
          }
        });
      }
      
      
    }
  });
  
  c.checkboxesBand.panel.add(checkbox);
  return checkbox;
  
});

*/

//MODULO PARA AGREGAR CAPAS HISTORICAS


var visParamsHist = {
  color: '00FF00', // Verde
};

c.historica = {};
c.historica.warning = ui.Label('', {
  color: 'red',
  fontSize: '12px'
});
c.historica.titleLabel = ui.Label('Superficie Regada Histórica');
c.historica.info = ui.Label('Información desarrollada por CIREN' +
' a partir de información satelital y encuestas en terreno. '+
'Debe seleccionar un SHAC para comenzar. Disponible hasta la temporada 2022_2023');
c.historica.selector = ui.Select({
  items: disp_year_hist,
  disabled: true,
  placeholder: 'Seleccione una temporada',
  onChange: function(selectedBand) {
    c.selectSHAC.warning.setValue('');
    c.historica.boton.setLabel('Agregar sup. regada historica');
        var layers = c.map.layers();
      for (var j = layers.length() - 1; j >= 0; j--) {
        var layerU = layers.get(j);
        
        if (layerU.getName() ==='Superficie regada histórica') {
          layers.remove(layerU); // Eliminar la capa
        }
      }
      
      
      c.historica.boton.setDisabled(false);
  }
});
c.historica.boton = ui.Button({
  label: 'Agregar sup. regada historica',
  disabled: true,
  onClick: function () {
    var currentLabel = c.historica.boton.getLabel();
    var selectedSHAC = c.selectSHAC.selector.getValue();
    
    if (currentLabel == 'Agregar sup. regada historica') {
      // Load only the most recent available historical season
      var historicalSeasons = disp_year_hist.slice().reverse(); // Order from newest to oldest
      var layerAdded = false;
      
      // Try each historical season until we find one that exists
      for (var si = 0; si < historicalSeasons.length; si++) {
        var season = historicalSeasons[si];
        var newlink = ImgClass.histCollection(selectedSHAC, season, exceptions, claves, c, s);
        
        if (newlink.length > 0) {
          // Add only the first available season's layers and then break
          for (var i = 0; i < newlink.length; i++) {
            var layer = ui.Map.Layer(newlink[i], visParamsHist, 'Superficie regada histórica');
            c.map.layers().insert(i + 2, layer);
          }
          layerAdded = true;
          break; // IMPORTANT: Stop after finding the first available season
        }
      }
      
      if (layerAdded) {
        c.historica.boton.setLabel('Quitar sup. regada historica');
      } else {
        c.historica.warning.setValue('No hay datos históricos disponibles para este SHAC');
      }
      
    } else {
      // Eliminar capas con nombre "Superficie regada histórica"
      var layers = c.map.layers();
      for (var j = layers.length() - 1; j >= 0; j--) {
        var layerU = layers.get(j);
        
        if (layerU.getName() ==='Superficie regada histórica') {
          layers.remove(layerU);
        }
      }

      c.historica.warning.setValue('');
      c.historica.boton.setLabel('Agregar sup. regada historica');
    }
  },
});

///////




//Point for onClick function
var pointLayer = null;


//Uso de Suelo
c.usoSuelo = {};
c.usoSuelo.legend = leyenda.createUsoSueloLegend();
c.usoSuelo.label = ui.Label('Uso de suelo');
c.usoSuelo.aboutLabel = ui.Label(
  'Información de la capa de uso de suelo ' +
  'para el SHAC seleccionado (Capa actualizada hasta el año 2020).');
c.usoSuelo.cerrar = ui.Button({
  label : 'Cerrar tabla Uso de Suelo',
  style: {stretch: 'horizontal', fontSize: '12px', padding: '1px'},
  onClick: function() {
    c.usoSuelo.panel.style().set('shown', false);
  }});
  
c.usoSuelo.buttonPanel = ui.Panel({
  widgets: [c.usoSuelo.cerrar],
});
c.usoSuelo.dynamicPanel = ui.Panel({
  // Panel para almacenar la informacion a presentar
  widgets: [],
});
c.usoSuelo.clase = ui.Label('');
c.usoSuelo.uso = ui.Label('');
c.usoSuelo.tipo = ui.Label('');
c.usoSuelo.esp1 = ui.Label('');
c.usoSuelo.esp2 = ui.Label('');
c.usoSuelo.esp3 = ui.Label('');
c.usoSuelo.esp4 = ui.Label('');
c.usoSuelo.esp5 = ui.Label('');
c.usoSuelo.esp6 = ui.Label('');
c.usoSuelo.variedad= ui.Label('');
c.usoSuelo.com =ui.Label('');
c.usoSuelo.prov =ui.Label('');
c.usoSuelo.ori =ui.Label('');
c.usoSuelo.pan1 = ui.Panel({style: {border: '1px solid black'}});

c.usoSuelo.panel = ui.Panel({
  widgets: [c.usoSuelo.buttonPanel, c.usoSuelo.dynamicPanel]});
c.usoSuelo.panel.style().set('shown', false);


c.usoSuelo.boton= ui.Button({
  label : 'Agregar capa de uso de suelo',
  onClick: function() {
    var currentLabel = c.usoSuelo.boton.getLabel();
    var layers = c.map.layers();
    var n = layers.length();
    var usExist = layerExists(layers, 'Uso de Suelo');
    var layer = ui.Map.Layer(styledUsoSuelo, {} ,'Uso de Suelo');
  if (currentLabel === 'Agregar capa de uso de suelo') {
    
      c.usoSuelo.legend.style().set('shown', true);
      c.usoSuelo.boton.setLabel('Quitar capa de uso de suelo');
      if (!usExist){
      //c.map.layers().set(n+1, layer); //se agrega a la ultima posicion 
      c.map.layers().insert(0, layer); // Insertar la capa en la posición 0 (primera posición)

        
      }
      else {

        layers.forEach(function(existingLayer) {
          if (existingLayer.getName() === 'Uso de Suelo') {
            existingLayer.setShown(true);

          }
        });
      }
    } 
    else {
      layers.forEach(function(existingLayer) {
          if (existingLayer.getName() === 'Uso de Suelo') {
            existingLayer.setShown(false);
          }
        });
      c.usoSuelo.boton.setLabel('Agregar capa de uso de suelo');
      c.usoSuelo.panel.style().set('shown', false);
      c.usoSuelo.legend.style().set('shown', false);
    }
  }
});




//Catastro frutícola
c.frut = {};
c.frut.label = ui.Label('Catastro frutícola');
c.frut.aboutLabel = ui.Label(
  'Información de la capa de catastro frutícola ' +
  '(Capa actualizada hasta el año 2023).');

c.frut.cerrar = ui.Button({
  label : 'Cerrar tabla Cat. Frutícola',
  style: {stretch: 'horizontal', fontSize: '12px', padding: '1px'},
  onClick: function() {
    c.frut.panel.style().set('shown', false);
  }});
  
c.frut.buttonPanel = ui.Panel({
  widgets: [c.frut.cerrar],
});
c.frut.dynamicPanel = ui.Panel({
  // Panel para almacenar la informacion a presentar
  widgets: [],
});
c.frut.com = ui.Label('');
c.frut.prov = ui.Label('');
c.frut.areas = ui.Label('');
c.frut.esp1 = ui.Label('');
c.frut.arb1 = ui.Label('');
c.frut.sup1 = ui.Label('');
c.frut.esp2 = ui.Label('');
c.frut.arb2 = ui.Label('');
c.frut.sup2 = ui.Label('');
c.frut.esp3 = ui.Label('');
c.frut.arb3 = ui.Label('');
c.frut.sup3 = ui.Label('');
c.frut.esp4 = ui.Label('');
c.frut.arb4 = ui.Label('');
c.frut.sup4 = ui.Label('');
c.frut.pan1 = ui.Panel({style: {border: '1px solid black'}});
c.frut.pan2 = ui.Panel({style: {border: '1px solid black'}});
c.frut.pan3 = ui.Panel({style: {border: '1px solid black'}});
c.frut.pan4 = ui.Panel({style: {border: '1px solid black'}});

c.frut.panel = ui.Panel({
  widgets: [c.frut.buttonPanel, c.frut.dynamicPanel]});
c.frut.panel.style().set('shown', false);


c.frut.boton = ui.Button({
  label: 'Agregar capa catastro frutícola',
  onClick: function() {
    var currentLabel = c.frut.boton.getLabel();
    var layers = c.map.layers();
    var n = layers.length();
    var catFrutExist = layerExists(layers, 'Catastro Frutícola');
    
    if (currentLabel === 'Agregar capa catastro frutícola') {
      // Check if the layer already exists
      if (!catFrutExist) {
        var layer = ui.Map.Layer(cat_frut, {}, 'Catastro Frutícola');
        c.map.layers().insert(5, layer); // Add to the last position
      } else {
        layers.forEach(function(existingLayer) {
          if (existingLayer.getName() === 'Catastro Frutícola') {
            existingLayer.setShown(true);
          }
        });
      }
      c.frut.boton.setLabel('Quitar capa catastro frutícola');
    } else {
      layers.forEach(function(existingLayer) {
        if (existingLayer.getName() === 'Catastro Frutícola') {
          existingLayer.setShown(false);
        }
      });
      c.frut.panel.style().set('shown', false);
      c.frut.boton.setLabel('Agregar capa catastro frutícola');
    }
  }
});


// Reset all button
c.resetButton = ui.Button({
  label : 'Borrar selecciones',
  onClick: function() {
    borrarSeleccion();
    
  }});


// Reset view button
c.resetViewButton = ui.Button({
  label : 'Resetear vista',
  onClick: function(){
  c.map.setCenter({
  lon: ui.url.get('lon', -70.8),
  lat: ui.url.get('lat', -29.8),
  zoom: ui.url.get('zoom', 7)
    });
  }
});

/*******************************************************************************
 * Composition *
 * 
 * A section to compose the app i.e. add child widgets and widget groups to
 * first-level parent components like control panels and maps.
 * 
 * Guidelines: There is a gradient between components and composition. There
 * are no hard guidelines here; use this section to help conceptually break up
 * the composition of complicated apps with many widgets and widget groups.
 ******************************************************************************/

c.controlPanel.add(c.info.panel);
c.controlPanel.add(c.dividers.divider1);
c.controlPanel.add(c.selectSHAC.panel);
c.controlPanel.add(c.selectBand.selector1);
c.controlPanel.add(c.selectSHAC.aboutLabel);
c.controlPanel.add(c.selectBand.selector2);
c.controlPanel.add(c.selectSHAC.warning);
c.controlPanel.add(c.historica.titleLabel);
c.controlPanel.add(c.historica.info);
c.controlPanel.add(c.historica.selector);
c.controlPanel.add(c.historica.boton);
c.controlPanel.add(c.historica.warning);
c.controlPanel.add(c.dividers.divider2);
c.controlPanel.add(c.usoSuelo.label);
c.controlPanel.add(c.usoSuelo.aboutLabel);
c.controlPanel.add(c.usoSuelo.boton);
c.controlPanel.add(c.dividers.divider3);
c.controlPanel.add(c.frut.label);
c.controlPanel.add(c.frut.aboutLabel);
c.controlPanel.add(c.frut.boton);
c.controlPanel.add(c.dividers.divider4);
c.controlPanel.add(c.resetButton);
c.controlPanel.add(c.dividers.divider5);
c.controlPanel.add(c.downloadBand.panel);
c.controlPanel.add(panelLicencias);
c.map.add(c.frut.panel);
c.map.add(c.usoSuelo.legend);

c.map.add(c.resetViewButton);

c.map.add(c.chart.chartPanel);
c.chart.chartPanel.style().set({
  position: 'bottom-right',
  shown: false
});
c.chart.chartPanel.style().set(s.opacityWhiteMed);

c.chart.shownButton.style().set({
  margin: '0px 0px',
});

var senVis = shac_layer.style({
  color: 'black', // Color gris para el borde
  width: 1.5,        // Ancho del borde
  fillColor: '00000000', // Sin color de relleno (transparente)
  lineType: 'dashed' // Tipo de línea punteada
});

var layerSensor = ui.Map.Layer(shac_layer,senVis, 'SHACS');
c.map.addLayer(senVis, null, 'SHACS');
c.map.add(c.usoSuelo.panel);

  
ui.root.clear();
ui.root.add(c.controlPanel);
ui.root.add(c.map);


/*******************************************************************************
 * Styling *
 * 
 * A section to define and set widget style properties.
 * Styles are defined in Style.js and imported as a module here with the 
 * name of "s". 
 * 
 ******************************************************************************/

c.licencias.copernicus.style().set(s.aboutText);      
c.licencias.nasa.style().set(s.aboutText);     
c.licencias.chirps.style().set(s.aboutText); 
           
c.info.titleLabel.style().set({
  fontSize: '20px',
  fontWeight: 'bold'
});
c.historica.titleLabel.style().set(s.widgetTitle);
c.info.titleLabel.style().set(s.bigTopMargin);
c.info.aboutLabel.style().set(s.aboutText);
c.info.paperLabel.style().set(s.aboutText);
c.info.paperLabel.style().set(s.smallBottomMargin);
c.info.websiteLabel.style().set(s.aboutText);
c.info.websiteLabel.style().set(s.noTopMargin);

c.selectSHAC.selector.style().set(s.stretchHorizontal);
c.selectSHAC.aboutLabel.style().set(s.aboutText);
c.selectSHAC.label.style().set(s.widgetTitle);
c.selectSHAC.aboutText.style().set(s.aboutText);
c.historica.info.style().set(s.aboutText);
c.historica.selector.style().set(s.stretchHorizontal);
c.historica.boton.style().set(s.stretchHorizontal);
c.selectBand.selector1.style().set(s.stretchHorizontal);
c.selectBand.selector2.style().set(s.stretchHorizontal);
c.usoSuelo.label.style().set(s.widgetTitle);
c.usoSuelo.boton.style().set(s.stretchHorizontal);
c.frut.label.style().set(s.widgetTitle);
c.frut.boton.style().set(s.stretchHorizontal);
c.frut.aboutLabel.style().set(s.aboutText);
c.controlPanel.style().set(s.controlPanel);

c.map.style().set({
  cursor: 'crosshair'
});


c.usoSuelo.boton.style().set(s.widgetTitle);
c.usoSuelo.aboutLabel.style().set(s.aboutText);
c.usoSuelo.cerrar.style().set(s.buttonStyle);
c.usoSuelo.panel.style().set(s.opacityWhiteMed);
c.usoSuelo.panel.style().set({position: 'top-left'});

c.usoSuelo.ori.style().set(s.greyLabel);
c.usoSuelo.com.style().set(s.whiteLabel);
c.usoSuelo.prov.style().set(s.greyLabel);
c.usoSuelo.uso.style().set(s.whiteLabel);
c.usoSuelo.tipo.style().set(s.greyLabel);
c.usoSuelo.variedad.style().set(s.whiteLabel);
c.usoSuelo.esp1.style().set(s.greyLabel);
c.usoSuelo.esp2.style().set(s.whiteLabel);
c.usoSuelo.esp3.style().set(s.greyLabel);
c.usoSuelo.esp4.style().set(s.whiteLabel);
c.usoSuelo.esp5.style().set(s.greyLabel);
c.usoSuelo.esp6.style().set(s.whiteLabel);

c.frut.panel.style().set(s.opacityWhiteMed);
c.frut.panel.style().set({position: 'bottom-left'});
c.frut.com.style().set(s.greyLabel);
c.frut.prov.style().set(s.whiteLabel);
c.frut.areas.style().set(s.whiteLabel);
c.frut.esp1.style().set(s.greyLabel);
c.frut.arb1.style().set(s.whiteLabel);
c.frut.sup1.style().set(s.greyLabel);
c.frut.esp2.style().set(s.whiteLabel);
c.frut.arb2.style().set(s.greyLabel);
c.frut.sup2.style().set(s.whiteLabel);
c.frut.esp3.style().set(s.greyLabel);
c.frut.arb3.style().set(s.whiteLabel);
c.frut.sup3.style().set(s.greyLabel);
c.frut.esp4.style().set(s.whiteLabel);
c.frut.arb4.style().set(s.greyLabel);
c.frut.sup4.style().set(s.whiteLabel);
c.resetButton.style().set(s.stretchHorizontal);
c.resetViewButton.style().set(s.buttonStyle);

// Loop through setting divider style.
Object.keys(c.dividers).forEach(function(key) {
  c.dividers[key].style().set(s.divider);
});

/*******************************************************************************
 * Behaviors *
 * 
 * A section to define app behavior on UI activity.
 * 
 * Guidelines:
 * 1. At the top, define helper functions and functions that will be used as
 *    callbacks for multiple events.
 * 2. For single-use callbacks, define them just prior to assignment. If multiple
 *    callbacks are required for a widget, add them consecutively to maintain
 *    order; single-use followed by multi-use.
 * 3. As much as possible, include callbacks that update URL parameters.
 ******************************************************************************/



function borrarSeleccion(){
  var actualLayers = c.map.layers();
  var shac = c.selectSHAC.selector.getValue();
  var temp1 = c.selectBand.selector1.getValue();
  var temp2 = c.selectBand.selector2.getValue();
  var histo = c.historica.selector.getValue();
  var catFrutExist = layerExists(actualLayers, 'Catastro Frutícola');
  var usoSueloExist = layerExists(actualLayers, 'Uso de Suelo');
  
  //1. Recentrar
  c.map.setCenter({
  lon: ui.url.get('lon', -70.8),
  lat: ui.url.get('lat', -29.8),
  zoom: ui.url.get('zoom', 7)
    });

  //2. Eliminar todas las capas de superficie regada (incluyendo histórica)
  var toRemove = [];
  for (var i = actualLayers.length() - 1; i >= 0; i--) {
    var layer = actualLayers.get(i);
    var layerName = layer.getName();
    
    // Eliminar todas las capas de superficie regada
    if (layerName.indexOf('Superficie regada') !== -1) {
      toRemove.push(layer);
    }
    // Eliminar capa de SHAC seleccionado
    if (layerName === 'SHAC seleccionado') {
      toRemove.push(layer);
    }
  }
  
  // Remover las capas identificadas
  for (var i = 0; i < toRemove.length; i++) {
    c.map.remove(toRemove[i]);
  }

  //3. Punto rojo
  if (pointLayer) {
    actualLayers.remove(pointLayer);
    pointLayer = null;
  }
  
  //4. Resetear selectores de temporada
  if(temp1 !== null || temp2 !== null){
    c.selectBand.selector1.setValue(null);
    c.selectBand.selector2.setValue(null);
  }
  
  //5. Resetear selector de SHAC y ocultar gráfico
  if(shac !== null){
    c.selectSHAC.selector.setValue(null);
    c.selectBand.selector1.setDisabled(true);
    c.selectBand.selector2.setDisabled(true);
  }
  
  // Ocultar y limpiar el gráfico siempre (no solo cuando hay SHAC)
  c.chart.chartPanel.style().set('shown', false);
  c.chart.container.widgets().reset([]);
  if (chartWidget) {
    chartWidget = null;
  }
  
  //6. Uso de Suelo
  if(usoSueloExist){
    c.usoSuelo.legend.style().set('shown', false);
    c.usoSuelo.boton.setLabel('Agregar capa de uso de suelo');
    c.usoSuelo.panel.style().set('shown', false);
    actualLayers.forEach(function(existingLayer) {
      if (existingLayer.getName() === 'Uso de Suelo') {
        existingLayer.setShown(false);
      }
    });
  }
  
  //7. Catastro Fruticola
  if(catFrutExist){
    c.frut.boton.setLabel('Agregar capa catastro frutícola');
    c.frut.panel.style().set('shown', false);
    actualLayers.forEach(function(existingLayer) {
      if (existingLayer.getName() === 'Catastro Frutícola') {
        existingLayer.setShown(false);
      }
    });
  }
  
  //8. Resetear superficie regada histórica
  if(histo !== null){
    c.historica.selector.setValue(null);
    c.historica.selector.setDisabled(true);
    c.historica.boton.setDisabled(true);
    c.historica.boton.setLabel('Agregar sup. regada historica');
  }
  
  //9. Borrar etiquetas y warnings
  resetLabels();
  c.selectSHAC.warning.setValue('');
  c.historica.warning.setValue('');
  
  //10. Ocultar mensaje sobre enlaces de descarga
  c.selectSHAC.aboutText.style().set('shown', false);
}



function resetLabels(){
  [c.downloadBand.kmlLabel, c.downloadBand.gjsonLabel].forEach(function(labelArray) {
        labelArray.forEach(function(label) {
          label.style().set(s.disableLabel);
          label.setValue('');
        });
      });
      
      c.downloadBand.title.setValue('');
      c.selectSHAC.warning.setValue('');
      c.historica.warning.setValue('');
      c.downloadBand.info.setValue('');
}


/*******************************************************************************
 * Initialize *
 * 
 * A section to initialize the app state on load.
 * 
 * Guidelines:
 * 1. At the top, define any helper functions.
 * 2. As much as possible, use URL params to initialize the state of the app.
 ******************************************************************************/

// Set model state based on URL parameters or default values.
c.map.setCenter({
  lon: ui.url.get('lon', -70.8),
  lat: ui.url.get('lat', -29.8),
  zoom: ui.url.get('zoom', 7)
});

function handleMouseMove(coords) {
  ShacClass.updateTooltip(coords, shac_layer, c.sensores.panel);
}

// Capturar eventos del ratón en la capa
//c.map.onClick(handleMouseMove);

var chartWidget = null; // Var para almacenar el grafico

c.map.onClick(function(coords) {
  
    var actualLayers = c.map.layers();
    var clickedPoint = ee.Geometry.Point(coords.lon, coords.lat);
    
    var catFrutExist = layerExists(actualLayers, 'Catastro Frutícola');
    var usoSueloExist = layerExists(actualLayers, 'Uso de Suelo');
    
    var catFrutVis = layerVisible(actualLayers, 'Catastro Frutícola');
    //print('catFrutVis', catFrutVis);
    var usoSueloVis = layerVisible(actualLayers, 'Uso de Suelo');
    //print('usoSueloVis', usoSueloVis);
    
    // 1. Seleccionar SHAC si no hay uso de suelo ni catastro fruticola
    if(!catFrutExist && !usoSueloExist){
      
    ShacClass.onClickSHAC(coords.lon, coords.lat, c,region, shac_layer);
      }
    // 2. Remover punto anterior y Colocar punto 
    
    if (pointLayer) {
      actualLayers.remove(pointLayer); // Remove the previous point layer
    }
    pointLayer = ui.Map.Layer(clickedPoint, {color: 'red'}, 'Punto seleccionado');
    actualLayers.add(pointLayer);
    
    // 3. Agregar tabla de cat. fruticola
    if (catFrutExist && catFrutVis) { //si existe e intersecta con el valor
      catClass.actualizarCatFrut(clickedPoint, Rcat_frut, valparaisoComunas,c);
    } else {
      // Si no hay datos para las coordenadas clickeadas, esconder el panel
      c.frut.panel.style().set('shown', false);
      }
      
    // 4. Agregar tabla de uso de suelo
    
    if (usoSueloExist && usoSueloVis) { //si existe e intersecta con el valor
      usoClass. actualizarUsoSuelo(clickedPoint, uso_suelo,c);
      
    } else {
      // Si no hay datos para las coordenadas clickeadas, esconder el panel
      c.usoSuelo.panel.style().set('shown', false);
      }
      
   
  
});
  


var endTime = new Date().getTime();

var executionTime = endTime - startTime;

// Imprimir el tiempo de ejecución en la consola
//print('Tiempo de ejecución (ms):', executionTime);
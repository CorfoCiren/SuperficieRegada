
/*******************************************************************************
 * Sensores *
 * 
 * En esta sección se almacenan todos las funciones relacionadas
 * con los sensores. 
 * 
 * Guidelines: Los widgets se definen en el main y se actualizan aqui.
 ******************************************************************************/
//var sensores_puntos = ee.FeatureCollection("projects/ee-corfobbppciren2023/assets/sensores_corfo");
var s = require('users/corfobbppciren2024/App_SR_User:Style').styles; 


/*******************************************************************************
 * Funciones internas *
 ******************************************************************************/


var extraerAtributo = function(feature) {
  var atributo = 'filename';
  return feature.get(atributo);
};

function insideRegion(point, region){

// 2. Verificar que las coordenadas se encuentren en el terreno
  var regionFirst = region.first();
  var isInRegion = regionFirst.geometry().contains(point, ee.ErrorMargin(1)).getInfo();
  if(isInRegion){
    return true;
  }else{
    return false;
  }
}

/*******************************************************************************
 ******************************************************************************/

//1. Seleccionar un SHAC desde el mapa

//1.1. Verificar que este dentro de la zona de la region
//1.2. Resetear el valor de c.selectSHAC.selector
//1.2. Cambiar valor de c.selectSHAC.selector

function onClickSHAC(lon, lat, c, region, shac_layer) {

  // Crear un punto con las coordenadas clicadas
  var point = ee.Geometry.Point([lon, lat]);
  
  if(!insideRegion(point, region)){

    return null;
  }
  // Eliminar links de descarga previos, si es que hay
[c.downloadBand.kmlLabel, c.downloadBand.gjsonLabel].forEach(function(labelArray) {
        labelArray.forEach(function(label) {
          label.style().set(s.disableLabel);
          label.setValue('');
        });
      });
      
      c.downloadBand.title.setValue('');
      c.selectSHAC.warning.setValue('');
  
  
  // Buscar el SHAC correspondiente en shac_layer
  var shacFeature = shac_layer.filterBounds(point).first();
  
  shacFeature.evaluate(function(feature) {
    if (feature) {
      var shacValue = feature.properties.SHAC;
      // Asignar el valor al ui.Select
      c.selectSHAC.selector.setValue(shacValue);
      //print('SHAC encontrado: ' + shacValue);
    } else {
      print('No se encontró SHAC en esta ubicación.');
    }
      });
     
  
}

exports.onClickSHAC = onClickSHAC;

//importa el panel completo con todas las labels
function updateTooltip(coords, shapefile, panel) {

  if (typeof(coords) === 'string') {
    // Caso cuando coords es el nombre del sensor
    getPointFromSensorName(coords, function(point) {
    processAndUpdateLabels(point, shapefile, panel);
    });
  } else {
    // Caso cuando coords son las coordenadas del click en el mapa
    var point = ee.Geometry.Point([coords.lon, coords.lat]);
    processAndUpdateLabels(point, shapefile, panel);
  }

}

function getPointFromSensorName(sensorName, callback) {
  // Obtener las coordenadas del diccionario
  var sensorCoords = ee.Dictionary(nom_sensores.get(sensorName));
  
  // Evaluar las coordenadas para obtener los valores en el cliente
  sensorCoords.evaluate(function(coords) {
    if (coords) {
      var shlat = coords.lat;
      var shlon = coords.lon;
      
      if (!isNaN(shlat) && !isNaN(shlon)) {
        var point = ee.Geometry.Point([shlon, shlat]);
        callback(point);  // Llamar al callback con el punto obtenido
      } else {
        //print('Coordenadas no válidas para el sensor:', sensorName);
        callback(null);  // Enviar null si las coordenadas son inválidas
      }
    } else {
      //print('No se encontraron coordenadas para el sensor:', sensorName);
      callback(null);  // Enviar null si no se encuentran coordenadas
    }
  });
}

function processAndUpdateLabels(point, shapefile, panel) {
  var bufferedPoint = point.buffer(2000);  // Buffer para ayudar en la búsqueda
  
  // Encontrar el punto más cercano en el shapefile
  var nearestFeature = shapefile.filterBounds(bufferedPoint).first();

  nearestFeature.evaluate(function(feature) {
    if (feature && feature.properties) {
      var nombre = feature.properties.filename || 'No especificada';
      var localidad = feature.properties.Localidad || 'No especificada';
      var altitud = feature.properties.altitude || NaN;
      var lon = parseFloat(feature.properties.longitude) || NaN;
      var lat = parseFloat(feature.properties.latitude) || NaN;
      var rLon = lon.toFixed(2);
      var rLat = lat.toFixed(2);
      
      var labels = panel.widgets();
      labels.get(1).setValue('Nombre sensor: ' + nombre);
      labels.get(2).setValue('Localidad: ' + localidad);
      labels.get(3).setValue('Altitud: ' + altitud + ' m.');
      labels.get(4).setValue('Lon: ' + rLon + '°');
      labels.get(5).setValue('Lat: ' + rLat + '°');
      
      panel.style().set({
        'shown': true
      });
    } else {
      print('No hay sensores cercanos');
    }
  });
}



exports.updateTooltip = updateTooltip;

function zoomSHAC(nombreSeleccionado, shac_layer, map) {

  // 2. Filtrar segun seleccionado
  var shacFeature = shac_layer.filter(ee.Filter.eq('SHAC', nombreSeleccionado));

  // 2.1. Obtener la geometría del SHAC filtrado
  var geometria = shacFeature.geometry();

  // 2.1. Verificar si se encontró la geometría
  if (geometria) {
    // 2.1.1. Hacer zoom a la geometría del SHAC en el mapa
    var bbox = geometria.bounds();
    
    var highlightedStyle = {color: 'black', width: 3}; 
    // Aplicar el estilo al SHAC seleccionado
    var highlightedFeature = shacFeature.style(highlightedStyle);
    
    var highLayer = ui.Map.Layer(highlightedFeature, null,'SHAC seleccionado');
        
    
    map.layers().insert(2, highLayer);
    map.centerObject(bbox);
  } else {
    print('No se encontró la geometría para el SHAC:', nombreSeleccionado);
  }
  
}



exports.zoomSHAC = zoomSHAC;


// Agregar una serie de tiempo al chart

function serieSensor(nombreSensor, callback) {
  var filtered = dataSensores.filter(ee.Filter.eq('Sensor', nombreSensor));
  var hsList = filtered.aggregate_array('HS');
  var fechaList = filtered.aggregate_array('Fecha');
  var longLat = nom_sensores.get(nombreSensor);
  
  // Asegúrate de que longLat esté envuelto en ee.List
  longLat = ee.List(longLat);

  var sensorDict = ee.Dictionary.fromLists(fechaList, hsList);
  var returnList = [sensorDict, longLat];

  // Evaluar y pasar el resultado al callback
  ee.Dictionary.fromLists(fechaList, hsList).evaluate(function(sensorDictEvaluated) {
    longLat.evaluate(function(longLatEvaluated) {
      var finalResult = [sensorDictEvaluated, longLatEvaluated];
      callback(finalResult);
    });
  });
}

exports.serieSensor = serieSensor;
// Funciones que solo se correran al principio de la aplicacion
var shac_layer = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/SHACs_IV_Region_MOD");
var startTime = new Date().getTime();
var baseFolderPath = 'projects/humedad-y-superficie-regada/assets/SR_v32';
var basePath = baseFolderPath + '/';
var listAssets = ee.data.listAssets(baseFolderPath).assets;

// También listar assets de AR_Segmentacion para la superficie regada histórica
var folderPathHist = 'projects/humedad-y-superficie-regada/assets/AR_Segmentacion';
var listAssetsHist = ee.data.listAssets(folderPathHist).assets;

var temp_disp = [];
var temp_disp_hist = []; // Temporadas para superficie regada histórica
var acui_names = [];
var repetido = [];


exports.shac_names = shac_layer.aggregate_array('SHAC');

exports.ClaseStyles = ee.Dictionary({
  'AREAS ARTIFICIALES': {color: '#FF5733'}, // Orange Red
  'AREAS DESPROVISTAS DE VEGETACION': {color: '#F0E68C'}, // Khaki
  'BOSQUES': {color: '#228B22'}, // Forest Green
  'CUERPOS DE AGUA': {color: '#1E90FF'}, // Dodger Blue
  'HUMEDALES': {color: '#40E0D0'}, // Turquoise
  'NIEVES Y GLACIARES': {color: '#ADD8E6'}, // Light Blue
  'PLANTACIONES FORESTALES': {color: '#6A5ACD'}, // Slate Blue
  'PRADERAS Y MATORRALES': {color: '#98FB98'}, // Pale Green
  'TERRENOS AGRICOLAS': {color: '#D2B48C'}  // Tan
});



//Estado inicial de excepciones hasta temporada 2022_2023
var exceptions = {};

function getAcuiferoKeyFromInput(acuiferoName) {
  var baseName = acuiferoName.replace(/_/g, " ").replace(/ dividido parte \d+$/, "");
  baseName = String(baseName);
  
  for (var key in exceptions) {
    if (String(baseName).indexOf(key) !== -1) {
      return [baseName,key];
    }
  }
  return [baseName,null];
}

// Pre-computed indexes for fast SHAC period lookup (no server round-trips at runtime)
var shacCodeToPeriods = {};
var shacAssetIndex = {};

//print(listAssets);
for(var i =0; i<listAssets.length; i++){
  //print('listAssets[i]',listAssets[i]);
  var idn = listAssets[i].id;
  //print('idn', idn);
  var input = idn.split('/')[4];
  //print('input',input);
  var match = input.match(/(\d{4})_(\d{4})_SHAC_(.*)/);
  var temp = match[1] + '_' + match[2];
  var acuifero = match[3];
  
  if(temp !== temp_disp[temp_disp.length -1]){
      temp_disp.push(temp);
  }
  acui_names.push(acuifero);
  
  // Revisar si contiene string 'dividido_parte'
  var check = acuifero.match("dividido_parte");

  if(check){
  
  var result = getAcuiferoKeyFromInput(acuifero); //Return null o valor
  var key = result[1];
  var value = result[0];
  
  // Acuifero esta dentro de las excepciones:
  if(key){
    if (exceptions[key]) {
      if (exceptions[key].indexOf(acuifero) === -1) {
        exceptions[key].push(acuifero);
        }
    }
  }else{
  
  // Acuifero no en el diccionario -> agregar a diccionario
  exceptions[result[0]] =[acuifero];
  
  }
  }

  // Build pre-computed SHAC asset index for fast lookup (skip exceptions/dividido_parte)
  if (!check) {
    var baseCode = acuifero.replace(/_\d+$/, '');
    // shacCodeToPeriods: code -> [periods]
    if (!shacCodeToPeriods[baseCode]) {
      shacCodeToPeriods[baseCode] = [];
    }
    if (shacCodeToPeriods[baseCode].indexOf(temp) === -1) {
      shacCodeToPeriods[baseCode].push(temp);
    }
    // shacAssetIndex: code -> { period -> [asset paths] }
    if (!shacAssetIndex[baseCode]) {
      shacAssetIndex[baseCode] = {};
    }
    if (!shacAssetIndex[baseCode][temp]) {
      shacAssetIndex[baseCode][temp] = [];
    }
    shacAssetIndex[baseCode][temp].push(idn);
  }

} 

// Extraer temporadas de AR_Segmentacion
for(var i = 0; i < listAssetsHist.length; i++){
  var idn = listAssetsHist[i].id;
  var input = idn.split('/').pop(); // Obtener el nombre del asset
  // Formato esperado: "2019_2020_SHAC_XXX" o similar
  var match = input.match(/(\d{4})_(\d{4})_SHAC_(.*)/);
  if(match){
    var temp = match[1] + '_' + match[2];
    if(temp_disp_hist.indexOf(temp) === -1){
      temp_disp_hist.push(temp);
    }
  }
}

// Ordenar las temporadas históricas
temp_disp_hist.sort();
  
var maxLength = 0;
for (var key in exceptions) {
  var currentLength = exceptions[key].length;
  if (currentLength > maxLength) {
    maxLength = currentLength;
  }
}


exports.getTemp = function(){
  return temp_disp;
};

exports.getTempHist = function(){
  return temp_disp_hist;
};

exports.getExceptions = function(){
  return exceptions;
};

exports.getMaxLength = function(){
  return maxLength;
};

exports.getShacCodeToPeriods = function(){
  return shacCodeToPeriods;
};

exports.getShacAssetIndex = function(){
  return shacAssetIndex;
};

exports.listAsset = listAssets;
exports.getBasePath = function(){
  return basePath;
};
var endTime = new Date().getTime();
var executionTime = endTime - startTime;
print('Tiempo de ejecución inicio (ms):', executionTime);
  


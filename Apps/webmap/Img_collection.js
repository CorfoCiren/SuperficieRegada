var SHAC_Dict = {
  "Rio_del_Carmen": "SHAC_333",
  "Guanguali": "SHAC_263",
  "Combarbala": "SHAC_061",
  "Culebron": "SHAC_053",
  "Huentelauquen": "SHAC_072",
  "Tres_Cruces": "SHAC_261",
  "Guanaquero_Tongoy": "SHAC_395",
  "Quebrada_Las_Palmas": "SHAC_075",
  "Serena_Norte": "SHAC_253",
  "Quebrada_Boca_del_Barco": "SHAC_407",
  "Rio_Rapel": "SHAC_256",
  "Penuelas": "SHAC_055",
  "Playa_Los_Choros": "SHAC_259",
  "Rio_Ponio": "SHAC_049",
  "Quebrada_El_Pleito": "SHAC_410",
  "Monte_Redondo": "SHAC_402",
  "Guatulame": "SHAC_048",
  "Rio_Hurtado": "SHAC_331",
  "El_Rincon": "SHAC_393",
  "Cogoti": "SHAC_060",
  "Quebrada_San_Pedro": "SHAC_418",
  "Chalinga": "SHAC_249",
  "Quebrada_Purgatorio": "SHAC_417",
  "Quebrada_El_Negro": "SHAC_073",
  "Rio_Grande": "SHAC_255",
  "Higuerilla": "SHAC_063",
  "Quebrada_Maitencillo": "SHAC_077",
  "Quebrada_Ramadilla": "SHAC_081",
  "Quebrada_Hornillo": "SHAC_412",
  "La_Herradura": "SHAC_398",
  "Quebrada_El_Totoral": "SHAC_074",
  "El_Llano": "SHAC_050",
  "Quebrada_Talinay": "SHAC_419",
  "Pangalillo": "SHAC_266",
  "Lagunillas": "SHAC_054",
  "Illapel": "SHAC_252",
  "Limari_Desembocadura": "SHAC_254",
  "La_Pampilla": "SHAC_399",
  "SHAC_Sin_Nombre_2": "SHAC_NN2",
  "Quebrada_La_Higuera": "SHAC_413",
  "Los_Choros_Altos": "SHAC_257",
  "Puerto_Oscuro": "SHAC_078",
  "Aguas_Arriba_Embalse_Culimo": "SHAC_262",
  "Punitaqui": "SHAC_064",
  "Quebrada_Pachingo": "SHAC_079",
  "Rio_Limari": "SHAC_070",
  "Canela": "SHAC_051",
  "El_Ingenio": "SHAC_062",
  "Choapa_Medio": "SHAC_251",
  "SHAC_Sin_Nombre_1": "SHAC_NN1",
  "Caleta_Rincon": "SHAC_390",
  "Altos_de_Talinay_Norte": "SHAC_387",
  "Elqui_Medio": "SHAC_058",
  "Los_Maquis": "SHAC_265",
  "Turbio": "SHAC_339",
  "Punta_Negra_-_Caleta_Balseadera": "SHAC_405",
  "Quebrada_Los_Loros": "SHAC_416",
  "Quebrada_El_Boldo": "SHAC_409",
  "Punta_Talquilla": "SHAC_406",
  "Infiernillo": "SHAC_068",
  "Molle": "SHAC_401",
  "Altos_de_Talinay_Sur": "SHAC_388",
  "Los_Vilos": "SHAC_400",
  "Quebrada_Honda_IV_Norte": "SHAC_411",
  "Playa_Talca": "SHAC_404",
  "Quebrada_Grande": "SHAC_065",
  "Quebrada_Las_Tacas": "SHAC_414",
  "Choapa_Bajo": "SHAC_052",
  "Rio_Pama": "SHAC_066",
  "La_Cebada": "SHAC_397",
  "Elqui_Bajo": "SHAC_057",
  "Pichidangui": "SHAC_403",
  "Quebrada_del_Pastor": "SHAC_408",
  "Quilimari": "SHAC_069",
  "Quebrada_Quilaycillo": "SHAC_080",
  "Quebrada_Tongoicillo": "SHAC_082",
  "Claro": "SHAC_338",
  "Santa_Gracia": "SHAC_059",
  "Estero_Millahue": "SHAC_394",
  "Los_Condores": "SHAC_264",
  "Changos": "SHAC_421",
  "Los_Choros_Bajos": "SHAC_258",
  "Chungungo": "SHAC_391",
  "Guayacan_-_Barranca": "SHAC_396",
  "Choapa_Alto": "SHAC_250",
  "Elqui_Alto": "SHAC_056",
  "El_Olivo": "SHAC_392",
  "El_Ajial": "SHAC_067",
  "Yerbas_Buenas": "SHAC_420",
  "Estero_Chigualoco": "SHAC_071",
  "Quebrada_Los_Litres": "SHAC_076",
  "Caleta_Nague": "SHAC_389",
  "Quebrada_Las_Yeguas": "SHAC_415",
  "Quebrada_Honda_IV_Sur": "SHAC_725",
  "Punta_Colorada": "SHAC_260",
  "Totoralillo": "SHAC_083"
};

exports.SHAC_Dict = SHAC_Dict;

function checkImageExistence(path) {
  try {
    // Intenta obtener el asset. Si no existe, lanzará una excepción.
    var asset = ee.data.getAsset(path);
    return asset !== null;
  } catch (e) {
    // Si hay un error (por ejemplo, asset no encontrado), devuelve false.
    return false;
  }
}

// Función para buscar todos los archivos con el mismo código base
function findAllAssetsWithCode(basePath, selectedBand, shacCode) {
  var link = [];
  // El código del SHAC ya incluye "SHAC_", así que solo concatenamos
  var baseName = selectedBand + "_" + shacCode;
  
  // Primero intentar sin número
  var imageIds = basePath + baseName;
  if (checkImageExistence(imageIds)) {
    link.push(ee.FeatureCollection(imageIds));
  }
  
  // Luego buscar con números (_1, _2, _3, etc.)
  // Si encontramos _1, debemos buscar _2, _3, etc. consecutivamente hasta que no haya más
  var counter = 1;
  
  while (true) {
    var numberedName = baseName + "_" + counter;
    var numberedPath = basePath + numberedName;
    
    if (checkImageExistence(numberedPath)) {
      link.push(ee.FeatureCollection(numberedPath));
      counter++;
    } else {
      // No encontramos este número, salimos (asumimos que son consecutivos)
      break;
    }
    
    // Límite de seguridad para evitar bucles infinitos
    if (counter > 20) {
      break;
    }
  }
  
  return link;
}

exports.collection = function(basePath, selectedSHAC, selectedBand,exceptions,claves,c,s) {
  
  var link_name;
  var imageIds;
  
  //1. Revisar que selectedSHAC sea distinto de null
  if(selectedSHAC === undefined){
    return null;
  }
  var link = [];
  if (claves.indexOf(selectedSHAC) !== -1){

        var listaShp = exceptions[selectedSHAC];
        for (var i = 0; i < listaShp.length; i++) {
          link_name = selectedBand + "_SHAC_" + listaShp[i];
          imageIds =basePath +link_name;
        
          link.push(ee.FeatureCollection(imageIds));
        }
        
    return link;
  }
  
  // Normalizar el nombre del SHAC
  var shpSHAC = selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_');
  
  // Obtener el código del SHAC del diccionario
  var shacCode = SHAC_Dict[shpSHAC];
  
  if (!shacCode) {
    //print("No se encontró código para el SHAC: " + shpSHAC);
    return link;
  }
  
  // Buscar todos los archivos con este código (puede haber múltiples: _1, _2, etc.)
  link = findAllAssetsWithCode(basePath, selectedBand, shacCode);
  
  if (link.length === 0) {
    //print("no existe el archivo para SHAC: " + shpSHAC + " con código: " + shacCode);
  }
  
  return link;
};


exports.histCollection = function(selectedSHAC, selectedBand,exceptions,claves,c,s) {

  var link_name;
  var imageIds;
  var basePath = "projects/humedad-y-superficie-regada/assets/AR_Segmentacion/";
  //1. Revisar que selectedSHAC sea distinto de null
  if(selectedSHAC === undefined){
    return null;
  }
  var link = [];
  if (claves.indexOf(selectedSHAC) !== -1){

        var listaShp = exceptions[selectedSHAC];
        for (var i = 0; i < listaShp.length; i++) {
          link_name = selectedBand  + "_"+ listaShp[i];
          imageIds =basePath +link_name;
          link.push(ee.FeatureCollection(imageIds));
        }
        
    return link;
  }

  var shpSHAC = [selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_')];

  
  //1.2. Formar el nombre completo
  //link_name = selectedBand + "_"+shpSHAC;
  link_name = selectedBand + '_' + SHAC_Dict[shpSHAC];
  imageIds = basePath +link_name;
  if(checkImageExistence(imageIds)){

    link = [ee.FeatureCollection(imageIds)];
    
      return link;

  }else{

    return link;
  }
};









exports.metrics = function(selectedSHAC, selectedBand,exceptions,claves, assetsList, c,s){
  // Llama a la función con el filtro "Acuifero"
  var assetsFiltrados = filtrarAssetsPorNombre(assetsList, selectedSHAC);

};

var folderPath = 'projects/humedad-y-superficie-regada/assets/SR_v32/';
var assetsList = ee.data.listAssets(folderPath).assets;


function filteFeature(assetsList, selectedSHAC) {
  var shpSHAC = selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_');
  
  var filteredAssets = assetsList.filter(function(asset) {
    return asset.id.indexOf(shpSHAC) !== -1; 
  });

  var areasDict = {};

  // Iterar a través de los assets filtrados y calcular el área
  filteredAssets.forEach(function(asset) {
    var assetId = asset.id;

    // Extraer el rango de años del ID
    var yearRange = assetId.split('/').pop().split('_SHAC')[0]; // Obtiene '2019_2020', etc.

    // Cargar el asset como FeatureCollection
    var featureCollection = ee.FeatureCollection(assetId);

    // Calcular el área total
    var area = featureCollection.geometry().area().divide(1e6); // Convertir a km²
    areasDict[yearRange] = area;
  });
  return areasDict;
}


function filteFeature2(assetsList, selectedSHAC) {
  var shpSHAC = selectedSHAC.replace(/\s*-\s*/g, ' ').split(' ').join('_');
  
  var filteredAssets = assetsList.filter(function(asset) {
    return asset.id.indexOf(shpSHAC) !== -1; 
  });

  var areasDict = {};
filteredAssets.forEach(function(asset) {
  var assetId = asset.id;

    // Extraer el rango de años del ID
    var yearRange = assetId.split('/').pop().split('_SHAC')[0]; // Obtiene '2019_2020', etc.

    // Cargar el asset como FeatureCollection
    var featureCollection = ee.FeatureCollection(assetId);
    var sumaTotal = featureCollection.reduceColumns({
      reducer: ee.Reducer.sum(),
      selectors: ['count'] // Nombre de la columna
});
  var sumNum = ee.Number(sumaTotal.get('sum')).divide(1e6);
//print('sumaTotal',sumaTotal.get('sum'));
  areasDict[yearRange] = sumNum;
});

  return areasDict;
}

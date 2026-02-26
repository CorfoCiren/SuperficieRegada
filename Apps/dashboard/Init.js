var folderPath = 'users/corfobbppciren2024/SR_v30';
var listAssets = ee.data.listAssets(folderPath).assets;

var temp_disp = [];


// Build asset name index while parsing (reuse the single listAssets call)
var assetNameIndex = {};

for(var i = 0; i < listAssets.length; i++){
  var idn = listAssets[i].id;
  var input = idn.split('/')[3];
  var match = input.match(/(\d{4})_(\d{4})_SHAC_(.*)/);
  if (!match) continue; // skip malformed asset names
  var temp = match[1] + '_' + match[2];
  
  // Build name index for fast lookups
  var assetFileName = input;
  assetNameIndex[assetFileName] = idn;
  
  if(temp !== temp_disp[temp_disp.length -1]){
      temp_disp.push(temp);
  }
}

exports.getAssetNameIndex = function(){
  return assetNameIndex;
};

exports.getTemp = function(){
  return temp_disp;
};


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

exports.SHAC_Dict = {
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
  "Totoralillo": "SHAC_083", 
  'Todos los SHACs': ''
};




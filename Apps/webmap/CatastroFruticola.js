exports.actualizarCatFrut = function(point, cat_frut, valpoComunas, c) {
  var startTime = new Date().getTime();

  // 1. Clear all dynamic panels
  c.frut.dynamicPanel.clear();
  c.frut.pan1.clear();
  c.frut.pan2.clear();
  c.frut.pan3.clear();
  c.frut.pan4.clear();

  // Filter features by the point
  var features = cat_frut.filterBounds(point);
  var count = features.size();

  // Use 'evaluate' to work with the number of features asynchronously
  count.evaluate(function(countVal) {
    if (countVal === 0) {
      //print('No se encontró información en las coordenadas seleccionadas.');
      c.frut.panel.style().set('shown', false);
      return;
    }

    // Get the first feature
    var featureList = features.toList(countVal);
    var feature = ee.Feature(featureList.get(0));

    // Retrieve the required properties without getInfo
    var provincia = codProvToProvincia.get(feature.get('provdere')).getInfo();
    var comuna = feature.get('desccomu').getInfo();
    var area = feature.geometry().area().getInfo();
    
    // Redondear el área a dos decimales
    area = parseFloat(area).toFixed(2);

    // Set the values of the labels
    c.frut.prov.setValue('Provincia: ' + provincia);
    c.frut.com.setValue('Comuna: ' + comuna);
    c.frut.areas.setValue('Área: ' + area + ' [m2]');

    // Crear un array para las especies en orden
    var speciesOrder = [
      {key: 'especie_01', panel: c.frut.pan1, label: c.frut.esp1, name: 'Especie 1'},
      {key: 'especie_02', panel: c.frut.pan2, label: c.frut.esp2, name: 'Especie 2'},
      {key: 'especie_03', panel: c.frut.pan3, label: c.frut.esp3, name: 'Especie 3'},
      {key: 'especie_04', panel: c.frut.pan4, label: c.frut.esp4, name: 'Especie 4'}
    ];

    // Iterar a través de las especies y agregar la primera especie encontrada
    var foundSpecies = false;
    speciesOrder.forEach(function(species) {
      if (!foundSpecies) {
        feature.get(species.key).evaluate(function(especieVal) {
          if (especieVal) {
            species.label.setValue(species.name + ': ' + especieVal);
            species.panel.insert(0, species.label);
            c.frut.dynamicPanel.add(species.panel); // Insertar en el panel
            foundSpecies = true; // Marcar como encontrada
          }
        });
      }
    });

    // Insertar Provincia, Comuna y Área en el orden correcto
    c.frut.dynamicPanel.insert(0, c.frut.prov); // Provincia
    c.frut.dynamicPanel.insert(1, c.frut.com); // Comuna
    c.frut.dynamicPanel.add(c.frut.areas);     // Área (al final)

    // Finalmente, mostrar el panel
    c.frut.panel.style().set('shown', true);
    c.frut.panel.style().set('position', 'bottom-left');

    // End time and execution print
    var endTime = new Date().getTime();
    var executionTime = endTime - startTime;
    //print('Tiempo de ejecución funcion Cat. Frut (ms):', executionTime);
  });
};

var codProvToProvincia = ee.Dictionary({
  "122": "Antártica Chilena",
  "021": "Antofagasta",
  "082": "Arauco",
  "151": "Arica",
  "112": "Aysén",
  "083": "Bío-Bío",
  "061": "Cachapoal",
  "113": "Capitán Prat",
  "062": "Cardenal Caro",
  "072": "Cauquenes",
  "091": "Cautín",
  "133": "Chacabuco",
  "032": "Chañaral",
  "102": "Chiloé",
  "042": "Choapa",
  "063": "Colchagua",
  "081": "Concepción",
  "031": "Copiapó",
  "132": "Cordillera",
  "111": "Coyhaique",
  "073": "Curicó",
  "161": "Diguillín",
  "022": "El Loa",
  "041": "Elqui",
  "114": "General Carrera",
  "033": "Huasco",
  "011": "Iquique",
  "052": "Isla de Pascua",
  "162": "Itata",
  "043": "Limarí",
  "074": "Linares",
  "101": "Llanquihue",
  "053": "Los Andes",
  "121": "Magallanes",
  "134": "Maipo",
  "092": "Malleco",
  "058": "Marga Marga",
  "135": "Melipilla",
  "103": "Osorno",
  "104": "Palena",
  "152": "Parinacota",
  "054": "Petorca",
  "163": "Punilla",
  "055": "Quillota",
  "142": "Ranco",
  "056": "San Antonio",
  "057": "San Felipe",
  "131": "Santiago",
  "136": "Talagante",
  "071": "Talca",
  "014": "Tamarugal",
  "123": "Tierra del Fuego",
  "023": "Tocopilla",
  "124": "Ultima Esperanza",
  "141": "Valdivia",
  "051": "Valparaíso",
  "0": "Zona sin"
});

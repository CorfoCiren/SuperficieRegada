
exports.actualizarUsoSuelo = function(point, uso_suelo, c) {
  var startTime = new Date().getTime();
  
  // 1. Clear all dynamic panels
  c.usoSuelo.dynamicPanel.clear();
  c.usoSuelo.pan1.clear();
  
  // 2. Clear values
  c.usoSuelo.clase.setValue('');
  c.usoSuelo.uso.setValue('');
c.usoSuelo.tipo.setValue('');
c.usoSuelo.esp1.setValue('');
c.usoSuelo.esp2.setValue('');
c.usoSuelo.esp3.setValue('');
c.usoSuelo.esp4.setValue('');
c.usoSuelo.esp5.setValue('');
c.usoSuelo.esp6.setValue('');
c.usoSuelo.variedad.setValue('');
c.usoSuelo.com.setValue('');
c.usoSuelo.prov.setValue('');
c.usoSuelo.ori.setValue('');


  // Filter features by the point
  var features = uso_suelo.filterBounds(point);
  var count = features.size();

  // Use 'evaluate' to work with the number of features asynchronously
  count.evaluate(function(countVal) {
    if (countVal === 0) {
      //print('No se encontró información en las coordenadas seleccionadas.');
      c.usoSuelo.panel.style().set('shown', false);
      return;
    }
    
    // Get the first feature
    var featureList = features.toList(countVal);
    var feature = ee.Feature(featureList.get(0));
    
    // Retrieve the required properties without getInfo
    var comuna = feature.get('comuna').getInfo();
    var provincia = feature.get('provincia').getInfo();
    var uso = feature.get('usoactual').getInfo();
    var tipo = feature.get('tipo').getInfo();
    var especie1 = feature.get('especie1').getInfo();
    var variedad = feature.get('tipo').getInfo();
    var origen = feature.get('origen').getInfo();
    
    c.usoSuelo.ori.setValue('Origen: ' + origen);
    c.usoSuelo.dynamicPanel.insert(1,c.usoSuelo.ori);
    
    c.usoSuelo.com.setValue('Comuna: ' + comuna);
    c.usoSuelo.dynamicPanel.insert(2,c.usoSuelo.com);
    
    c.usoSuelo.prov.setValue('Provincia: ' + provincia);
    c.usoSuelo.dynamicPanel.insert(3,c.usoSuelo.prov);    
    
    c.usoSuelo.uso.setValue('Uso Suelo: ' + uso);
    c.usoSuelo.dynamicPanel.insert(4,c.usoSuelo.uso);
    
    c.usoSuelo.tipo.setValue('Tipo: ' + tipo);
    c.usoSuelo.dynamicPanel.insert(5,c.usoSuelo.tipo);
    
    c.usoSuelo.variedad.setValue('Variedad: ' + variedad);
    c.usoSuelo.dynamicPanel.insert(6,c.usoSuelo.variedad);
    
    c.usoSuelo.esp1.setValue('Especie 1: ' + especie1);
    c.usoSuelo.pan1.insert(0,c.usoSuelo.esp1); //las especies van en pan1
    
var especie2 = feature.get('ESPECIE2');
especie2.evaluate(function(especie2Val) {

  if (especie2Val !== null && especie2Val !== undefined && especie2Val !== '') {
    c.usoSuelo.esp2.setValue('Especie 2: ' + especie2Val);
    c.usoSuelo.pan1.insert(1, c.usoSuelo.esp2); 

    var especie3 = feature.get('ESPECIE3');
    
    especie3.evaluate(function(especie3Val) {
      if (especie3Val !== null && especie3Val !== undefined && especie3Val !== '') {
        c.usoSuelo.esp3.setValue('Especie 3: ' + especie3Val);
        c.usoSuelo.pan1.insert(2, c.usoSuelo.esp3); 

        var especie4 = feature.get('ESPECIE4');
        especie4.evaluate(function(especie4Val) {
          if (especie4Val !== null && especie4Val !== undefined && especie4Val !== '') {
            c.usoSuelo.esp4.setValue('Especie 4: ' + especie4Val);
            c.usoSuelo.pan1.insert(3, c.usoSuelo.esp4);

            var especie5 = feature.get('ESPECIE5');
            especie5.evaluate(function(especie5Val) {
              if (especie5Val !== null && especie5Val !== undefined && especie5Val !== '') {
                c.usoSuelo.esp5.setValue('Especie 5: ' + especie5Val);
                c.usoSuelo.pan1.insert(4, c.usoSuelo.esp5);

                var especie6 = feature.get('ESPECIE6');
                especie6.evaluate(function(especie6Val) {
                  if (especie6Val && typeof especie6Val === 'string' && especie6Val.trim() !== '') {
                    c.usoSuelo.esp6.setValue('Especie 6: ' + especie6Val);
                    c.usoSuelo.pan1.insert(5, c.usoSuelo.esp6);
                  }
                }); // Cierre de especie6.evaluate
              } // Cierre de if de especie5Val
            }); // Cierre de especie5.evaluate
          } // Cierre de if de especie4Val
        }); // Cierre de especie4.evaluate
      } // Cierre de if de especie3Val
    }); // Cierre de especie3.evaluate
  } // Cierre de if de especie2Val
}); // Cierre de especie2.evaluate

    
    
    
    
    c.usoSuelo.dynamicPanel.insert(7,c.usoSuelo.pan1);
    

    

    // Finally, show the panel
    c.usoSuelo.panel.style().set('shown', true);

    // End time and execution print
    var endTime = new Date().getTime();
    var executionTime = endTime - startTime;
    //print('Tiempo de ejecución funcion Uso. Suelo (ms):', executionTime);
  });
};
// Módulo: chartUtils.js

// 3. Función exportada
exports.chartArea = function(selectedSHAC,tablaArea) {
  
  // Verificar si tablaArea tiene elementos
  var size = tablaArea.size();
  var hasData = size.getInfo() > 0;
  
  if (!hasData) {
    // Si no hay datos, retornar un label informativo en lugar de un gráfico
    var noDataLabel = ui.Label({
      value: 'No hay datos disponibles para este SHAC en las temporadas seleccionadas.',
      style: {
        padding: '10px',
        fontSize: '14px',
        color: '#666'
      }
    });
    return noDataLabel;
  }
  
  // Formatear el nombre del SHAC: reemplazar guiones bajos con espacios
  // Función helper para formatear (se podría importar, pero por simplicidad lo dejamos aquí)
  var displaySHAC = selectedSHAC.replace(/_/g, ' ');
  

  //print('Área por temporada (ha) — ' + displaySHAC, tablaArea);
  var chart = ui.Chart.feature.byFeature({
    features: tablaArea,
    xProperty: 'periodo',
    yProperties: ['area_ha']
  })
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Área (ha) por Temporada — ' + displaySHAC,
    hAxis: { title: 'Temporada' },
    vAxis: { title: 'Área (ha)', viewWindow: {min: 0} },
    legend: { position: 'none' }
  });

  
  // 3.4 Devuelve la tabla por si quieres procesarla
  return chart;
};




exports.showHideChart = function(c) {
  var shown = true;
  var label = 'Ocultar gráfico';
  if (c.chart.shownButton.getLabel() === 'Ocultar gráfico') {
    shown = false;
    label = 'Mostrar gráfico';
  }
  c.chart.container.style().set({shown: shown});
  c.chart.shownButton.setLabel(label);
};




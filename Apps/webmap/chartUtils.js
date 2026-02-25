// Módulo: chartUtils.js

// 3. Función exportada
exports.chartArea = function(selectedSHAC, tablaArea) {
  var displaySHAC = selectedSHAC.replace(/_/g, ' ');

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




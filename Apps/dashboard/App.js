// Inicialización
var init = require('users/corfobbppciren2024/Dashboard_SR:Init');
var chartsUtils = require('users/corfobbppciren2024/Dashboard_SR:chart_SHAC');
var shac_layer = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/SHACs_IV_Region_MOD");
var uso_suelo = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Uso_de_Suelo/cut_Coquimbo_2021");
var s = require('users/corfobbppciren2023/Dashboard_SR:Style').style;
var region = ee.FeatureCollection("projects/humedad-y-superficie-regada/assets/Geometrias/Coquimbo");

var basePath = "users/corfobbppciren2024/SR_v30/";
var folderPath = "projects/humedad-y-superficie-regada/assets/MetricsSR";
var SHAC_Dict = init.SHAC_Dict;

// Pre-build reverse lookup: SHAC_ID → display name
// O(1) lookup instead of O(n) loop on every selector change
var SHAC_ReverseDict = {};
for (var key in SHAC_Dict) {
  if (SHAC_Dict[key] !== '') {
    SHAC_ReverseDict[SHAC_Dict[key]] = key.replace(/_/g, ' ');
  }
}

// Build selector items in a single pass (filter + map + sort combined)
var shac_items = Object.keys(SHAC_Dict)
  .filter(function(key) { return SHAC_Dict[key] !== ''; })
  .map(function(key) {
    return {
      label: key.replace(/_/g, ' '),
      value: SHAC_Dict[key]
    };
  })
  .sort(function(a, b) { return a.label.localeCompare(b.label); });

var shac_names = [{label: 'Todos los SHACs', value: 'Todos los SHACs'}].concat(shac_items);

var tablaArea = null;
var chartWidgetIrrigated = null;
var chartWidgetUsoSuelo = null;
var c = {};


// Get latest MetricsSR asset — pure client-side (eliminates ee.List().get().getInfo() round-trip)
var assetList = ee.data.listAssets(folderPath).assets;
var latestAssetId = assetList[assetList.length - 1].id;
var csv = ee.FeatureCollection(latestAssetId);


// Parse the JSON-encoded properties (use null geometry — no wasted Point(0,0) overhead)
var parsedCSV = csv.map(function(f) {
  var tempList = ee.String(f.get("Temp")).decodeJSON();
  var claseList = ee.String(f.get("CLASE")).decodeJSON();
  return ee.Feature(null, {
    SHAC_NAME: f.get('SHAC_NAME'),
    SHAC_ID: f.get('SHAC_ID'),
    Temp: tempList,
    CLASE: claseList
  });
});


// UI setup
c.chartPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical', false)});
ui.root.clear();
ui.root.add(c.chartPanel);


// SHAC charts panel
c.chartSHAC = {};
c.chartSHAC.panel = ui.Panel({layout: ui.Panel.Layout.flow('horizontal', false)});
c.chartSHAC.errorMessage = ui.Label('');
c.chartSHAC.errorMessage.style().set({
  color: 'red',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '10px',
  shown: false
});


// Cache for computeCSV results per SHAC (avoids recomputing on re-selection)
var _csvCache = {};

// Selector
c.chartSHAC.selector = ui.Select({
  items: shac_names,
  placeholder: 'Seleccione un SHAC',
  onChange: function(selectedSHAC) {

    var shacID = selectedSHAC;
    var shacNameForDisplay = null;

    if (selectedSHAC === 'Todos los SHACs') {
      shacID = '';
      shacNameForDisplay = 'Todos los SHACs';
    } else {
      // O(1) reverse lookup instead of for-in loop
      shacNameForDisplay = SHAC_ReverseDict[selectedSHAC] || selectedSHAC;
    }

    // Hide error initially
    c.chartSHAC.errorMessage.setValue('');
    c.chartSHAC.errorMessage.style().set('shown', false);

    // Filter CSV for selected SHAC
    var filteredCSV;
    if (shacID === '' || shacID === null) {
      filteredCSV = parsedCSV.filter(ee.Filter.or(
        ee.Filter.eq('SHAC_ID', ''),
        ee.Filter.eq('SHAC_ID', null)
      ));
    } else {
      filteredCSV = parsedCSV.filter(ee.Filter.eq('SHAC_ID', shacID));
    }

    // Async check if SHAC exists in CSV
    filteredCSV.size().evaluate(function(countVal) {
      if (countVal === 0) {
        c.chartSHAC.errorMessage.setValue('No existen datos de superficie regada para el SHAC seleccionado');
        c.chartSHAC.errorMessage.style().set('shown', true);

        if (chartWidgetIrrigated) {
          c.chartSHAC.panel.remove(chartWidgetIrrigated);
          chartWidgetIrrigated = null;
        }
        if (chartWidgetUsoSuelo) {
          c.chartSHAC.panel.remove(chartWidgetUsoSuelo);
          chartWidgetUsoSuelo = null;
        }
        return;
      }

      c.chartSHAC.errorMessage.setValue('');
      c.chartSHAC.errorMessage.style().set('shown', false);

      // Use cached computedCSV if available (avoids recomputing server-side objects)
      var cacheKey = shacID || '__todos__';
      var computedCSV;
      if (_csvCache[cacheKey]) {
        computedCSV = _csvCache[cacheKey];
      } else {
        computedCSV = chartsUtils.computeCSV(parsedCSV, shacID);
        _csvCache[cacheKey] = computedCSV;
      }

      var featuresConArea = chartsUtils.computeChartArea(computedCSV);
      tablaArea = ee.FeatureCollection(featuresConArea);

      // Chart: irrigated area by season
      var newChart = chartsUtils.chartArea(shacNameForDisplay || shacID, tablaArea);
      if (chartWidgetIrrigated) {
        c.chartSHAC.panel.remove(chartWidgetIrrigated);
      }
      chartWidgetIrrigated = newChart;
      chartWidgetIrrigated.style().set(s.chartSize);
      c.chartSHAC.panel.add(chartWidgetIrrigated);

      // Chart: land use by season
      newChart = chartsUtils.chartUsoSuelo(computedCSV, shacNameForDisplay || shacID);
      if (chartWidgetUsoSuelo) {
        c.chartSHAC.panel.remove(chartWidgetUsoSuelo);
      }
      chartWidgetUsoSuelo = newChart;
      chartWidgetUsoSuelo.style().set(s.chartSize);
      c.chartSHAC.panel.add(chartWidgetUsoSuelo);
    });
  }
});


// Global charts
c.chartGlobal = {};
c.chartGlobal.panel = ui.Panel({layout: ui.Panel.Layout.flow('horizontal', false)});

var globalUsoSuelo = chartsUtils.computeGlobalUsoSuelo(uso_suelo);
c.chartGlobal.usoSuelo = chartsUtils.chartGlobalUsoSuelo(globalUsoSuelo);
c.chartGlobal.panel.add(c.chartGlobal.usoSuelo);

var dataIrrigated = chartsUtils.computeGlobalRegada(parsedCSV, region, uso_suelo);
c.chartGlobal.chartIrrigated = chartsUtils.chartIrrigated(dataIrrigated);
c.chartGlobal.panel.add(c.chartGlobal.chartIrrigated);


// Trigger initial selection
c.chartSHAC.selector.setValue('Todos los SHACs');

// Add all widgets to main panel
c.chartPanel.add(c.chartSHAC.selector);
c.chartPanel.add(c.chartSHAC.errorMessage);
c.chartPanel.add(c.chartSHAC.panel);
c.chartPanel.add(c.chartGlobal.panel);

// Apply styles
c.chartSHAC.panel.style().set(s.globalPanel);
c.chartSHAC.selector.style().set(s.dropdownSHAC);
c.chartSHAC.panel.style().set(s.shacChartPanel);
c.chartGlobal.panel.style().set(s.globalPanel);
c.chartGlobal.usoSuelo.style().set(s.chartSize);
c.chartGlobal.chartIrrigated.style().set(s.chartSize);

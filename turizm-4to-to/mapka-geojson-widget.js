//Данная карта выводит слой geojson с привязаными к нему данными. В данном примере выводится только один показатель, но можно сделать несколько, добавив пару строчек в формирование данных.
//Отформатировать тултип или подсказку справа вверху можно в коде ниже, там есть комментарии
//Изменить стиль подсказки вверху можно через стиль, который подключается в начале кода.

//promise для корректного отображения preview
var loadHandler = null;
var loadedPromise = new Promise((resolve,reject)=>{
            // resolve();//вызвать когда виджет отрисовался
            loadHandler = resolve;
        });
setTimeout(loadHandler, 4000)

w.props = {
    defaultLatLan: [61.0042, 69.0019],                                                  //Значение широты и долготы по умолчанию. 
    defaultZoom: 10,                                                                    //Значение зума по умолчанию.
    maxZoom: 14,                                                                        //Максимальный зум
    minZoom : 9,                                                                        //Минимальный зум
    nameOfProperty: 'district_nm',                                                             //Имя свойства карты, по которому будут привязываться данные и которое будет показываться в подсказках.
    jsonURL: 'https://lms.matyx.ru/uploads/dict.d_division_district.json',                        //Путь доя geojson файла.
    tilesURL: 'https://lms.matyx.ru/uploads/tiles/{z}/{x}/{y}.png',                     //Путь до скаченных тайлов (т.е. скаченная карта). Если параметр не указан, карта работает онлайн.
    colorAxis: ['#FFEDA0', '#800026'],                                                  //Цвета в которые будут раскрашены полигоны. Слева минимальное значение, справа максимальное.
    axisSteps: 30,                                                                       //Кол-во шагов, которое будет использованно для цветовой оси.
    stepLegendWidth: '10px',                                                            //Ширина шага на легенде. Если шагов достаточно много, логично сделать ширину шага уже, т.к. легенда может быть очень ширикой.
};

//Подключение стилей и библиотеки Leaflet
const head = document.querySelector('head');
const leafletCSS = ` <link rel="stylesheet" href="https://unpkg.com/leaflet@1.8.0/dist/leaflet.css"
  integrity="sha512-hoalWLoI8r4UszCkZ5kL8vayOGVae1oxXe/2A4AO6J9+580uKHDO3JdHb7NzwwzK5xr/Fs0W40kiNHxM9vyTtQ=="
  crossorigin=""/>`;
head.insertAdjacentHTML('beforeend', leafletCSS);
const leafletJS = document.createElement('script');
leafletJS.async = false; 
leafletJS.src = 'https://unpkg.com/leaflet@1.8.0/dist/leaflet.js';
head.append(leafletJS);
const choroplet = document.createElement('script');
choroplet.async = false;
choroplet.src = 'https://cdn.jsdelivr.net/gh/cyxapbyad/visiology@main/choropleth.js';
head.append(choroplet);
//Стили для подсказки и легенды
const styleText = `
        .info {
            padding: 6px 8px;
            font: 14px/16px Arial, Helvetica, sans-serif;
            background: white;
            background: rgba(255,255,255,0.8);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            border-radius: 5px;
        }
        .info h4 {
            margin: 0 0 5px;
            color: #777;
        }
        .legend {
			color: #555;
			padding: 6px 8px;
			font: 12px Arial, Helvetica, sans-serif;
			font-weight: bold;
			background: white;
			background: rgba(255,255,255,0.8);
			box-shadow: 0 0 15px rgba(0,0,0,0.2);
			border-radius: 5px;
		}
		.legend ul {
			list-style-type: none;
			padding: 0;
			margin: 0;
			clear: both;
		}
		.legend li {
			display: inline-block;
			width: ${w.props.stepLegendWidth};
			height: 22px;
		}
		.legend .min {
			float: left;
			padding-bottom: 5px;
		}
		.legend .max {
			float: right;
}`;
const style = document.createElement('style');
style.insertAdjacentHTML('afterbegin', styleText);
head.append(style);

//Если бибилотека Leaflet полностью загружена, работаем с картой.
leafletJS.onload = async () => {
    // Проверяем не пустой ли контейнер с картой, что б не было ошибки, если не пустой очищаем.
    var container = L.DomUtil.get(w.general.renderTo);
    if(container !== null){ container._leaflet_id = null; }
    
    //Объявляем карту, начальные каоординаты и зум по умолчанию.
    var map = L.map(w.general.renderTo, {attributionControl: false}).setView(w.props.defaultLatLan, w.props.defaultZoom);
    //Основной слой карты
    var tiles = L.tileLayer(w.props.tilesURL ? w.props.tilesURL : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: w.props.maxZoom,
        minZoom: w.props.minZoom,
        //attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    //Загружаем geoJSON с районами Москвы. В данном примере в этом блоке карта еще и фильтруется, остаются только нужные полигоны.
    const districtJson = w.props.jsonURL;
    let district = await $.getJSON(districtJson, function (geojson) {return geojson});
    //district.features = district.features.filter(item => item.properties.name === "СК-ТТК" || item.properties.name === "ТТК-МКАД" || item.properties.name === "Внутри СК" || item.properties.name === "За МКАД")
    
    //Подготавливаем данные. Добавляем показатель из базы.
    w.data.rows.forEach((row, rowInd) => {
        district.features.forEach((dist, distInd) => {
            if (row[0] === dist.properties[w.props.nameOfProperty]) {
                dist.properties.value = w.data.values[0][rowInd];
                
            }
        })
    })
    
    //Добавляем слой geojson с помощью плагина короплет, который раскрасит полигоны по заданным параметрам.
    let choroplethLayer = L.choropleth(district, {
    	valueProperty: 'value', // какое свойство из фич использовать
    	scale: w.props.colorAxis, // chroma.js scale - include as many as you like
    	steps: w.props.axisSteps, // количество шагов для цветовой шкалы
    	mode: 'q', // q for quantile, e for equidistant, k for k-means
    	style: {
    		color: '#fff', // border color
    		weight: 2,
    		fillOpacity: 0.8,
    		dashArray: '3',
    	},
    // 	onEachFeature: function(feature, layer) {
    // 		layer.bindPopup(feature.properties.value)
    // 	}
    }).addTo(map)
    
    //Добавляем события over и out для мыши. (подсветка полигона, tooltip)
    let geojson;
    
    function highlightFeature(e) {
        var layer = e.target;
        //console.log(layer)
        layer.bindTooltip(`Район: ${layer.feature.properties[w.props.nameOfProperty]}`);   //Форматирование тултипа
        this.openTooltip();
    
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
    
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
        info.update(layer.feature.properties);
    }
    
    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        //this.closePopup();
        info.update();
    }
    
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }
    
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    }

    geojson = L.geoJson(district, {
        style: {
    		color: '#fff', // border color
    		weight: 2,
    		fillOpacity: 0,
    		dashArray: '',
    	},
        onEachFeature: onEachFeature
    }).addTo(map);
    
    var info = L.control();

    // Подсказка в правом верхнем углу
    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };
    
    // method that we will use to update the control based on feature properties passed
    //Тут можно отформатировать текст подсказки
    info.update = function (props) {
        this._div.innerHTML = '<h4>Популяция голубей</h4>' +  (props ?
            '<b>' + props[w.props.nameOfProperty] + '</b><br />' + (props.value ? props.value : '0') + ' голубей / м<sup>2</sup>'
            : 'Наведите на район');
    };
    
    info.addTo(map);
    
    
    // Add legend (don't forget to add the CSS from index.html)
  var legend = L.control({ position: 'bottomright' })
  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend')
    var limits = choroplethLayer.options.limits
    var colors = choroplethLayer.options.colors
    var labels = []

    // Add min & max
    div.innerHTML = '<div class="labels"><div class="min">' + limits[0] + '</div> \
			<div class="max">' + limits[limits.length - 1] + '</div></div>'

    limits.forEach(function (limit, index) {
      labels.push('<li style="background-color: ' + colors[index] + '"></li>')
    })

    div.innerHTML += '<ul>' + labels.join('') + '</ul>'
    return div
  }
  legend.addTo(map)
};

({
    isLoaded: function(){
        return loadedPromise
    }
})
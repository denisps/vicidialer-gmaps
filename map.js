var zips, in_or_out, db, int_reqs;

function loadScript(url) {
	var g = document.createElement('script');
	g.setAttribute('src', url);
	document.body.appendChild(g);
}

function zips_loaded() {
	document.dispatchEvent(new Event('circleUpdated'));
}

(function init() {
	loadScript('https://maps.googleapis.com/maps/api/js?key=Your-google-maps-api-key&callback=initMap');
	db = openDatabase('zip-map', '1.0', 'ZIP Map', 32 * 1024 * 1024);
	
	db.readTransaction(function (tx) {
		tx.executeSql(
			'SELECT count(zip) as c from zips',
			[],
			function (tx, res) {
				if (res.rows[0].c < 100) {
					loadScript('zips.js');
				} else {
					zips_loaded();
				}
			},
			null
		);
	});
})();

function initMap() {
	var data = document.forms[0].lead_filter_sql;
	var t = data.value.match(/\/\* ([0-9.,-]+)\r?\n([^*]+)\r?\n\*\/\r?\npostal_code (in|out) /);
	
	var view = t ? t[1].split(/,/) : [34.198292, -118.600913, 10];
	var areas = t ? t[2].split(/\r?\n/) : [];
	in_or_out = t && t[3] == 'out' ? t[3] : 'in';
	
	var db = openDatabase('zip-map', '1.0', 'ZIP Map', 32 * 1024 * 1024);
	
	function getZips(center, radius, callback) {
		db.readTransaction(function (tx) {
			var CUR_cos_lat = Math.cos(center.lat * Math.PI / 180);
			var CUR_sin_lat = Math.sin(center.lat * Math.PI / 180);
			var CUR_cos_lng = Math.cos(center.lng * Math.PI / 180);
			var CUR_sin_lng = Math.sin(center.lng * Math.PI / 180);
			var cos_allowed_distance = Math.cos(radius / 3959);
			tx.executeSql(
				'SELECT zip, lat, lng FROM zips WHERE ? * sin_lat + ? * cos_lat * (cos_lng * ? + sin_lng * ?) > ?',
				[CUR_sin_lat, CUR_cos_lat, CUR_cos_lng, CUR_sin_lng, cos_allowed_distance],
				function (tx, res) {
					callback(res.rows);
				},
				function (t, e) {
					alert(e.message);
					// couldn't read database
					//span.textContent = '(unknown: ' + e.message + ')';
				}
			);
		});
	}
	
	var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: +view[0], lng: +view[1]},
    zoom: +view[2],
    mapTypeId: 'roadmap'
  });

	function regenerate() {
			var zip_codes = {};
			var txt = '/* ' + view.join(',') + '\n';
			for (var i in areas) {
				var a = areas[i], z = Object.keys(a.zips);
				txt += [a.mycenter.lat, a.mycenter.lng, a.myradius].join(',') + '\n';
				//var zips = Array.prototype.slice.call(a.zips);
				for (var j in z)
					zip_codes[z[j]] = 1;
			}
			txt += '*/\n' + 'postal_code ' + in_or_out + ' (' + Object.keys(zip_codes).join(',') + ')';
			data.value = txt;
	}
	
	function circle(center, radius) {
		var c = new google.maps.Circle({
			strokeColor: '#000',
			strokeOpacity: 0.5,
			strokeWeight: 1,
			fillColor: '#000',
			fillOpacity: 0.15,
			editable: true,
			map: map,
			center: center,
			radius: radius * 1609.344
		});
		c.zips = {};
		
		google.maps.event.addListener(c, 'click', function(e) {
			c.setMap(null);
			for (var i in c.zips)
				c.zips[i].setMap(null);
			delete areas[areas.indexOf(c)];
			regenerate();
		});
		
		function makePin(pos) {
			var pin = new google.maps.Marker({
				position: pos,
				//animation: google.maps.Animation.DROP,
				title: '' + pos.zip
			});
			pin.setMap(map);
			return pin;
		}
		
		function circleUpdated(){
			c.myradius = c.getRadius() / 1609.344;
			center = c.getCenter();
			center = c.mycenter = { lat: center.lat(), lng: center.lng() };
			getZips(c.mycenter, c.myradius, function(res) {
				var z = {};
				
				for (var i = 0; i < res.length; i++) {
					var zip = res[i].zip;
					z[zip] = c.zips[zip] || makePin(res[i]);
					delete c.zips[zip];
				}
				
				for (var i in c.zips) // If pin not needed, delete it
					c.zips[i].setMap(null);
				
				c.zips = z;
				regenerate();
			});
		}
		
		google.maps.event.addListener(c, 'center_changed', circleUpdated);
		google.maps.event.addListener(c, 'radius_changed', circleUpdated);
		
		var event = new Event('circleUpdated');
		document.addEventListener('circleUpdated', circleUpdated, false);
		
		setTimeout(circleUpdated, 100);
		
		return c;
	}

  for (var i in areas) {
    var a = areas[i].split(/,/g);
		areas[i] = circle({lat: +a[0], lng: +a[1]}, +a[2]);
  }
	
	map.addListener('click', function(e) {
    areas.push(circle({ lat: e.latLng.lat(), lng: e.latLng.lng() }, 4));
  });

	map.addListener('zoom_changed', function() {
		view[2] = map.getZoom();
		regenerate();
  });
	
	map.addListener('center_changed', function() {
		var c = map.getCenter();
		view[0] = c.lat();
		view[1] = c.lng();
		regenerate();
  });
	
}

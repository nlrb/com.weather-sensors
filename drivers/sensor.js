"use strict";

/*
Copyright (c) 2016 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
   Generic weather sensor driver
*/

const utils = require('utils');

const locale = Homey.manager('i18n').getLanguage() == 'nl' ? 'nl' : 'en'; // only Dutch & English supported

var Sensors = new Map(); // all sensors we've found
var Devices = new Map(); // all devices that have been added

const ACTIVE = 1;
const INACTIVE = 2;
var inactiveTime = 60000;
var activityNotifications = 2;

function updateAppSettings() {
	let appSettings = Homey.manager('settings').get('app');
	if (appSettings) {
		inactiveTime = appSettings.inactive * 1000;
		activityNotifications = appSettings.notify;
	}
}
updateAppSettings();

Homey.manager('settings').on('set', function(name) {
	if (name === 'app') {
		updateAppSettings();
	}
});

const capability = {
	temperature: 'measure_temperature',
	humidity: 'measure_humidity',
	pressure: 'measure_pressure',
	rainrate: 'measure_rain',
	raintotal: 'meter_rain',
	direction: 'measure_wind_angle',
	currentspeed: 'measure_gust_strength',
	averagespeed: 'measure_wind_strength',
	uvindex: 'measure_ultraviolet',
	brightness: 'measure_luminance',
	lowbattery: 'alarm_battery'
}

const genericType = {
	L: { txt: { en: 'Brightness', nl: 'Lichtsterkte' } },
	R: { txt: { en: 'Rain gauge', nl: 'Regenmeter' } },
	T: { txt: { en: 'Temperature', nl: 'Temperatuur' } },
	TH: { txt: { en: 'Temperature/humidity', nl: 'Temperatuur/vochtigheid' } },
	THB: { txt: { en: 'Weather station', nl: 'Weerstation' } },
	UV: { txt: { en: 'Ultra Violet' } },
	W: { txt: { en: 'Anemometer', nl: 'Windmeter' } }
}

// determineType: determine which sensor type fits best
function determineType(data) {
	let type;
	if (data.pressure !== undefined) {
		type = 'THB';
	} else if (data.humidity !== undefined) {
		type = 'TH';
	} else if (data.currentspeed !== undefined || data.averagespeed !== undefined) {
		type = 'W';
	} else if (data.raintotal !== undefined || data.rainrate !== undefined) {
		type = 'R';
	} else if (data.uvindex !== undefined) {
		type = 'UV';
	} else if (data.brightness !== undefined) {
		type = 'L';
	} else if (data.temperature !== undefined) {
		type = 'T';
	}
	return type;
}

// Update the sensor data
function update(signal) {
	let result = signal.getResult();
	if (typeof result !== 'string' && result != null) {
		let when = result.lastupdate.toString();
		let did = result.protocol + ':' + result.id + ':' + (result.channel || 0);
		if (Sensors.get(did) === undefined) {
			Sensors.set(did, { raw: { data: {} } });
			signal.debug('Found a new sensor. Total found is now', Sensors.size);
		}
		let current = Sensors.get(did).raw;
		let device = Devices.get(did);
		// Check if a value has changed
		let newdata = false;
		let newvalue = JSON.parse(JSON.stringify(result));
		newvalue.data = current.data;
		for (let c in result.data) {
			if (result.data[c] !== newvalue.data[c]) {
				newdata = true;
				newvalue.data[c] = result.data[c];
				let cap = capability[c];
				if (device != null && cap != null) {
					device.driver.realtime(device.device_data, cap, newvalue.data[c], function(err, success) {
						signal.debug('Real-time', cap, 'update', (err ? err : 'OK'));
					});
				}
			}
		}
		// Determine the sensor type based on its values
		newvalue.type = determineType(newvalue.data);
		if (newvalue.type !== undefined) {
			signal.debug('Sensor value has changed:', newdata);

			// Add additional data
			newvalue.count = (current.count || 0) + 1;
			newvalue.newdata = newdata;
			// Update settings
			if (device != null) {
				if (!device.available) {
					device.driver.setAvailable(device.device_data);
					if (activityNotifications & ACTIVE) {
						Homey.manager('notifications').createNotification({
							excerpt: __('notification.active', { name: device.name })
						});
					}
					device.available = true;
				}
				device.update = when;
				Devices.set(did, device);
				device.driver.setSettings(device.device_data, { update: when }, function(err, result){
					if (err) { signal.debug('setSettings error:', err); }
				});
			}
			// Update the sensor log
			let display = {
				protocol: signal.getName(),
				type: genericType[newvalue.type].txt[locale] || genericType[newvalue.type].txt.en,
				name: newvalue.name,
				channel: (newvalue.channel ? newvalue.channel.toString() : '-'),
				id: newvalue.id,
				update: when,
				data: newvalue.data,
				paired: device !== undefined,
				name: device !== undefined ? device.name : ''
			}
			Sensors.set(did, { raw: newvalue, display: display });
			//signal.debug(Sensors);
			// Send an event to the front-end as well for the app settings page
			Homey.manager('api').realtime('sensor_update', Array.from(Sensors.values()).map(x => x.display));
		} else {
			signal.debug('ERROR: cannot determine sensor type for data', newvalue);
		}
	}
}

// getSensors: return a list of sensors of type <x>
function getSensors(type) {
	var list = [];
	for (let i of Sensors.keys()) {
		let val = Sensors.get(i);
		if (type != null && val.raw.type == type) {
			let capabilities = [];
			// Add sensor capabilities based on sensor values
			for (let v in val.raw.data) {
				utils.debug(v, capability[v]);
				if (capability[v] !== undefined) {
					capabilities.push(capability[v]);
				}
			}
			utils.debug(capabilities, val.raw.data);
			list.push({
				name: val.raw.name || (type + ' ' + val.raw.id),
				data: {	id: i, type: type },
				capabilities: capabilities,
				settings: {
					protocol: val.display.protocol,
					type: val.raw.name || val.display.type,
					channel: val.display.channel || 0,
					id: val.raw.id,
					update: val.display.update
				}
			});
		}
	}
	return list;
}

// addSensorDevice
function addSensorDevice(driver, device_data, name) {
	let device = {
		driver: driver,
		device_data: device_data,
		name: name,
		available: true
	}
	driver.getSettings(device_data, function(err, result){
		if (!err) { device.update = result.update };
		Devices.set(device_data.id, device);
	});
	let sensor = Sensors.get(device_data.id);
	if (sensor !== undefined) {
		sensor.display.paired = true;
		sensor.display.name = name;
		Sensors.set(device_data.id, sensor);
	}
}

// deleteSensorDevice
function deleteSensorDevice(device_data) {
	Devices.delete(device_data.id);
	let sensor = Sensors.get(device_data.id);
	if (sensor != null) {
		sensor.display.paired = false;
		sensor.display.name = '';
		Sensors.set(device_data.id, sensor);
	}
}

// updateDeviceName
function updateDeviceName(device_data, new_name) {
	let dev = Devices.get(device_data.id);
	dev.name = new_name;
	Devices.set(device_data.id, dev);
}

// getSensorValue
function getSensorValue(what, id) {
	let val = Sensors.get(id);
	if (val != null) {
		val = val.raw.data[what];
	}
	return val;
}

// heathCheck: check if sensor values keep being updated
function healthCheck() {
	let now = new Date();
	// Iterate over sensors
	Sensors.forEach((sensor, key) => {
		// Only remove if there is no Homey device associated
		if (!sensor.display.paired && (now - Date.parse(sensor.raw.lastupdate) > inactiveTime)) {
			Sensors.delete(key);
		}
	});
	// Iterate over devices
	Devices.forEach((device, key) => {
		// Check if the device needs to be set unavailable
		if (device.available && now - Date.parse(device.update) > inactiveTime) {
			device.driver.setUnavailable(device.device_data, __('error.no_data', { since: now }));
			device.available = false;
			if (activityNotifications & INACTIVE) {
				Homey.manager('notifications').createNotification({
					excerpt: __('notification.inactive', { name: device.name })
				});
			}
		}
	});
}

// Set up check to mark devices inactive, remove sensors
setInterval(healthCheck, 1000);

// Create a driver for a specific sensor type
function createDriver(driver) {
	var self = {

		init: function(devices_data, callback) {
			devices_data.forEach(function(device_data) {
				// Get the Homey name of the device
				self.getName(device_data, function(err, name) {
					addSensorDevice(self, device_data, name);
				});
			});
			// we're ready
			callback();
		},

		capabilities: {
			measure_temperature: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('temperature', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_humidity: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('humidity', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_pressure: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('pressure', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_rain: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('rainrate', device_data.id);
							callback(null, val);
						}
				}
			},
			meter_rain: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('raintotal', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_wind_angle: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('direction', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_gust_strength: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('currentspeed', device_data.id);
							callback(null, val);
						}
				}
			},
			measure_wind_strength: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('averagespeed', device_data.id);
							callback(null, val);
						}
				}
			},
			alarm_battery: {
				get: function(device_data, callback) {
						if (typeof callback == 'function') {
							var val = getSensorValue('lowbattery', device_data.id);
							callback(null, val);
						}
				}
			}
		},

		added: function(device_data, callback) {
			// Update driver administration when a device is added
			self.getName(device_data, function(err, name) {
				addSensorDevice(self, device_data, name);
			});

			callback();
		},

		renamed: function(device_data, new_name) {
			updateDeviceName(device_data, new_name);
		},

		deleted: function(device_data) {
			// Run when the user has deleted the device from Homey
			deleteSensorDevice(device_data);
		},

		pair: function(socket) {
			utils.debug('Sensor', driver, 'pairing has started...');

			// This method is run when Homey.emit('list_devices') is run on the front-end
			// which happens when you use the template `list_devices`
			socket.on('list_devices', function(data, callback) {
				var devices = getSensors(driver);
				utils.debug(driver, devices)
				// err, result style
				callback(null, devices);
			});
		}
	}
	return self;
}

module.exports = {
	createDriver: createDriver,
	getSensors: () => Array.from(Sensors.values()).map(x => x.display),
	update: update
};

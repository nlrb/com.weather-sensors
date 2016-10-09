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

var Sensors = {}; // all sensors we've found
var Devices = {}; // all devices that have been added

var capability = {
	temperature: 'measure_temperature',
	humidity: 'measure_humidity',
	rainrate: 'measure_rain',
	raintotal: 'meter_rain',
	direction: 'measure_wind_angle',
	currentspeed: 'measure_gust_strength',
	averagespeed: 'measure_wind_strength',
	lowbattery: 'alarm_battery'
}

// Update the sensor data
function update(result) {
	var sendRealtime = (device, r, newVal) => {
		if (device != null) {
			var cap = capability[r];
			if (cap != null) {
				device.driver.realtime(device.device_data, cap, newVal, function(err, success) {
					utils.debug('Real-time', cap, 'update', (err ? err : 'OK'));
				});
			}
		}
	}
	var newdata = false;
	if (typeof result != 'string' && result != null) {
		var id = result.protocol + ':' + result.id + ':' + result.channel;
		if (Sensors[id] == null) {
			Sensors[id] = { data: {} };
			utils.debug('Found a new sensor. Total found is now', (Object.keys(Sensors).length));
		}
		// Check if a value has changed
		for (var r in result) {
			if (r == 'data') {
				for (var c in result.data) {
					if (result.data[c] != Sensors[id].data[c]) {
						newdata = true;
						sendRealtime(Devices[id], c, result.data[c])
					}
				}
			} else {
				if (result[r] != Sensors[id][r]) {
					newdata = true;
					sendRealtime(Devices[id], r, result[r]);
				}
			}
		}
		utils.debug('Sensor value has changed:', newdata);
		
		// Add additional data
		result.lastupdate = new Date();
		result.count = (Sensors[id].count || 0) + 1;
		result.newdata = newdata;
		// Update the sensor log
		Sensors[id] = result;
		utils.debug(Sensors);
	} else {
		utils.debug('Error:', result);
	}
	
	return newdata;
}

// getSensors: return a list of sensors of type <x>
function getSensors(type) {
	var list = [];
	for (var i in Sensors) {
		if (Sensors[i].type == type) {
			list.push({ 
				name: Sensors[i].name || (type + ' ' + Sensors[i].id),
				data: {	id: i, type: type }
			});
		}
	}
	return list;
}

// addSensorDevice
function addSensorDevice(driver, device_data, name) {
	Devices[device_data.id] = {
		driver: driver,
		device_data: device_data,
		name: name
	}
}

// deleteSensorDevice
function deleteSensorDevice(device_data) {
	delete Devices[device_data.id];
}

// updateDeviceName
function updateDeviceName(device_data, new_name) {
	Devices[device_data.id].name = new_name;
}

// getSensorValue
function getSensorValue(what, id) {
	var val;
	if (Sensors[id] != null && Sensors[id].data != null) {
		val = Sensors[id].data[what] || Sensors[id][what];
	}
	return val;
}

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
	update: update
};
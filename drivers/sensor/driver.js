'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')
const protocols = require('protocols')
const utils = require('utils')

const ACTIVE = 1;
const INACTIVE = 2;
// Default settings:
var inactiveTime = 180000; // 30 mins
var activityNotifications = 0; // no notifications
/*
function updateAppSettings() {
	let appSettings = this.homey.settings.get('app');
	if (appSettings) {
		inactiveTime = appSettings.inactive * 1000;
		activityNotifications = appSettings.notify;
	}
}
updateAppSettings();

this.homey.settings.on('set', function (name) {
	if (name === 'app') {
		updateAppSettings();
	}
});*/

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
	forecast: 'measure_forecast',
	lowbattery: 'alarm_battery'
}

const genericType = {
	L: { txt: { en: 'Brightness', nl: 'Lichtsterkte' }, icon: '/drivers/luminance/assets/icon.svg' },
	R: { txt: { en: 'Rain gauge', nl: 'Regenmeter' }, icon: '/drivers/rain/assets/icon.svg' },
	T: { txt: { en: 'Temperature', nl: 'Temperatuur' }, icon: '/drivers/temp/assets/icon.svg' },
	TH: { txt: { en: 'Temperature/humidity', nl: 'Temperatuur/vochtigheid' }, icon: '/drivers/temphum/assets/icon.svg' },
	THB: { txt: { en: 'Weather station', nl: 'Weerstation' }, icon: '/drivers/temphumbar/assets/icon.svg' },
	UV: { txt: { en: 'Ultra Violet' }, icon: '/drivers/uv/assets/icon.svg' },
	W: { txt: { en: 'Anemometer', nl: 'Windmeter' }, icon: '/drivers/wind/assets/icon.svg' }
}


class SensorDriver extends Homey.Driver {

	onInit() {
		this.log('SensorDriver Init')
		this.Sensors = new Map() // all sensors we've found
		this.Devices = new Map() // all devices that have been added
		this.locale = this.homey.i18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported

		// Set up check to mark devices inactive, remove sensors
		this.homey.setInterval(this.healthCheck.bind(this), 1000)

		this.signals = {}
		this.protocols = {}

		// Read app settings for protocol selection
		let setting = this.homey.settings.get('protocols');
		this.log('settings', setting);
		if (setting == null) {
			// No setting? Register all signals
			setting = {}
			let ws = utils.WeatherSignal.get()
			for (let sig in ws) {
				let s = ws[sig]
				setting[s] = { watching: true }
			}
			this.homey.settings.set('protocols', setting)
		}
		this.registerSignals(setting)

		// Catch setting changes
		this.homey.settings.on('set', key => {
			if (key === 'protocols') {
				let setting = this.homey.settings.get('protocols')
				if (setting != null) {
					this.registerSignals(setting)
				}
			}
		})
	}

	// Generic sensor pairing (NOT USED)
	onPair(socket) {
		this.log('Pairing started')

		socket.setHandler('list_devices', async (data) => {
			let devices = []
			for (let t in genericType) {
				devices = devices.concat(this.getSensors(t))
			}
			return devices
		})
	}

	// heathCheck: check if sensor values keep being updated
	healthCheck() {
		let now = new Date()
		// Iterate over sensors
		this.Sensors.forEach((sensor, key) => {
			// Only remove if there is no Homey device associated
			if (sensor.display !== undefined && sensor.raw !== undefined) {
				if (!sensor.display.paired && (now - Date.parse(sensor.raw.lastupdate) > inactiveTime)) {
					this.log('Removing', key, 'from display list')
					this.Sensors.delete(key);
				}
			}
		})
		// Iterate over devices
		this.Devices.forEach((device, key) => {
			// Check if the device needs to be set unavailable
			let last = device.getSetting('update')
			if (device.getAvailable() && now - Date.parse(last) > inactiveTime) {
				this.log('Marking', key, 'as inactive')
				device.setUnavailable(Homey.__('error.no_data', { since: last }))
					.catch(err => this.error('Cannot mark device as unavailable', err.message))
				if (activityNotifications & INACTIVE) {
					Homey.ManagerNotifications.registerNotification({
						excerpt: Homey.__('notification.inactive', { name: device.getName() })
					});
				}
			}
		})
	}

	// Update the sensor data
	update(signal) {
		let result = signal.getResult();
		this.log('update ' + result)
		if (this.Sensors !== undefined && typeof result !== 'string' && result != null) {
			let when = result.lastupdate.toString();
			let pid = result.pid || result.protocol;
			let did = pid + ':' + result.id + ':' + (result.channel || 0);
			if (this.Sensors.get(did) === undefined) {
				this.Sensors.set(did, { raw: { data: {} } });
				signal.debug('Found a new sensor. Total found is now', this.Sensors.size);
			}
			let current = this.Sensors.get(did).raw;
			// Check if a value has changed
			let newdata = false;
			let newvalue = JSON.parse(JSON.stringify(result));
			newvalue.data = current.data;
			for (let c in result.data) {
				if (result.data[c] !== newvalue.data[c]) {
					newdata = true;
					newvalue.data[c] = result.data[c];
					let cap = capability[c];
					if (cap !== undefined) {
						let val = this._mapValue(c, newvalue.data[c]);
						this.emit('value:' + did, cap, val)
					}
				}
			}
			this.emit('update:' + did, when)

			// Determine the sensor type based on its values
			newvalue.type = this._determineType(newvalue.data);
			if (newvalue.type !== undefined) {
				signal.debug('Sensor value has changed:', newdata);

				// Add additional data
				newvalue.count = (current.count || 0) + 1;
				newvalue.newdata = newdata;

				let device = this.Devices.get(did)
				let name = newvalue.name
				if (device) {
					name = device.getName()
				}

				// Update the sensor log
				let display = {
					protocol: signal.getName(),
					type: genericType[newvalue.type].txt[this.locale] || genericType[newvalue.type].txt.en,
					icon: genericType[newvalue.type].icon,
					name: name,
					channel: (newvalue.channel ? newvalue.channel.toString() : '-'),
					id: newvalue.id,
					update: when,
					data: newvalue.data,
					paired: this.Devices.has(did)
				}
				this.Sensors.set(did, { raw: newvalue, display: display });
				//signal.debug(this.Sensors);
				// Send an event to the front-end as well for the app settings page
				this.homey.api.realtime('sensor_update', Array.from(this.Sensors.values()).map(x => x.display));
			} else {
				signal.debug('ERROR: cannot determine sensor type for data', newvalue);
			}
		}
	}

	// Register all needed signals with Homey
	registerSignals(setting) {
		this.log("registerSignals");
		for (let s in protocols) {
			this.log("protocol " + s, setting[s])
			let signal = new protocols[s];
			this.protocols[s] = { id: s, name: signal.getName(), hint: signal.getHint(this.locale) };
			if (setting && setting[s]) {
				if (setting[s].watching && this.signals[s] === undefined) {
					// Register signal defitinion with Homey
					let gs = signal.getSignal();
					this.log('Registering signal', gs.def);
					this.signals[s] = new Homey.Signal433(gs.def);
					this.signals[s].enableRX().then((success) => {
						utils.debug('Signal', s, 'registered.', success);
						// Register data receive event
						this.signals[s].on('payload', (payload, first) => {
							signal.debug('Received payload for', signal.getName());
							signal.debug(payload.length, payload);
							if (signal.parser(payload)) {
								if (typeof this.update === 'function') {
									this.update(signal);
									let stats = signal.getStatistics();
									// Only send needed statistics
									this.homey.api.realtime('stats_update', { protocol: s, stats: { total: stats.total, ok: stats.ok } });
								}
							}
						})
					}, err => utils.debug('Signal', s, '; err', err))
				} else if (!setting[s].watching && this.signals[s] !== undefined) {
					// Un-register signal with Homey
					this.signals[s].disableRX()
					delete this.signals[s]
					utils.debug('Signal', s, 'unregistered.')
				}
			}
		}
	}

	// determineType: determine which sensor type fits best
	_determineType(data) {
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

	_mapValue(cap, val) {
		// language mapping for string type values
		if (typeof val === 'string') {
			val = Homey.__('mobile.' + cap + '.' + val)
		}
		return val;
	}

	// getSensorValues
	getSensorValues(id) {
		let val = this.Sensors.get(id)
		let result = []
		if (val !== undefined) {
			for (let what in val.raw.data) {
				if (capability[what] !== undefined) {
					result.push({ cap: capability[what], value: this._mapValue(what, val.raw.data[what]) })
				}
			}
		}
		return result
	}

	// Get app settings which notifications to send (used by device)
	getActivityNotifications() {
		return activityNotifications
	}

	// getSensors: return a list of sensors of type <x>
	getSensors(type) {
		var list = [];
		for (let i of this.Sensors.keys()) {
			let val = this.Sensors.get(i);
			if (type != null && val.raw.type == type) {
				let capabilities = [];
				// Add sensor capabilities based on sensor values
				for (let v in val.raw.data) {
					//this.log(v, capability[v]);
					if (capability[v] !== undefined) {
						capabilities.push(capability[v]);
					}
				}
				this.log(capabilities, val.raw.data);
				let device = {
					name: val.raw.name || (val.display.protocol + ': ' + type + ' ' + val.raw.id),
					data: { id: i, type: type },
					capabilities: capabilities,
					settings: {
						protocol: val.display.protocol,
						type: val.raw.name || val.display.type,
						channel: val.display.channel || 0,
						id: val.raw.id,
						update: val.display.update
					}
				}
				list.push(device);
			}
		}
		return list;
	}

	getAllSensors() {
		return Array.from(this.Sensors.values()).map(x => x.display)
	}

}

module.exports = SensorDriver

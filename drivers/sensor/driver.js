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
const SensorDevice = require('../sensor/device.js')
const Events = require('events')

const ACTIVE = 1;
const INACTIVE = 2;

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
	L: { txt: { en: 'Brightness', nl: 'Lichtsterkte', pl: 'Jasność' }, icon: '/drivers/luminance/assets/icon.svg' },
	R: { txt: { en: 'Rain gauge', nl: 'Regenmeter', pl: 'Deszczomierz' }, icon: '/drivers/rain/assets/icon.svg' },
	T: { txt: { en: 'Temperature', nl: 'Temperatuur', pl: 'Temperatura' }, icon: '/drivers/temp/assets/icon.svg' },
	TH: { txt: { en: 'Temperature/humidity', nl: 'Temperatuur/vochtigheid', pl: 'Temperatura/Wilgotność' }, icon: '/drivers/temphum/assets/icon.svg' },
	THB: { txt: { en: 'Weather station', nl: 'Weerstation', pl: 'Stacja pogodowa' }, icon: '/drivers/temphumbar/assets/icon.svg' },
	UV: { txt: { en: 'Ultra Violet', pl: 'Ultrafiolet' }, icon: '/drivers/uv/assets/icon.svg' },
	W: { txt: { en: 'Anemometer', nl: 'Windmeter', pl: 'Wiatromierz' }, icon: '/drivers/wind/assets/icon.svg' }
}

class SensorHelper extends Events {

	// Default settings:
	inactiveTime = 180000; // 30 mins
	activityNotifications = 0; // no notifications

	constructor(driver) {
		super();
		this.driver = driver;
		this.Sensors = new Map() // all sensors we've found
		this.Devices = new Map() // all devices that have been added
		this.locale = driver.homey.i18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported

		// Set up check to mark devices inactive, remove sensors
		this.driver.homey.setInterval(this.healthCheck.bind(this), 1000)

		this.signals = {}
		this.protocols = {}

		// Read app settings for protocol selection
		let setting = this.driver.homey.settings.get('protocols');
		this.driver.log('settings', setting);
		if (setting == null) {
			// No setting? Register all signals
			setting = {}
			let ws = utils.WeatherSignal.get()
			for (let sig in ws) {
				let s = ws[sig]
				setting[s] = { watching: true }
			}
			this.driver.homey.settings.set('protocols', setting)
		}
		this.registerSignals(setting)

		// Catch setting changes
		this.driver.homey.settings.on('set', key => {
			if (key === 'protocols') {
				let setting = driver.homey.settings.get('protocols')
				if (setting != null) {
					this.registerSignals(setting)
				}
			} else if (key === 'app') {
				this.updateAppSettings();
			}
		})

		this.updateAppSettings();
	}

	updateAppSettings() {
		let appSettings = this.driver.homey.settings.get('app');
		if (appSettings) {
			this.inactiveTime = appSettings.inactive * 1000;
			this.activityNotifications = appSettings.notify;
		}
	}

	// healthCheck: check if sensor values keep being updated
	healthCheck() {
		let now = new Date();

		// Iterate over sensors
		this.Sensors.forEach((sensor, key) => {
			// Only remove if there is no Homey device associated
			if (sensor.display !== undefined && sensor.raw !== undefined) {
				if (!sensor.display.paired && (now - sensor.raw.lastupdate > this.inactiveTime)) {
					this.driver.log('Removing', key, 'from display list');
					this.Sensors.delete(key);
				}
			}
		})
		// Iterate over devices
		this.Devices.forEach((device, key) => {
			// Check if the device needs to be set unavailable
			let last = device.getSetting('update');
			let lastUTC = device.getStoreValue('update');
			// Due to a Homey bug that converts the Date type to String in the store, we have to parse the value
			if (device.getAvailable() && now - Date.parse(lastUTC) > this.inactiveTime) {
				this.driver.log('Marking', key, 'as inactive');
				device.setUnavailable(this.driver.homey.__('error.no_data', { since: last }))
					.catch(err => this.driver.error('Cannot mark device as unavailable', err.message))
				if (this.activityNotifications & INACTIVE) {
					this.driver.homey.notifications.createNotification({
						excerpt: this.driver.homey.__('notification.inactive', { name: device.getName() })
					});
				}
			}
		})
	}

	// Update the sensor data
	update(signal) {
		let result;
		while ((result = signal.getResult()) != null) {
			if (this.Sensors !== undefined && typeof result !== 'string' && result != null && result.valid) {
				let tz = this.driver.homey.clock.getTimezone();
				let when = result.lastupdate.toLocaleString(this.driver.homey.i18n.getLanguage(), { timeZone: tz });
				let whenUTC = result.lastupdate; // UTC
				let pid = result.pid || result.protocol;
				let did = pid + ':' + result.id + ':' + (result.channel || 0);
				if (this.Sensors.get(did) === undefined) {
					this.Sensors.set(did, { raw: { data: {} } });
					signal.debug('Found a new sensor. Total found is now', this.Sensors.size);
				}
				let current = this.Sensors.get(did).raw;
				// Check if a value has changed
				let newdata = false;
				let newvalue = {
					...result,
					data: current.data
				};
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
				this.emit('update:' + did, when, whenUTC);

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
					this.driver.homey.api.realtime('sensor_update', Array.from(this.Sensors.values()).map(x => x.display));
				} else {
					signal.debug('ERROR: cannot determine sensor type for data', newvalue);
				}
			}
		}
	}

	// Register all needed signals with Homey
	registerSignals(setting) {
		this.driver.log('registerSignals');
		for (let s in protocols) {
			this.driver.log('protocol', s, setting[s])
			let signal = new protocols[s];
			this.protocols[s] = { id: s, name: signal.getName(), hint: signal.getHint(this.locale) };
			if (setting && setting[s]) {
				if (setting[s].watching && this.signals[s] === undefined) {
					// Register signal defitinion with Homey
					let gs = signal.getSignal();
					this.driver.log('Registering signal', gs.def);
					this.signals[s] = this.driver.homey.rf.getSignal433(gs.def);
					this.signals[s].enableRX().then(() => {
						utils.debug('Signal', s, 'registered.');
						// Register data receive event
						this.signals[s].on('payload', (payload, first) => {
							signal.debug('Received payload for', signal.getName());
							signal.debug(payload.length, payload);
							if (signal.parser(payload)) {
								if (typeof this.update === 'function') {
									this.update(signal);
									let stats = signal.getStatistics();
									// Only send needed statistics
									this.driver.homey.api.realtime('stats_update', { protocol: s, stats: { total: stats.total, ok: stats.ok } });
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
			val = this.driver.homey.__('mobile.' + cap + '.' + val)
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
		return this.activityNotifications;
	}

	// getSensors: return a list of sensors of type <x>
	getSensors(type, protocol) {
		var list = [];
		for (let i of this.Sensors.keys()) {
			if (protocol === undefined || protocol === i.split(':')[0]) {
				let val = this.Sensors.get(i);
				if (type != null && val.raw.type == type) {
					let capabilities = [];
					// Add sensor capabilities based on sensor values
					for (let v in val.raw.data) {
						//this.driver.log(v, capability[v]);
						if (capability[v] !== undefined) {
							capabilities.push(capability[v]);
						}
					}
					this.driver.log(capabilities, val.raw.data);
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
		}
		return list;
	}

	getAllSensors() {
		return Array.from(this.Sensors.values()).map(x => x.display)
	}

	removeSensor(id) {
		this.removeAllListeners('value:' + id);
    this.removeAllListeners('update:' + id);
    this.Devices.delete(id);
    let sensor = this.Sensors.get(id);
    sensor.display.paired = false;
    this.Sensors.set(id, sensor);
	}

}

class SensorDriver extends Homey.Driver {

	onInit() {
		this.sensorDriver = this.homey.drivers.getDriver('sensor');
		// Only exectute the initialization once
		if (this === this.sensorDriver) {
			this.log('SensorHelper Init');
			this.helper = new SensorHelper(this);
		} else {
			this.helper = this.sensorDriver.helper;
		}
	}

	// Generic sensor pairing
	_onPair(session, type) {
		this.log('Pairing started for type', type);

    session.setHandler('list_devices', async (data) => {
      let devices = this.helper.getSensors(type);
      return devices;
    });
	}

	onRepair(session, device) {
		let id = device.id;
		let type = device.getData().type;
    let pid = id.split(':')[0];
    this.log('Repairing started for device', device.getName(), 'of type', type, 'and with protocol', pid);

    session.setHandler('list_devices', async (data) => {
      let devices = this.helper.getSensors(type, pid);
      return devices;
    })

		session.setHandler('repair_device', async (data) => {
			this.log('repair_device', data);
			let newId = data.id;
			// Remove device with current ID
			device.onDeleted();
			// Update the device settings with the new ID
			await device.setSettings({ id: newId.split(':')[1] });
			// Set an override iD in the device store
			await device.setStoreValue('repairId', newId);
			// Initialize device with new ID§
			device.onInit();
	    // Close the repair session
			await session.done();
		})
	}

  onMapDeviceClass(device) {
    this.log('Mapping device', device.getName());
    return SensorDevice;
  }

}

module.exports = SensorDriver

'use strict'

const Homey = require('homey')

const protocols = require('protocols')
const utils = require('utils')
const locale = Homey.ManagerI18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported

class WeatherSensorApp extends Homey.App {

	// Register all needed signals with Homey
	registerSignals(setting) {
		for (let s in protocols) {
			let signal = new protocols[s];
			this.protocols[s] = { id: s, name: signal.getName(), hint: signal.getHint(locale) };
			if (setting && setting[s]) {
				if (setting[s].watching && this.signals[s] === undefined) {
					// Register signal defitinion with Homey
					let gs = signal.getSignal();
					this.log('Registering signal', gs.def);
					this.signals[s] = new Homey.Signal433(gs.def);
					this.signals[s].register((err, success) => {
						if (err != null) {
							utils.debug('Signal', s, '; err', err, 'success', success);
						} else {
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
										Homey.ManagerApi.realtime('stats_update', { protocol: s, stats: { total: stats.total, ok: stats.ok } });
									}
								}
							})
						}
					})
				} else if (!setting[s].watching && this.signals[s] !== undefined) {
					// Un-register signal with Homey
					this.signals[s].unregister()
					delete this.signals[s]
					utils.debug('Signal', s, 'unregistered.')
				}
			}
		}
	}

	onInit() {
		this.log('WeatherSensorApp is running...')
		this.signals = {}
		this.protocols = {}
		let sensorDriver = Homey.ManagerDrivers.getDriver('sensor')
		// Only start updating devices once the driver is ready for it
		sensorDriver.ready(() => {
			this.update = sensorDriver.update.bind(sensorDriver)
		})

		// Read app settings for protocol selection
		let setting = Homey.ManagerSettings.get('protocols');
		if (setting == null) {
			// No setting? Register all signals
			setting = {}
			let ws = utils.WeatherSignal.get()
			for (let sig in ws) {
				let s = ws[sig]
				setting[s] = { watching: true }
			}
			Homey.ManagerSettings.set('protocols', setting)
		}
		this.registerSignals(setting)

		// Catch setting changes
		Homey.ManagerSettings.on('set', key => {
			if (key === 'protocols') {
				let setting = Homey.ManagerSettings.get('protocols')
				if (setting != null) {
					this.registerSignals(setting)
				}
			}
		})

	}

	// API exported functions
	getSensors() {
		let driver = Homey.ManagerDrivers.getDriver('sensor')
		if (driver !== undefined && typeof driver.getAllSensors === 'function') {
			return driver.getAllSensors()
		}
	}

	getProtocols() {
		return this.protocols;
	}

	getStatistics() {
		let result = {}
		let ws = utils.WeatherSignal.get()
		for (let sig in ws) {
			let signal = utils.WeatherSignal.get(ws[sig])
			result[ws[sig]] = {
				signal: signal.getName(),
				enabled: this.signals[ws[sig]] != null,
				stats: signal.getStatistics()
			}
		}
		return result
	}
}

module.exports = WeatherSensorApp;

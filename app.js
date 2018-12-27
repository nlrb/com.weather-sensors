'use strict'

const Homey = require('homey')

const libs = [ 'alecto', 'auriol', 'cresta', 'labs', 'lacrosse', 'oregon', 'upm' ]
const utils = require('utils')
const locale = Homey.ManagerI18n.getLanguage() == 'nl' ? 'nl' : 'en' // only Dutch & English supported

class WeatherSensorApp extends Homey.App {

	// Register all needed signals with Homey
	registerSignals(setting) {
		let ws = utils.WeatherSignal.get()
		for (let sig in ws) {
			let s = ws[sig]
			let signal = utils.WeatherSignal.get(s)
			this.protocols[s] = { id: s, freq: signal.getSignal().freq, name: signal.getName(), hint: signal.getHint(locale) }
			if (setting && setting[s]) {
				if (setting[s].watching && this.signals[s] === undefined) {
					// Register signal defitinion with Homey
					let gs = signal.getSignal()
					this.log('Registering signal', gs.def, '(frequency', gs.freq, 'MHz)')
					this.signals[s] = new Homey.Signal(gs.def, gs.freq.toString())
					this.signals[s].register((err, success) => {
						if (err != null) {
							utils.debug('Signal', s, '; err', err, 'success', success)
						} else {
							utils.debug('Signal', s, 'registered.')
							// Register data receive event
							this.signals[s].on('payload', (payload, first) => {
								utils.debug('Received payload for', signal.getName())
								signal.debug(payload.length, payload)
								if (signal.parse(payload)) {
									this.log(s)
									if (typeof this.sensorDriver.update === 'function') {
										this.sensorDriver.update(signal)
									}
								}
							});
						}
					});
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
		this.sensorDriver = Homey.ManagerDrivers.getDriver('sensor')

		// Initialize all libraries
		for (let l in libs) {
			let lib = require(libs[l])
			lib.init()
		}

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

	}

	// API exported functions
	getSensors() {
		let driver = Homey.ManagerDrivers.getDriver('sensor')
		if (driver !== undefined && typeof driver.getAllSensors === 'function') {
			return driver.getAllSensors()
		}
	}

	getProtocols() {
		return this.protocols
	}

	getStatistics() {
		let result = []
		let ws = utils.WeatherSignal.get()
		for (let sig in ws) {
			let signal = utils.WeatherSignal.get(ws[sig])
			result.push({
				signal: signal.getName(),
				enabled: this.signals[ws[sig]] != null,
				stats: signal.getStatistics()
			})
		}
		return result
	}
}

module.exports = WeatherSensorApp;

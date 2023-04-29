'use strict'

const Homey = require('homey')
const utils = require('utils')

class WeatherSensorApp extends Homey.App {

	onInit() {
		this.log('WeatherSensorApp is running...')
	}

	// API exported functions
	getSensors() {
		let helper = this.homey.drivers.getDriver('sensor').helper;
		if (helper !== undefined && typeof helper.getAllSensors === 'function') {
			return helper.getAllSensors();
		}
	}

	getProtocols() {
		const helper = this.homey.drivers.getDriver('sensor').helper;
		return helper.protocols;
	}

	getStatistics() {
		let result = {}
		let ws = utils.WeatherSignal.get()
		const signals = this.homey.drivers.getDriver('sensor').helper.signals;
		for (let sig in ws) {
			let signal = utils.WeatherSignal.get(ws[sig])
			result[ws[sig]] = {
				signal: signal.getName(),
				enabled: signals[ws[sig]] != null,
				stats: signal.getStatistics()
			}
		}
		return result
	}
}

module.exports = WeatherSensorApp;

'use strict'

const Homey = require('homey')


class WeatherSensorApp extends Homey.App {


	onInit() {
		this.log('WeatherSensorApp is running...')
	}

	// API exported functions
	getSensors() {
		let driver = this.homey.drivers.getDriver('sensor')
		if (driver !== undefined && typeof driver.getAllSensors === 'function') {
			return driver.getAllSensors()
		}
	}

	getProtocols() {
		const driver = this.homey.drivers.getDriver('sensor')
		return driver.protocols;
	}

	getStatistics() {
		let result = {}
		let ws = utils.WeatherSignal.get()
		const signals = this.homey.drivers.getDriver('sensor').signals;
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

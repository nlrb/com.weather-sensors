"use strict";

/*
Copyright (c) 2016 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const libs = [ 'alecto', 'auriol', 'cresta', 'lacrosse', 'oregon', 'upm' ];
const utils = require('utils');
const sensor = require('./drivers/sensor.js');
const locale = Homey.manager('i18n').getLanguage() == 'nl' ? 'nl' : 'en'; // only Dutch & English supported

var heapdump = require('heapdump');
var fs = require('fs');

var signals = {};
var protocols = {};

// Register all needed signals with Homey
function registerSignals(setting) {
	let ws = utils.WeatherSignal.get();
	for (let sig in ws) {
		let s = ws[sig];
		let signal = utils.WeatherSignal.get(s);
		protocols[s] = { id: s, freq: signal.getSignal().freq, name: signal.getName(), hint: signal.getHint(locale) };
		if (setting && setting[s]) {
			if (setting[s].watching && signals[s] == null) {
				// Register signal defitinion with Homey
				let gs = signal.getSignal();
				let HomeySignal = Homey.wireless(gs.freq.toString()).Signal;
				signals[s] = new HomeySignal(gs.def);
				signals[s].register(function(err, success) {
					if (err != null) {
						utils.debug('Signal', s, '; err', err, 'success', success);
					} else {
						utils.debug('Signal', s, 'registered.')
						// Register data receive event
						signals[s].on('payload', function (payload, first) {
							utils.debug('Received payload for', signal.getName());
							signal.debug(payload.length, payload);
							if (signal.parse(payload)) {
								sensor.update(signal);
							}
						});
					}
				});
			} else if (!setting[s].watching && signals[s] != null) {
				// Un-register signal with Homey
				signals[s].unregister();
				delete signals[s];
				utils.debug('Signal', s, 'unregistered.')
			}
		}
	}
}

module.exports = {
    init: function () {
		// Uncomment below line to turn on debugging
		utils.setDebug(true);

		// Initialize all libraries
		for (let l in libs) {
			let lib = require(libs[l]);
			lib.init();
		}

		// Read app settings for protocol selection
		let setting = Homey.manager('settings').get('protocols');
		if (setting == null) {
			// No setting? Register all signals
			setting = {};
			let ws = utils.WeatherSignal.get();
			for (let sig in ws) {
				let s = ws[sig];
				setting[s] = { watching: true };
			}
			Homey.manager('settings').set('protocols', setting);
		}
		registerSignals(setting);

		// Catch update of settings
		Homey.manager('settings').on('set', function(varName) {
			if (varName == 'protocols') {
				setting = Homey.manager('settings').get('protocols');
				registerSignals(setting);
			}
		});

    },
    deleted: function () {
		for (let s in signals) {
			signals[s].unregister();
		}
    },
	api: {
		getSensors: sensor.getSensors,
		getProtocols: () => protocols,
		getStatistics: () => {
			let result = [];
			let ws = utils.WeatherSignal.get();
			for (let sig in ws) {
				let signal = utils.WeatherSignal.get(ws[sig]);
				result.push({
					signal: signal.getName(),
					enabled: signals[ws[sig]] != null,
					stats: signal.getStatistics()
				})
			}
			return result;
		},
		heapdump: (callback) => {
			heapdump.writeSnapshot((err, filename) => {
				utils.debug('>>> Dump written to', filename);
				fs.readFile(filename, 'utf8', (err, data) => {
					if (err) {
						return Homey.log('Error reading from file', err);
					}
					utils.debug('Data read from file');
					fs.unlink(filename, (err) => {
						if (err) throw err;
						utils.debug('Successfully deleted', filename);
					});
					callback(filename, data);
				});
			})
		}
	}
}

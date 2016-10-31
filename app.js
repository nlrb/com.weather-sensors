"use strict";

/*
Copyright (c) 2016 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const libs = [ 'alecto', 'cresta', 'oregon' ];
const utils = require('utils');
const sensor = require('./drivers/sensor.js');
const locale = Homey.manager('i18n').getLanguage() == 'nl' ? 'nl' : 'en'; // only Dutch & English supported

var signals = {};
var protocols = {};

// Register all needed signals with Homey
function registerSignals(setting) {
	var HomeySignal = Homey.wireless('433').Signal;
	for (let l in libs) {
		let lib = require(libs[l]);
		// Initialize library
		lib.init();
	}
	var ws = utils.WeatherSignal.get();
	Homey.log(ws);
	for (let sig in ws) {
		let s = ws[sig];
		let signal = utils.WeatherSignal.get(s);
		protocols[s] = { id: s, name: signal.getName(), hint: signal.getHint(locale) };
		if (setting && setting[s]) {
			if (setting[s].watching && signals[s] == null) {
				// Register signal defitinion with Homey
				signals[s] = new HomeySignal(signal.getSignal());
				signals[s].register(function (err, success) {
					if (err != null) {
						utils.debug('Signal', s, '; err', err, 'success', success);
					} else { 
						utils.debug('Signal', s, 'registered.')
						// Register data receive event
						signals[s].on('payload', function (payload, first) {
							utils.debug('Received payload for', signal.getName());
							let result = signal.parse(payload);
							sensor.update(result);
						});
					}
				});
			} else if (!setting[s].watching && signals[s] != null) {
				// Un-register signal with Homey
				signals[s].unregister();
				utils.debug('Signal', s, 'unregistered.')
			}
		}
	}
}

module.exports = {
    init: function () {
		// Uncomment to turn on debugging
		utils.setDebug(true);
		
		// Read app settings for protocol selection
		let setting = Homey.manager('settings').get('protocols');
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
		getProtocols: () => protocols
	}
}

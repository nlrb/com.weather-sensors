
### Wireless Weather Sensors
Homey app to read information from wireless weather sensors on 433/868 MHz.

Currently the following protocols are supported on 433 MHz.

* Alecto v1 & v3 (WS-1050/WS-1100/WS-1200)
* Cresta: used in numerous brands 433 MHz sensors, like Cresta & TFA
* La Crosse: only TX3 decoding fully implemented, WS7000 partially (untested)
* Oregon Scientific: version 2 and 3 of the protocol are supported
* UPM/Esic: only tested with WT440H

These types of devices are supported:

* Temperature sensors
* Temperature/humidity sensors
* Anemometers
* Rain gauges
* UV sensors
* Barometers

### Installation
Install the app and go to the app Settings page in Homey. As soon as a sensor signal is picked up, it will show in the list of 'Available sensors'.

![](http://homey.ramonbaas.nl/weather/settings_sensors.png)

Once you see the sensor in the list, you can add it in Homey by pairing it. Select the type of sensor that you want to add (e.g. 'Temperature/Humidity') and a list of available sensors should appear.

![](http://homey.ramonbaas.nl/weather/add_device.png)

Below are some examples of different weather sensor devices in Homey.

![](http://homey.ramonbaas.nl/weather/device_T.png)
![](http://homey.ramonbaas.nl/weather/device_TH.png)
![](http://homey.ramonbaas.nl/weather/device_TH2.png)
![](http://homey.ramonbaas.nl/weather/device_R.png)
![](http://homey.ramonbaas.nl/weather/device_W.png)

A battery alarm will only be shown when the sensor and the protocol support this.

Each sensor also has a static setting page. This will show some (read-only) information about the sensor and e.g. the last date/time data was received from the sensor.

![](http://homey.ramonbaas.nl/weather/device_settings.png)


### Settings

On the application settings page a number of selections can be made.

#### Protocols
The first setting determines which protocols need to be enabled. By default they are all enabled, but when some are not needed they can be disabled by the user. Hover over the information button next to the protocol to get some more information on it.

![](http://homey.ramonbaas.nl/weather/settings_protocols.png)

#### Activity

Under the activity settings one can select when a sensor is marked as 'Inactive' in Homey. When no signal is received for the given amount of time, it will be displayed as inactive. As soon as data is received again, the sensor will be marked active and the timer will be reset.

If you want, you can get a notification in the Homey notification sensor when a sensor becomes inactive, active, both or neither.

![](http://homey.ramonbaas.nl/weather/settings_activity.png)

#### Debug
Some debug tools are available for use in special cases. Don't use them unless instructed.

### Version info
* 1.1.0 Adds support for Auriol Z31130, adds Brightness device, sensor capabilities based on received values
* 1.0.2 Fix a bug in Oregon v2 decoding
* 1.0.1 Definition fixes for Homey FW 1.3, implement LaCrosse WS, bug fixes
* 1.0.0 First Athom App Store release

----------


Copyright (c) 2017 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

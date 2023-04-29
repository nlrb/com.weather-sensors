'use strict'

/*
Copyright (c) 2018 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const Homey = require('homey')

const ACTIVE = 1;

/*
 * Sensor device class: handles all Common items
 *
 */
class SensorDevice extends Homey.Device {

  // Class initialization
  onInit() {
    let data = this.getData()
    this.id = data.id
    this.sensorHelper = this.homey.drivers.getDriver('sensor').helper;
    this.sensorHelper.Devices.set(this.id, this)

    // Check if settings type is correct - update if needed
    // Type could be wrong due to an earlier bug
    let id = this.getSetting('id')
    if (typeof id !== 'string') {
      this.log('Sensor', this.id, 'has invalid ID in settings! Marking it unavailable.')
      this.setUnavailable(this.homey.__('error.corrupt'))
        .catch(err => this.error('Error displaying error for', this.id, '-', err.message))
    } else {
      this.sensorHelper.addListener('value:' + this.id, (cap, value) => {
        this.updateValue(cap, value)
      })
      this.sensorHelper.addListener('update:' + this.id, when => {
        // Send notification that the device is available again (when applicable)
        if (this.getAvailable() === false && (this.driver.getActivityNotifications() & ACTIVE)) {
          this.homey.notifications.createNotification({
            excerpt: this.homey.__('notification.active', { name: this.getName() })
          })
        }
        this.setAvailable()
          .catch(err => this.error('Error marking', this.id, 'as available', err.message))
        // Update the date/time that the value was last read in the device settings
        this.setSettings({ update: when })
          .catch(err => this.error('Error updating settings for', this.id, '-', err.message))
      })

      // Set all capability values
      let values = this.sensorHelper.getSensorValues(this.id)
      for (let c in values) {
        this.updateValue(values[c].cap, values[c].value)
      }
    }
  }

  // Called on removal
  onDeleted() {
    this.log('Deleting sensor device', this.id);
    this.sensorHelper.removeAllListeners('value:' + this.id);
    this.sensorHelper.removeAllListeners('update:' + this.id);
    this.sensorHelper.Devices.delete(this.id);
  }

  // Catch offset updates
  onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings updated')
    // Update display values if offset has changed
    for (let k in changedKeys) {
      let key = changedKeys[k]
      if (key.slice(0, 7) === 'offset_') {
        let cap = 'measure_' + key.slice(7)
        let value = this.getCapabilityValue(cap)
        let delta = newSettings[key] - oldSettings[key]
        this.log('Updating value of', cap, 'from', value, 'to', value + delta)
        this.setCapabilityValue(cap, value + delta)
          .catch(err => this.error(err))
      }
    }
  }

  updateValue(cap, value) {
    // add offset if defined
    this.log('Updating value of', this.id, 'with capability', cap, 'to', value)
    let cap_offset = cap.replace('measure', 'offset')
    let offset = this.getSetting(cap_offset)
    this.log(cap_offset, offset)
    if (offset != null) {
      value += offset
    }
    this.setCapabilityValue(cap, value)
      .catch(err => this.error(err))
  }
}

module.exports = SensorDevice

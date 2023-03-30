'use strict'

const Homey = require('homey')

module.exports = {
  async getSensors({ homey }) {
    return homey.app.getSensors();
  },
  async getProtocols({ homey }) {
    return homey.app.getProtocols();
  },
  async getStatistics({ homey }) {
    return homey.app.getStatistics();
  }
};

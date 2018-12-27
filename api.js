'use strict'

const Homey = require('homey')

module.exports = [
    {
        method: 'GET',
        path: '/getSensors/',
        public: true,
        fn: function(args, callback) {
          callback(null, Homey.app.getSensors());
        }
    },
    {
        method: 'GET',
        path: '/getProtocols/',
        public: true,
        fn: function(args, callback) {
          callback(null, Homey.app.getProtocols());
        }
    },
    {
        method: 'GET',
        path: '/getStatistics/',
        public: true,
        fn: function(args, callback) {
          callback(null, Homey.app.getStatistics());
        }
    }
];

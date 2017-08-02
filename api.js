module.exports = [
    {
        description: 'Get a list of all sensors',
        method: 'GET',
        path: '/getSensors/',
        requires_authorizaton: false,
        fn: function(callback, args) {
          callback(null, Homey.app.api.getSensors());
        }
    },
    {
        description: 'Get a list of all protocols',
        method: 'GET',
        path: '/getProtocols/',
        requires_authorizaton: false,
        fn: function(callback, args) {
          callback(null, Homey.app.api.getProtocols());
        }
    },
    {
        description: 'Get a list signal statistics',
        method: 'GET',
        path: '/getStatistics/',
        requires_authorizaton: false,
        fn: function(callback, args) {
          callback(null, Homey.app.api.getStatistics());
        }
    }
];

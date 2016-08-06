"use strict";

var util = require('util');
var convert = require('../../baseConverter').jan.ConvertBase;







function createDriver(driver) {






    var self = {

        // paireddevices an realtime actual devices_data updated after deleting and adding a device, the init dd is not updated.
        // data.id, paireddevices in this session is created by init and by paring a device is added is realtime deveces_data which doesnt update in app during session
        devicesDataId: [],
        // to put the complete devices in from parseRXData = devices found by rxdata
        homeyDevices: [],
        //complete device



        init: function (devices_data, callback) {

            console.log('driver Oregon', "init driver started")

            devices_data.forEach(function (device_data) {
                addDevice(device_data);
            });
            console.log('driver 22 devices_data', util.inspect(devices_data, false, null))
            console.log('driver 22 devices_data', util.inspect(self.devicesDataId, false, null))
            console.log('driver 22 devices_data', util.inspect(self.homeyDevices, false, null))

            callback();

        },  // end init




        pair: function (socket) {



            //socket.on('press_button', function (data, callback) {

            //    console.log('socket.on(press_buttonh  ');


            //        socket.emit('button_pressed');

            //        callback();
            //});



            socket.on('list_devices', function (data, callback) {


                // console.log('devise length  ' , homeyDevices.length)
                // err, result style
                callback(null, self.homeyDevices);

                // even when we found another device, these can be shown in the front-end
                //setTimeout(function () {
                //    socket.emit('list_devices', moreDevices)
                //}, 2000)


            });

            socket.on("add_device", function (device, callback) {


                console.log('drivr 174 add device', device)
                console.log('drivr 174 add device.data.id ', device.data.id)




                //  console.log('driver 180 device data' , device_data)

                //   console.log('device onoff', circle)
                //var deviceObj = false;
                //devices.forEach(function (installed_device) {

                //    // If already installed
                //    if (installed_device.uuid == device.data.id) {
                //        deviceObj = installed_device;
                //    }
                //});

                //// Add device to internal list
                //devices.push(device.data);

                //// Mark as offline by default
                //module.exports.setUnavailable(device.data, "Offline");

                //// Conntect to the new Device
                //Homey.app.connectToDevice(devices, device.data, function (err, device_data) {

                //    // Mark the device as available
                //    if (!err && device_data) module.exports.setAvailable(device_data);
                //});

                //// Empty found devices to prevent piling up
                //foundDevices = [];

                // Return success
                // addDevice(homeyoregondevice);

                var devicedataobj = { "id": device.data.id };

                // callback(null);
                callback(null, devicedataobj);
                socket.emit('pairingdone', '', function (err, result) {
                    console.log(result) // Hi!
                });

            });




            socket.on('disconnect', function () {

            })

        },

        capabilities: {



            measure_temperature: {
                //  watt


                get: function (device_data, callback) {

                    console.log('capabilitis get measure_temperature entered')

                    // get the bulb with a locally defined function
                    var device = getDeviceById(device_data);
                    console.log('driver 279 capabilitis get device. measure_temperature  ', device.measure_temperature)
                    console.log('driver 201 device_data  ', device_data)
                    if (device instanceof Error) return callback(device);
                
                    self.realtime(device_data, 'measure_temperature', device.measure_temperature);

                    // send the dim value to Homey
                    if (typeof callback == 'function') {
                        callback(null, device.measure_temperature);
                    }
                }

            },

            measure_humidity: {
                //  watt


                get: function (device_data, callback) {

                    console.log('capabilitis get measure_humidity entered')
                    console.log('get hunidity device_data  ', device_data)
                    console.log('get hunidity  davicedata_id ', device_data.id)
                    // get the bulb with a locally defined function
                    var device = getDeviceById(device_data);

                    console.log('get hunidity  homeyDevices ', util.inspect(device, false, null))
                    console.log('driver 279 capabilitis get homeyDevices.measure_humidity  ', device.measure_humidity)
                    console.log('driver 201 device_data  ', device_data)
                    if (device instanceof Error) return callback(device);

                    self.realtime(device_data, 'measure_humidity', device.measure_humidity);

                    // send the dim value to Homey
                    if (typeof callback == 'function') {
                        callback(null, device.measure_humidity);
                    }
                }

            },



            measure_battery: {
                //  watt


                get: function (device_data, callback) {

                    console.log('capabilitis getmeasure_battery entered')

                    // get the bulb with a locally defined function
                    var device = getDeviceById(device_data);
                    console.log('driver 279 capabilitis get device.measure_battery  ', device.measure_battery)
                    console.log('driver 201 device_data  ', device_data)
                    if (device instanceof Error) return callback(device);

                    self.realtime(device_data, 'measure_battery', device.measure_battery);
                   
                    // send the dim value to Homey
                    if (typeof callback == 'function') {
                        callback(null, device.measure_battery);
                    }
                }

            }


        },




    }// end self






    function addDevice(deviceIn) {
        self.devicesDataId.push(deviceIn);

    }

    function getDeviceById(deviceIn) {
        console.log('getDeviceById deviceIn', deviceIn);
        var matches = self.homeyDevices.filter(function (d) {

            return d.data.id == deviceIn.id;
        });
        return matches ? matches[0] : null;
    }



    //updates capabilities and realtime
    self.updateCapabilitiesHomeyDevice = function (dev) {
        //  console.log('567 changeDesc  dev     ', util.inspect(dev1, false, null));
        //  console.log('567 changeDesc homeyDevices before change  ', util.inspect(homeyDevices, false, null));

        for (var i in self.homeyDevices) {


            if (self.homeyDevices[i].data.id == dev.data.id) {
                //  console.log('567 updateCapabilitiesHomeyDevice before change homeyDevices[i]  ', util.inspect(homeyDevices[i], false, null));
                self.homeyDevices[i].measure_temperature = dev.measure_temperature;
                self.homeyDevices[i].measure_humidity = dev.measure_humidity;
                self.homeyDevices[i].measure_battery = dev.measure_battery;

                self.realtime(self.homeyDevices[i].data, 'measure_temperature', dev.measure_temperature);
                self.realtime(self.homeyDevices[i].data, 'measure_humidity', dev.measure_humidity);
                self.realtime(self.homeyDevices[i].data, 'measure_battery', dev.measure_battery);

                console.log('updateCapabilitiesHomeyDevice self.homeyDevices[i].data   ', self.homeyDevices[i].data)



                console.log('567 updateCapabilitiesHomeyDevice after change homeyDevices[i]  ', util.inspect(self.homeyDevices[i], false, null))

                break; //Stop this loop, we found it!
            }
        }
    }


    return self;
} // end createdriver





module.exports = {
    createDriver: createDriver
};
global.Homey = console;
const utils = require('../node_modules/utils');
const protocols = require('../node_modules/protocols');

utils.setDebug(true);

var encryptCresta = (data) => {
  let calcCRC = (b) => {
      if (b & 0x80) { b ^= 0x95 };
      let c = b ^ (b >> 1);
      if (b & 0x1) { c ^= 0x5f };
      if (c & 0x1) { b ^= 0x5f };
      return b ^ (c >> 1);
  };
  let result = [];
  let cs1 = 0;
  let cs2 = 0;
  for (let x = 0; x < data.length; x += 2) {
    let byte = utils.hex2dec(data.slice(x, x + 2));
    // encode byte
    let enc;
    for (enc = 0; byte; byte <<= 1) {
      enc ^= byte;
      enc &= 0xff;
    }
    cs1 ^= enc;
    cs2 = calcCRC(cs2 ^ enc);
    // make binary
    byte = ('00000000' + parseInt(enc, 10).toString(2)).slice(-8);
    for (let i = 7; i >= 0; i--) {
      result.push(Number(byte[i]));
    }
    result.push(0);
  }
  cs1 &= 0xff;
  byte = '0' + ('00000000' + parseInt(cs1, 10).toString(2)).slice(-8);
  for (let i = 8; i >= 0; i--) {
    result.push(Number(byte[i]));
  }
  // Add CRC
  byte = '0' + ('00000000' + parseInt(calcCRC(cs1 ^ cs2), 10).toString(2)).slice(-8);
  for (let i = 8; i >= 0; i--) {
    result.push(Number(byte[i]));
  }

  return result;
}

var testSignals = [
/**************/
/*** Alecto ***/
/**************/

  { // Alecto v1
    id: 'WS-1050',
    data: [1,0,0,1,0,1,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1,1,0,1,1,1,1,1,1,1,0,0,1,1,0,0,0], protocol: "alectov1",
    result: {id:'82',name:'WS-1050',channel:2,data:{temperature:22.3,button:false,lowbattery:false}}
  },
  // Alecto v1 rain gauge
  {
    id: 'Rain gauge',
    data:[0,1,0,1,0,1,1,1 ,0,1,1,0, 1,1,0,0, 0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0, 1,0,1,1], protocol: "alectov1",
    result: {id:'234',data:{raintotal:219,lowbattery:false}}
  },
  { // WS-1100
    id: 'WS-1100 (1)',
    data: [0,1,0,0,0,0,0,1,1,0,1,0,0,0,1,0,0,1,1,0,1,1,1,1,0,0,1,0,1,0,0,1,1,0,0,1,1,0,0,1], protocol: "alectov3",
    result: {id:'26',channel:1,name:'WS-1100',data:{temperature:22.3,humidity:41,lowbattery:false}}
  },
  { // WS-1100
    id: 'WS-1100 (2)',
    data: [0,1,0,0,1,0,1,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,1], protocol: "alectov3",
    result: {id:'181',channel:1,name:'WS-1100',data:{temperature:24.8,humidity:64,lowbattery:false}}
  },
  { // WS-1150
    id: 'WS-1150 (1)',
    data: [0,1,0,1,1,1,0,0,1,1,1,1,1,0,1,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,0,0,1,1,1,0], protocol: "alectov1",
    result: {id:'207',name:'WS-1xxx',channel:3,data:{temperature:24.1,humidity:14,button:false,lowbattery:true}}
  },
  { // WS-1150
    id: 'WS-1150 (2)',
    data: [0,1,0,1,1,1,0,0,1,1,1,1,1,0,1,0,0,0,0,0,1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,0], protocol: "alectov1",
    result: {id: '207',name:'WS-1xxx',channel:3,data:{temperature:23.9,humidity:14,button:false,lowbattery:true}}
  },
  { // WS-1700
    id: 'WS-1700',
    data: [0,1,0,1,0,0,1,0,0,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1], protocol: "alectov1",
    result: {id:'38',name:'WS-1xxx',channel:1,data:{temperature:9,humidity:85,button:false,lowbattery:true}}
  },
  { // Labs BL999
    id: 'Labs BL999',
    data: [0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,1,1,0,1,0,0,0,0,1,1,0,1,1,0,1,1,1,0,0,0], protocol: "alectov1",
    result: {name:'BL999',id:'8',pid:'labs',channel:1,data:{temperature:18.4,humidity:64,lowbattery:false}}
  },
  { // Alecto v3
    id: 'WH2A',
    data: [0,1,0,0,0,1,1,1,0,0,0,1,0,0,0,0,1,1,1,0,0,0,1,0,0,0,1,0,1,0,0,1,0,1,1,1,0,1,1,1], protocol: "alectov3",
    result: {id:'113',name:'WH2A',data:{temperature:22.6,humidity:41}}
  },
  { // Viking Art Nr: 02035
    id: 'Viking 02035',
    data: [1,0,1,0,0,1,0,1,0,1,1,1,0,1,0,0,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1], protocol: "alectov3",
    result: {id:'174',channel:3,name:'WH2', data:{temperature:-23.1}}
  },
  { // Fine Offset HW2
    id: 'Fine Offset HW2 (1)',
    data: [1,1,0,1,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,1,0,0,1,0,1,0], protocol: "alectov3",
    result: {id:'135',channel:1,name:'WH2',data:{temperature:24.3}}
  },
  { // Fine Offset HW2
    id: 'Fine Offset HW2 (2)',
    data: [1,1,0,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,0], protocol: "alectov3",
    result: {id:'248',channel:8,name:'WH2',data:{temperature:14.1}}
  },
  { // Telldus FT007TH
    id: 'Telldus FT007TH',
    data: [1,1,0,1,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,1,0,0,0,0,1,0,1,1,0,1,1,0,0,0,0,0,1,0], protocol: "alectov3",
    result: {id:'135',channel:1,name:'WH2',data:{temperature:24.4,humidity:45}}
  },
  /*
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data:[1,1,0,1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,0], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,1,1,0,1,1,1,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,0,0,1,0,0,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,0,1,1,0,1,1,0,0,1,0,1], protocol: "alectov3"
  },
  { // Fine Offset HW2
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3"
  },
  */
  { // Fine Offset HW2
    id: 'Fine Offset HW2 (3)',
    data: [1,1,0,1,0,0,1,1,1,1,0,1,1,1,0,0,0,0,1,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,0,0,1,0,0,0,1], protocol: "alectov3",
    result: {id:'247',channel:8,name:'WH2',data:{temperature:13.9,humidity: 87}}
  },
  { // Fine Offset HW2
    id: 'Fine Offset HW2 (4)',
    data: [1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,0,1,0,0,1,1,1,1,0,1,1,0,0,0,0,1,0,1], protocol: "alectov3",
    result: {id:'199',channel:5,name:'WH2',data:{temperature:18.9,humidity: 61}}
  },
/**************/
/*** Autiol ***/
/**************/
  { // Auriol Z31130
    id: 'Auriol Z31130',
    data: [0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,1,1,0,0,1,1,0,0,0,1], protocol: "auriol1",
    result: {id:'127',channel:1,data:{temperature:22.5,humidity:49,lowbattery:false}}
  },
  {
    id: 'Auriol IAN321304_1901',
    data: [1,1,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,0,0,0,1,1,1,0], protocol: "auriol2",
    result: {id:'200',channel:1,data:{temperature:22.3,humidity:34,lowbattery:false}}
  },
/**************/
/*** Cresta ***/
/**************/
  { // TH
    id: 'Temp/Hum',
    data: '45ce5e87c151f3', protocol: "cresta", func: encryptCresta,
    result: {id:'45',channel:2,data:{temperature:18.7,humidity:51,lowbattery:false}}
  },
  { // W
    id: 'Wind',
    data: '8fd68c25c124c1349003a8', protocol: "cresta", func: encryptCresta,
    result: {id:'8f',channel:0,data:{temperature:'12.5',windchill:12.4,averagespeed:3.4,currentspeed:3.9,direction:90,lowbattery:true}}
  },
  { // UV
    id: 'UV',
    data: '8fd0cd0722012800', protocol: "cresta", func: encryptCresta,
    result: {id:'8f',channel:0,data:{temperature:20.7,uvvalue:1.2,uvindex: 2.8,uvlevel:0,lowbattery:true}}
  },
  { // R
    id: 'Rain',
    data: '80cc8ed00066', protocol: "cresta", func: encryptCresta,
    result: {id:'80',channel:0,data:{raintotal:145.6,lowbattery:false}}
  },
  {
    id: 'TS34C, TFA 30.3150',
    data: [1,0,1,1,0,0,1,1,0,0,1,0,1,1,1,0,1,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,1,1,1,0,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,0,0,1,0,1,0,1,0,1,0,0,1,1,0,0,0,0,1,1,0,1,0,1,0,1,1,0,0,0], protocol: "cresta",
    result: {id:'57',channel:2,data:{temperature:23.8,humidity:47,lowbattery:false}}
  },
/***********/
/*** TFA ***/
/***********/
  {
    id: 'TFA 30.3139',
    data: [0,0,0,0,1,0,1,1,1,1,0,1,0,0,0,0,1,1,0,0,0,0,1,1,1,0,1,0], protocol: "tfa",
    result: {id:'189',channel:2,"data":{temperature:19.5,lowbattery:false}}
  },
/****************/
/*** LaCrosse ***/
/****************/
  // LaCrosse TX2
  {
    id: 'Temp',
    data: [0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,0,0,1,0,0,0,1,1,0,1,1,1,0,0,1,0,0,0,0,0], protocol: "lacrosse1",
    result: {id:'8',data:{temperature:22.3}}
  },
  // LaCrosse TX3
  {
    id: 'TFA 30.3125 (temp part)',
    data: [0,0,0,0,0,1,0,1,1,1,0,0,0,1,1,1,0,0,1,0,1,0,0,1,0,1,1,1,0,0,1,0,0,1,1,0], protocol: "lacrosse1",
    result: {id:'46',data:{temperature:22.9}}
  },
  {
    id: 'TFA 30.3125 (hum part)',
    data: [1,1,1,0,0,1,0,1,1,1,0,1,0,1,0,1,0,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0], protocol: "lacrosse1",
    result: {id:'46',data:{humidity:52}}
  },
  // LaCrosse WS
  {
    id: 'Temp/Hum (1)',
    data: [1,0,0,1,0,1,1,1,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1,1,0,0,1,0,1,0,0,1,0,1,1,0,0,1,1,1,1,1,0,1,1,0,0,0,1,1,0,0,0,1,1,0,1,0,1], protocol: "lacrosse2",
    result: {id:'7',data:{temperature:25.5,humidity:49.6,pressure:994}}
  },
  {
    id: 'Temp/Hum (2)',
    data: [1,0,0,1,0,1,1,1,0,0,1,1,0,0,0,1,0,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,0,1,1,1,0,0,1,0,0,1,0,1,1,0,0,1,1,1,1,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,1,1,1], protocol: "lacrosse2",
    result: {id:'3',data:{temperature:26.1,humidity:33.4,pressure:994}}
  },
  {
    id: 'Wind',
    data: [1,1,1,0,0,1,1,1,1,0,1,1,0,1,0,1,0,0,0,0,1,1,0,0,0,1,1,0,1,0,1,0,0,1,0,1,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1], protocol: "lacrosse2",
    result: {id:'7',data:{currentspeed:10.5,direction:145}}
  },
  {
    id: 'Rain 1',
    data: [1,0,1,0,0,1,1,1,1,1,1,1,1,0,1,1,0,1,0,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1], protocol: "lacrosse2",
    result: {id:'15',data:{raintotal:2859}}
  },
  {
    id: 'Rain 2',
    data: [1,0,1,0,0,1,1,1,1,1,1,1,0,0,0,1,1,0,0,1,1,1,1,0,1,1,0,1,1,1,1,1,0,0,1,1], protocol: "lacrosse2",
    result: {id:'15',data:{raintotal:2961}}
  },
  {
    id: 'Brightness',
    data: [1,1,0,1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,0,1,1,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,1,0,1,1], protocol: "lacrosse2",
    result: {id:'7',data:{brightness:897,duration:2143}}
  },
/**************/
/*** Oregon ***/
/**************/
/* TODO: check errors (these worked before the changes of Jeroen)
  // Oregon v2
  {
    data: [0,1,0,0,1,0,1,0,1,1,0,0,1,1,0,1,0,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0], protocol: "oregonv2",
    result: {name:'THGN123N/THGR122NX',layout:'TH1',id:'1d20',channel:1,rolling:'3',data:{temperature:18.8,humidity:25,unknown:'08',lowbattery:false}}
  },
  { // THB2 (1st sample)
	  data: [0,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,0,1,1,0], protocol: "oregonv2",
    result: {name:'BTHR918N/BTHR968',layout:'THB2',id:'5d60',channel:0,rolling:'b9', data:{temperature:24.3,humidity:52,comfort:'Comfortable',pressure:999,unknown:'01',forecast:'Rainy',lowbattery:false}}
  },
  { // THB2 (2nd sample)
    data: [0,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1,0,1,1,0,1,0,0], protocol: "oregonv2",
    result: {name:'BTHR918N/BTHR968',layout:'THB2',id:'5d60',channel:0,rolling:'b9',data:{temperature:22.6,humidity:49,comfort:'Comfortable',pressure:1006,unknown:'01',forecast:'Sunny',lowbattery:false}}
  },
 End TODO */
  { // THN132N
    id: 'THN132N',
    data: [1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,0,0,1,1,0,0,1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,1,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,1,1,1,1,0,0,0,0,0,0,0], protocol: "oregonv2",
    result: {name:"THN132N/THR238NF",layout:"T1",id:"ec40",channel:2,rolling:"ea",data:{temperature:21.2,lowbattery:false}}
  },
  {
    id: 'BTHGN129',
    data: [1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,0,0,1,0,0,1,1,0,0,1,1,0,1,0,0,0,0,1,0,1,0,1,0,0,0,0,1,0,0,0,0,0,0,1,1,1,0,1,1,0,0,0,0,0,1,1,0,0,1,1,0,1,1,1,0,0,0,1,1,0,0,0,1,1,1,1,0,1,0,0,1,0,0,0,0,0], protocol: "oregonv2",
    result: {name:"BTHGN129",layout:"THB3",id:"5d53",channel:2,rolling:"3b",data:{temperature:21.5,humidity:37,comfort:"Dry",pressure:1030,forecast:"Sunny",unknown:"031d98",lowbattery:false}}
  },
  // Oregon v3
  {
    id: 'THGR810',
    data: [1,1,1,1,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,1,1,0,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,1,1,0,1,1,0,0,1,0,1,0,0,1,0,1,0,0], protocol: "oregonv3",
    result: {name:'THGN800/THGN801/THGR810',layout:'TH1',id:'f824',channel:1,rolling:'6f',data:{temperature:21.8,humidity:34,unknown:'08',lowbattery:false}}
  },
  { // Wind
    id: 'WGR800',
    data: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0,1,0,1,1,0,0,1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,1,1,1,1,0], protocol: "oregonv3",
    result: {name:'WGR800',layout:'W1',id:'1984',channel:0,rolling:'6d',data:{direction:67.5,unknown:'0c0',currentspeed:1.2,averagespeed:1,lowbattery:true}}
  },
  { // Rain
    id: 'PCR800',
    data: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,0,1,0,0,1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,1,1,0,0,0,1], protocol: "oregonv3",
    result: {name:"PCR800",layout:"R1",id:"2914",channel:0,rolling:"99",data:{rainrate:0,raintotal:0,lowbattery:false}}
  },
  { // UV
    id: 'UVN800',
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,1,1,0,1,1,1,1,1], protocol: "oregonv3",
    result: {name:'UVN800',layout:'UV2',id:'d874',channel:1,rolling:'47',data:{uvindex:0,uvraw:0,lowbattery:false}}
  },
  /*
  { // UVN800: value: 08201 / UV: 1 / risk: low () 82 = 130 + 90 = 22,0
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,1,1,0,1,1,1,0], protocol: "oregonv3"
  },
  { // UVN800: value: 06c00 / UV: 0 / risk: low (19.4C outside) 6c = 108 + 90 = 19,8
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,1,1,0,1,0,0,1,0,0,0,1,0,0,1,1,0], protocol: "oregonv3"
  },
  { // UVN800: value: 08f02 / UV: 2 / risk: low (23.3C) 8f = 143 + 90 = 23,3
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,1,0,0,0,1,0,0], protocol: "oregonv3"
  },
  { // UVN800: value: 09b03 / UV: 3 / risk: medium (25.3/26.4) 9b = 155 + 90 = 24,5
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,1,1,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0], protocol: "oregonv3"
  },
  */
  {
    id: 'UVN800',
    data: [1,0,1,1,0,0,0,1,1,1,1,0,0,0,1,0,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1,0,0,1,0], protocol: "oregonv3",
    result: {name:'UVN800',layout:'UV2',id:'d874',channel:1,rolling:'bd',data:{uvindex:1,uvraw:1.3125,lowbattery:false}}
  },
/************/
/* UPM/Esic */
/************/
  // UPM/Esic
  {
    id: 'WT440H',
    data: [1,0,3,2,1,1,2,2,1,1,1,2,1,2,1,2,2,0,3,1,0,3], protocol: "upm",
    result: {id:"10",channel:1,data:{temperature:22.1,humidity:14,lowbattery:false}}
  }
]

var signals = {};
var testResults = {
  passed: 0,
  failed: 0,
  unchecked: 0,
  error: 0
};

// Create all the signals we have
for (let p in protocols) {
   console.log('Creating signal decoder for', p);
   signals[p] = new protocols[p];
}

// Loop through the test vectors
for (var i = 0; i < testSignals.length; i++) {
  var ts = testSignals[i];
  var payload;
  if (ts.func !== undefined) {
    payload = new Buffer.from(ts.func(ts.data));
  } else {
    payload = new Buffer.from(ts.data);
  }
  utils.debug('Payload', ts.protocol, payload.length, payload);
  var parsed = signals[ts.protocol].parser(payload);
  var result = signals[ts.protocol].getResult();
  if (parsed) {
    delete result.protocol;
    delete result.lastupdate;
    if (ts.result !== undefined) {
      if (JSON.stringify(ts.result) === JSON.stringify(result)) {
        testResults.passed++;
        console.log('\x1b[33m%d\x1b[0m Check \x1b[32mPASSED\x1b[35m %s: %s\x1b[0m', i, ts.protocol, ts.id || '');
      } else {
        testResults.failed++;
        console.log('\x1b[33m%d\x1b[0m Check \x1b[31mFAILED\x1b[35m %s: %s\x1b[0m', i, ts.protocol + ts.id || '');
        console.log(JSON.stringify(ts.result), 'vs', JSON.stringify(result))
      }
    } else {
      testResults.unchecked++;
      console.log(i, result);
    }
  } else {
    testResults.error++;
    console.log('\x1b[33m%d \x1b[31mError parsing\x1b[35m %s: %s\x1b[0m', i, ts.protocol, ts.id || '');
  }
}
console.log(testResults);

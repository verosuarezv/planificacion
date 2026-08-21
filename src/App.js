import { useState, useMemo, useRef } from "react";
 
// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#f4f5f7", surface:"#ffffff", border:"#e4e7ec", borderHover:"#c8cdd8",
  accent:"#4f46e5", accentDim:"#eef2ff",
  // estados de stock — solo para badges y colores de alerta
  ok:          { color:"#15803d", bg:"#f0fdf4", border:"#bbf7d0", label:"OK",         icon:"●" },
  sobRiesgo:   { color:"#92400e", bg:"#fffbeb", border:"#fcd34d", label:"Riesgo Vto", icon:"●" },
  sobAlerta:   { color:"#b45309", bg:"#fffbeb", border:"#fde68a", label:"Sobrestock", icon:"●" },
  subAlerta:   { color:"#c2410c", bg:"#fff7ed", border:"#fed7aa", label:"Substock",   icon:"●" },
  faltante:    { color:"#b91c1c", bg:"#fef2f2", border:"#fecaca", label:"Faltante",   icon:"●" },
  // texto
  text:"#0f172a", textDim:"#64748b", muted:"#94a3b8",
  faint:"#f1f5f9", hairline:"#e2e8f0",
  // input editable
  inputBg:"#ffffff", inputBorder:"#cbd5e1",
  // grupos de columnas — bordes superiores
  gVenta:"#2563eb", gProd:"#7c3aed", gStock:"#0f766e",
};
 
// helpers de estado
const _ESTADOS = {
  sobrestockRiesgo: C.sobRiesgo,
  sobrestockAlerta: C.sobAlerta,
  ok:               C.ok,
  substockAlerta:   C.subAlerta,
  faltante:         C.faltante,
};
 
// ─── POLÍTICA DE STOCK ───────────────────────────────────────────────────────
const POLITICA_DEFAULT = {
  sobrestockRiesgo: { min:0.80, ...C.sobRiesgo },
  sobrestockAlerta: { min:0.30, ...C.sobAlerta },
  ok:               { min:0.10, ...C.ok },
  substockAlerta:   { min:0.01, ...C.subAlerta },
  faltante:         { min:0,    ...C.faltante },
  sinForecast:      { min:null, color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", label:"Sin forecast" },
};
 
function getEstado(diasStock, vidaUtil, fcst) {
  if (!fcst || fcst === 0) return "sinForecast";
  const pct = vidaUtil > 0 ? diasStock / vidaUtil : 0;
  if (pct >= 0.80) return "sobrestockRiesgo";
  if (pct >= 0.30) return "sobrestockAlerta";
  if (pct >= 0.10) return "ok";
  if (pct >= 0.01) return "substockAlerta";
  return "faltante";
}
 
 
 
// ─── MAESTRO INICIAL ─────────────────────────────────────────────────────────
const MAESTRO_INI = [
  // CHORIZOS FRESCOS — permiteArrastre: false (VU 12d)
  { sku:"13",   desc:"Chorizo Extra",                  pasta:"pch001",  sector:"CHORIZOS", familia:"EXTRA",       vidaUtil:12,  kgBatch:1437, kgBatchMin:718,  leadTime:3, permiteArrastre:false },
  { sku:"15",   desc:"Chorizo Extra Extra Largo",       pasta:"pch001",  sector:"CHORIZOS", familia:"EXTRA",       vidaUtil:12,  kgBatch:1437, kgBatchMin:718,  leadTime:3, permiteArrastre:false },
  { sku:"2",    desc:"Chorizo Extra Speto",             pasta:"pch001",  sector:"CHORIZOS", familia:"EXTRA",       vidaUtil:12,  kgBatch:1437, kgBatchMin:718,  leadTime:3, permiteArrastre:false },
  { sku:"9",    desc:"Chorizo Puro Cerdo",              pasta:"pch100",  sector:"CHORIZOS", familia:"CH.CERDO",    vidaUtil:12,  kgBatch:1390, kgBatchMin:695,  leadTime:3, permiteArrastre:false },
  { sku:"900",  desc:"Chorizo Puro Cerdo Rueda",        pasta:"pch100",  sector:"CHORIZOS", familia:"CH.CERDO",    vidaUtil:12,  kgBatch:1410, kgBatchMin:705,  leadTime:3, permiteArrastre:false },
  { sku:"200",  desc:"Chorizo Arizona Gancho Vacío",    pasta:"pch200",  sector:"CHORIZOS", familia:"CH.ARIZONA",  vidaUtil:60,  kgBatch:1376, kgBatchMin:688,  leadTime:3 },
  { sku:"222",  desc:"Chorizo Arizona Premium x10",     pasta:"pch200",  sector:"CHORIZOS", familia:"CH.ARIZONA",  vidaUtil:60,  kgBatch:1376, kgBatchMin:688,  leadTime:3 },
  { sku:"215",  desc:"Chorizo Arizona x7",              pasta:"pch200",  sector:"CHORIZOS", familia:"CH.ARIZONA",  vidaUtil:60,  kgBatch:1376, kgBatchMin:688,  leadTime:4 },
  { sku:"4050", desc:"Chorizo Extra Cente x3",          pasta:"pch001",  sector:"CHORIZOS", familia:"EXTRA",       vidaUtil:60,  kgBatch:1437, kgBatchMin:718,  leadTime:4 },
  { sku:"4051", desc:"Chorizo Puro Cerdo Cente x3",     pasta:"pch100",  sector:"CHORIZOS", familia:"CH.CERDO",    vidaUtil:60,  kgBatch:1390, kgBatchMin:695,  leadTime:4 },
  { sku:"4055", desc:"Chorizo Colorado x3",             pasta:"pch500",  sector:"CHORIZOS", familia:"COLORADO",    vidaUtil:60,  kgBatch:210,  kgBatchMin:210,  leadTime:4 },
  { sku:"12",   desc:"Chorizo Colorado Vacío x10",      pasta:"pch500",  sector:"CHORIZOS", familia:"COLORADO",    vidaUtil:60,  kgBatch:210,  kgBatchMin:210,  leadTime:3 },
  { sku:"4056", desc:"Chorizo Cheddar Bacon x3",        pasta:"pch1000", sector:"CHORIZOS", familia:"SABORES",     vidaUtil:60,  kgBatch:630,  kgBatchMin:315,  leadTime:4 },
  { sku:"4054", desc:"Chorizo Gourmet Cente x3",        pasta:"pch900",  sector:"CHORIZOS", familia:"SABORES",     vidaUtil:60,  kgBatch:453,  kgBatchMin:227,  leadTime:4 },
  { sku:"4053", desc:"Chorizo Extra Ahumado x3",        pasta:"pch600",  sector:"CHORIZOS", familia:"SABORES",     vidaUtil:60,  kgBatch:398,  kgBatchMin:398,  leadTime:4 },
  { sku:"1500", desc:"Chorizo Sin Sal",                 pasta:"pch1500", sector:"CHORIZOS", familia:"EXTRA",       vidaUtil:45,  kgBatch:300,  kgBatchMin:300,  leadTime:4 },
  { sku:"4006", desc:"Húngaras Minipack",               pasta:"PCHHUN",  sector:"CHORIZOS", familia:"HÚNGARAS",    vidaUtil:45,  kgBatch:210,  kgBatchMin:210,  leadTime:5 },
  { sku:"4005", desc:"Salchicha Parrillera Mini Pack",  pasta:"pch800",  sector:"CHORIZOS", familia:"SALCHICHAS",  vidaUtil:30,  kgBatch:201,  kgBatchMin:201,  leadTime:5 },
  { sku:"5011", desc:"Butifarra x2",                    pasta:"PCH700",  sector:"CHORIZOS", familia:"BUTIFARRA",   vidaUtil:60,  kgBatch:246,  kgBatchMin:246,  leadTime:3 },
  { sku:"49",   desc:"Morcillas Dulces",                pasta:"pch300",  sector:"CHORIZOS", familia:"MORCILLAS",   vidaUtil:60,  kgBatch:164,  kgBatchMin:164,  leadTime:4 },
  { sku:"5010", desc:"Morcillas Dulces x2",             pasta:"pch300",  sector:"CHORIZOS", familia:"MORCILLAS",   vidaUtil:60,  kgBatch:164,  kgBatchMin:164,  leadTime:3 },
  { sku:"45",   desc:"Morcillas Saladas",               pasta:"pch400",  sector:"CHORIZOS", familia:"MORCILLAS",   vidaUtil:60,  kgBatch:204,  kgBatchMin:204,  leadTime:4 },
  { sku:"5009", desc:"Morcillas Saladas x2",            pasta:"pch400",  sector:"CHORIZOS", familia:"MORCILLAS",   vidaUtil:60,  kgBatch:204,  kgBatchMin:204,  leadTime:3 },
  // FRANKFURT
  { sku:"95",   desc:"Frankfurters Cente x1 Kg.",       pasta:"PPFMED",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:284,  kgBatchMin:284,  leadTime:1 },
  { sku:"96",   desc:"Frankfurters Cente x2.5 Kg.",     pasta:"PPFMED",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:284,  kgBatchMin:284,  leadTime:2 },
  { sku:"206",  desc:"Frankfurters Arizona x2.5 Kg.",   pasta:"PPFARI",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:295,  kgBatchMin:295,  leadTime:3 },
  { sku:"214",  desc:"Frankfurters Arizona x8 un.",     pasta:"PPFARI",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:295,  kgBatchMin:295,  leadTime:2 },
  { sku:"216",  desc:"Frankfurters Arizona x1.2 Kg.",   pasta:"PPFARI",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:295,  kgBatchMin:295,  leadTime:2 },
  { sku:"5041", desc:"Livianitos Cente x8",             pasta:"PPFLIV",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:284,  kgBatchMin:284,  leadTime:1 },
  { sku:"5061", desc:"Livianitos Cente Pack 8+4",       pasta:"PPFLIV",  sector:"FRANKFURT", familia:"FRANKFURT",  vidaUtil:45,  kgBatch:284,  kgBatchMin:284,  leadTime:1 },
  // PASTAS FINAS
  { sku:"38",   desc:"Chorizo Ruso",                    pasta:"ppf500",  sector:"PASTAS",   familia:"RUSO",        vidaUtil:60,  kgBatch:466,  kgBatchMin:233,  leadTime:3 },
  { sku:"84",   desc:"Leonesa Fantasía Mitades",        pasta:"ppf060",  sector:"PASTAS",   familia:"LEONESAS",    vidaUtil:60,  kgBatch:359,  kgBatchMin:359,  leadTime:5 },
  { sku:"53",   desc:"Leonesa Premium Mitades",         pasta:"ppf001",  sector:"PASTAS",   familia:"LEONESAS",    vidaUtil:60,  kgBatch:290,  kgBatchMin:290,  leadTime:5 },
  { sku:"87",   desc:"Leonesa con Jamón Mitades",       pasta:"ppf030",  sector:"PASTAS",   familia:"LEONESAS",    vidaUtil:75,  kgBatch:579,  kgBatchMin:289,  leadTime:5 },
  { sku:"201",  desc:"Mortadela Arizona Fina",          pasta:"PPFFIN",  sector:"PASTAS",   familia:"MORTADELAS",  vidaUtil:60,  kgBatch:339,  kgBatchMin:339,  leadTime:3 },
  { sku:"203",  desc:"Mortadela Arizona Fina Mitades",  pasta:"PPFFIN",  sector:"PASTAS",   familia:"MORTADELAS",  vidaUtil:60,  kgBatch:339,  kgBatchMin:339,  leadTime:3 },
  { sku:"242",  desc:"Mortadela Cente Bocha Mitades",   pasta:"PPFBOCH", sector:"PASTAS",   familia:"MORTADELAS",  vidaUtil:60,  kgBatch:339,  kgBatchMin:339,  leadTime:3 },
  { sku:"23",   desc:"Mortadela Bolognesa",             pasta:"PPFBOLO", sector:"PASTAS",   familia:"MORTADELAS",  vidaUtil:60,  kgBatch:292,  kgBatchMin:292,  leadTime:3 },
  { sku:"25",   desc:"Mortadela Cente Plus",            pasta:"PPFPLUS", sector:"PASTAS",   familia:"MORTADELAS",  vidaUtil:75,  kgBatch:294,  kgBatchMin:294,  leadTime:3 },
  // JAMONES
  { sku:"610",  desc:"Jamón ET. Dorada Barra",          pasta:"pja600",  sector:"JAMÓN",    familia:"J.DORADO",    vidaUtil:120, kgBatch:614,  kgBatchMin:307,  leadTime:4 },
  { sku:"600",  desc:"Jamón ET. Dorada Cuadrado",       pasta:"pja600",  sector:"JAMÓN",    familia:"J.DORADO",    vidaUtil:120, kgBatch:614,  kgBatchMin:307,  leadTime:4 },
  { sku:"601",  desc:"Jamón ET. Dorada Mitades",        pasta:"pja600",  sector:"JAMÓN",    familia:"J.DORADO",    vidaUtil:50,  kgBatch:614,  kgBatchMin:307,  leadTime:4 },
  { sku:"Q610", desc:"Jamón ET. Dorada Fetas 200g.",    pasta:"pja600",  sector:"JAMÓN",    familia:"J.DORADO",    vidaUtil:25,  kgBatch:1318, kgBatchMin:659,  leadTime:2 },
  { sku:"668",  desc:"Jamón Extra ET. Azul",            pasta:"pja001",  sector:"JAMÓN",    familia:"J.AZUL",      vidaUtil:120, kgBatch:1412, kgBatchMin:706,  leadTime:4 },
  { sku:"667",  desc:"Jamón Extra ET. Azul Mitades",    pasta:"pja001",  sector:"JAMÓN",    familia:"J.AZUL",      vidaUtil:50,  kgBatch:1412, kgBatchMin:706,  leadTime:4 },
  { sku:"Q212", desc:"Jamón Extra ET. Azul Fetas 200g.",pasta:"pja100",  sector:"JAMÓN",    familia:"J.AZUL",      vidaUtil:25,  kgBatch:1481, kgBatchMin:740,  leadTime:2 },
  { sku:"68",   desc:"Jamón ET. Negra",                 pasta:"pja500",  sector:"JAMÓN",    familia:"J.NEGRA",     vidaUtil:120, kgBatch:1318, kgBatchMin:659,  leadTime:4 },
  { sku:"62",   desc:"Jamón ET. Negra Mitades",         pasta:"pja500",  sector:"JAMÓN",    familia:"J.NEGRA",     vidaUtil:50,  kgBatch:1318, kgBatchMin:659,  leadTime:4 },
  { sku:"Q253", desc:"Jamón ET. Negra Fetas 200g.",     pasta:"pja500",  sector:"JAMÓN",    familia:"J.NEGRA",     vidaUtil:25,  kgBatch:1318, kgBatchMin:659,  leadTime:2 },
  { sku:"76",   desc:"Panceta Bacon Mitad Vacío",       pasta:"PJA400",  sector:"JAMÓN",    familia:"PANCETA",     vidaUtil:60,  kgBatch:1080, kgBatchMin:540,  leadTime:5 },
  { sku:"77",   desc:"Panceta Especial Mitad",          pasta:"PJA300",  sector:"JAMÓN",    familia:"PANCETA",     vidaUtil:60,  kgBatch:780,  kgBatchMin:390,  leadTime:5 },
  { sku:"110",  desc:"Lomito Canadiense Mitades",       pasta:"pja700",  sector:"JAMÓN",    familia:"LOMITOS",     vidaUtil:50,  kgBatch:1342, kgBatchMin:671,  leadTime:4 },
  { sku:"Q293", desc:"Lomito Canadiense Fetas 200g.",   pasta:"pja700",  sector:"JAMÓN",    familia:"LOMITOS",     vidaUtil:25,  kgBatch:1342, kgBatchMin:671,  leadTime:2 },
  { sku:"757",  desc:"Pechuga de Pollo Ahumada",        pasta:"pja1700", sector:"JAMÓN",    familia:"POLLO",       vidaUtil:50,  kgBatch:590,  kgBatchMin:295,  leadTime:4 },
  { sku:"758",  desc:"Pechuga de Pollo Mitades",        pasta:"pja1700", sector:"JAMÓN",    familia:"POLLO",       vidaUtil:50,  kgBatch:590,  kgBatchMin:295,  leadTime:4 },
  { sku:"Q757", desc:"Pechuga de Pollo Fetas 200g.",    pasta:"pja1700", sector:"JAMÓN",    familia:"POLLO",       vidaUtil:25,  kgBatch:590,  kgBatchMin:295,  leadTime:2 },
  { sku:"76",   desc:"Panceta Bacon Mitad Vacío",       pasta:"PJA400",  sector:"JAMÓN",    familia:"PANCETA",     vidaUtil:60,  kgBatch:1080, kgBatchMin:540,  leadTime:5 },
  { sku:"41",   desc:"Queso de Cerdo Mitades",          pasta:"PJA1200", sector:"JAMÓN",    familia:"SANDWICHERA", vidaUtil:60,  kgBatch:302,  kgBatchMin:302,  leadTime:4 },
  { sku:"701",  desc:"Panceta Americana",               pasta:"pin003",  sector:"JAMÓN",    familia:"PANCETA AM.", vidaUtil:60,  kgBatch:3768, kgBatchMin:1884, leadTime:4 },
];
 
// Quitar duplicados por sku
const MAESTRO_UNICO = MAESTRO_INI.filter((a,i,arr)=>arr.findIndex(b=>b.sku===a.sku)===i);
 
// ─── DATOS INICIALES DE MUESTRA ──────────────────────────────────────────────
const FCST_ACTUAL_INI = {
  "108":360.0,
  "109":160.0,
  "110":1022.0,
  "115":1149.0,
  "1151":130.0,
  "116":419.0,
  "12":55.0,
  "14":1176.0,
  "1500":118.0,
  "1512":1544.0,
  "200":1002.0,
  "201":913.0,
  "2012":454.0,
  "202":413.0,
  "203":564.0,
  "204":186.0,
  "206":1321.0,
  "21":532.0,
  "210":6692.0,
  "211":424.0,
  "2110":229.0,
  "212":3956.0,
  "213":318.0,
  "214":500.0,
  "215":400.0,
  "216":644.0,
  "217":1300.0,
  "218":85.0,
  "219":537.0,
  "2190":635.0,
  "222":1353.0,
  "224":93.0,
  "23":35.0,
  "242":300.0,
  "25":187.0,
  "250":2743.0,
  "252":1345.0,
  "254":5846.0,
  "255":62.0,
  "260":64.0,
  "28":32.0,
  "282":134.0,
  "300":20.0,
  "301":20.0,
  "302":55.0,
  "3161":100.0,
  "38":1190.0,
  "4004":30.0,
  "4005":224.0,
  "4050":2577.0,
  "4051":291.0,
  "4052":182.0,
  "4053":387.0,
  "4054":130.0,
  "4055":500.0,
  "4056":714.0,
  "4057":256.0,
  "4059":140.0,
  "40591":49.0,
  "41":129.0,
  "45":80.0,
  "49":30.0,
  "5009":130.0,
  "5010":129.0,
  "5044":84.0,
  "5064":35.0,
  "53":309.0,
  "550":1604.0,
  "56":47.0,
  "57":1072.0,
  "59":3.0,
  "60":80.0,
  "600":4840.0,
  "6000":328.0,
  "601":300.0,
  "6066":1187.0,
  "610":5098.0,
  "613":850.0,
  "6166":377.0,
  "62":156.0,
  "64":92.0,
  "661":223.0,
  "6611":65.0,
  "6612":214.0,
  "6613":84.0,
  "6615":155.0,
  "6616":50.0,
  "6617":45.0,
  "6644":166.0,
  "666":163.0,
  "6668":575.0,
  "6669":464.0,
  "667":716.0,
  "6671":95.0,
  "6672":218.0,
  "6673":88.0,
  "668":3210.0,
  "670":144.0,
  "6701":62.0,
  "68":800.0,
  "680":1100.0,
  "688":480.0,
  "701":964.0,
  "71":3197.0,
  "72":116.0,
  "74":1846.0,
  "757":89.0,
  "758":26.0,
  "76":7596.0,
  "760":385.0,
  "77":1692.0,
  "771":880.0,
  "82":12.0,
  "84":1190.0,
  "86":630.0,
  "87":596.0,
  "90":676.0,
  "91":28.0,
  "92":6.0,
  "95":257.0,
  "958":350.0,
  "96":72.0,
  "970":76.0,
  "98":281.0,
};
const FCST_S2_INI = {
  "108":404.0,
  "109":166.0,
  "110":957.0,
  "115":537.0,
  "1151":130.0,
  "116":329.0,
  "12":55.0,
  "14":1070.0,
  "1500":118.0,
  "1512":608.0,
  "200":1542.0,
  "201":952.0,
  "2012":381.0,
  "202":351.0,
  "203":338.0,
  "204":136.0,
  "206":1209.0,
  "21":1077.0,
  "210":6333.0,
  "211":347.0,
  "2110":166.0,
  "212":4348.0,
  "213":272.0,
  "214":540.0,
  "215":400.0,
  "216":999.0,
  "217":748.0,
  "218":85.0,
  "219":320.0,
  "2190":570.0,
  "222":1877.0,
  "224":99.0,
  "23":44.0,
  "242":304.0,
  "25":100.0,
  "250":1953.0,
  "252":1621.0,
  "254":6125.0,
  "255":121.0,
  "260":105.0,
  "28":19.0,
  "282":203.0,
  "300":23.0,
  "301":20.0,
  "302":65.0,
  "3161":139.0,
  "38":1470.0,
  "4004":34.0,
  "4005":268.0,
  "4050":3206.0,
  "4051":369.0,
  "4052":191.0,
  "4053":538.0,
  "4054":130.0,
  "4055":500.0,
  "4056":681.0,
  "4057":221.0,
  "4059":235.0,
  "40591":54.0,
  "41":48.0,
  "45":80.0,
  "49":54.0,
  "5009":130.0,
  "5010":90.0,
  "5044":148.0,
  "5064":33.0,
  "53":417.0,
  "550":1749.0,
  "56":49.0,
  "57":645.0,
  "59":5.0,
  "60":90.0,
  "600":4646.0,
  "6000":96.0,
  "601":675.0,
  "6066":1089.0,
  "610":3562.0,
  "613":1118.0,
  "6166":287.0,
  "62":96.0,
  "64":145.0,
  "661":300.0,
  "6611":153.0,
  "6612":229.0,
  "6613":76.0,
  "6615":155.0,
  "6616":50.0,
  "6617":45.0,
  "6644":116.0,
  "666":247.0,
  "6668":840.0,
  "6669":333.0,
  "667":686.0,
  "6671":126.0,
  "6672":325.0,
  "6673":136.0,
  "668":2801.0,
  "670":235.0,
  "6701":198.0,
  "68":800.0,
  "680":1100.0,
  "688":300.0,
  "70":82.0,
  "701":741.0,
  "71":2500.0,
  "72":113.0,
  "74":1259.0,
  "757":125.0,
  "758":21.0,
  "76":7581.0,
  "760":393.0,
  "77":1667.0,
  "771":882.0,
  "82":37.0,
  "84":1308.0,
  "86":489.0,
  "87":713.0,
  "90":644.0,
  "91":66.0,
  "92":3.0,
  "95":245.0,
  "958":350.0,
  "96":90.0,
  "970":51.0,
  "98":89.0,
};
const FCST_S3_INI = {
  "108":379.0,
  "109":150.0,
  "110":947.0,
  "115":605.0,
  "1151":263.0,
  "116":582.0,
  "12":55.0,
  "14":951.0,
  "1500":118.0,
  "1512":641.0,
  "200":832.0,
  "201":1276.0,
  "2012":495.0,
  "202":731.0,
  "203":328.0,
  "204":119.0,
  "206":1407.0,
  "21":691.0,
  "210":6616.0,
  "211":662.0,
  "2110":178.0,
  "212":3742.0,
  "213":444.0,
  "214":854.0,
  "215":400.0,
  "216":1135.0,
  "217":1264.0,
  "218":85.0,
  "219":476.0,
  "2190":652.0,
  "222":1491.0,
  "224":87.0,
  "23":35.0,
  "242":221.0,
  "25":122.0,
  "250":2193.0,
  "252":1792.0,
  "254":5737.0,
  "255":64.0,
  "260":73.0,
  "28":18.0,
  "282":136.0,
  "300":10.0,
  "301":22.0,
  "302":47.0,
  "3161":169.0,
  "38":1391.0,
  "4004":27.0,
  "4005":228.0,
  "4050":3030.0,
  "4051":377.0,
  "4052":204.0,
  "4053":594.0,
  "4054":130.0,
  "4055":500.0,
  "4056":854.0,
  "4057":272.0,
  "4059":303.0,
  "40591":77.0,
  "41":101.0,
  "45":80.0,
  "49":20.0,
  "5009":130.0,
  "5010":102.0,
  "5044":87.0,
  "5064":39.0,
  "53":295.0,
  "550":1530.0,
  "56":52.0,
  "57":889.0,
  "59":7.0,
  "60":95.0,
  "600":4257.0,
  "6000":389.0,
  "601":973.0,
  "6066":1152.0,
  "610":4414.0,
  "613":570.0,
  "6166":255.0,
  "62":156.0,
  "64":146.0,
  "661":315.0,
  "6611":128.0,
  "6612":222.0,
  "6613":173.0,
  "6615":155.0,
  "6616":50.0,
  "6617":45.0,
  "6644":203.0,
  "666":250.0,
  "6668":311.0,
  "6669":342.0,
  "667":727.0,
  "6671":170.0,
  "6672":224.0,
  "6673":53.0,
  "668":2766.0,
  "670":221.0,
  "6701":152.0,
  "68":800.0,
  "680":1530.0,
  "688":450.0,
  "70":20.0,
  "701":765.0,
  "71":2956.0,
  "72":59.0,
  "74":1934.0,
  "757":127.0,
  "758":38.0,
  "76":7895.0,
  "760":326.0,
  "77":1480.0,
  "771":856.0,
  "82":22.0,
  "84":1316.0,
  "86":592.0,
  "87":485.0,
  "90":695.0,
  "91":38.0,
  "92":12.0,
  "95":282.0,
  "958":394.0,
  "96":106.0,
  "970":71.0,
  "98":285.0,
};
const STOCK_INI = {
  "108":451.25,
  "109":153.55,
  "110":199.32,
  "115":2159.2,
  "1151":960.16,
  "116":1087.86,
  "12":80.95,
  "14":1197.57,
  "1500":248.13,
  "1512":2902.65,
  "200":1959.21,
  "201":1533.38,
  "2012":1874.98,
  "202":1393.78,
  "203":292.45,
  "204":331.8,
  "206":1200.91,
  "21":114.48,
  "210":10415.59,
  "211":601.38,
  "2110":215.01,
  "212":12473.29,
  "213":78.37,
  "214":586.47,
  "215":717.412,
  "216":2265.13,
  "217":2011.11,
  "218":669.73,
  "219":1309.55,
  "2190":0.4,
  "222":1611.43,
  "224":371.95,
  "23":152.75,
  "242":643.41,
  "25":249.08,
  "250":7326.43,
  "252":2791.05,
  "254":13052.86,
  "255":693.05,
  "260":39.75,
  "28":298.78,
  "282":81.9,
  "300":82.55,
  "301":75.4,
  "302":93.65,
  "3161":260.36,
  "38":2679.0,
  "4004":17.83,
  "4005":367.13,
  "4050":741.3525,
  "4051":188.78,
  "4052":350.514,
  "4053":1126.03,
  "4054":211.87,
  "4055":302.8625,
  "4056":1522.39,
  "4057":337.59,
  "4059":252.31,
  "40591":58.55,
  "41":112.15,
  "45":85.72,
  "49":65.76,
  "5009":90.385,
  "5010":59.865,
  "5041":390.6,
  "5044":215.98,
  "53":221.59,
  "550":2361.33,
  "56":2.55,
  "57":440.82,
  "59":10.34,
  "60":122.38,
  "600":4857.54,
  "6000":592.9,
  "601":637.61,
  "6066":160.6,
  "610":5401.37,
  "613":530.88,
  "61511":270.2,
  "61611":132.2,
  "6166":313.92,
  "61711":29.9,
  "62":714.33,
  "64":1882.96,
  "661":3543.25,
  "6611":330.57,
  "6612":263.77,
  "6613":315.25,
  "6615":667.48,
  "6616":389.0,
  "6617":676.25,
  "666":1266.63,
  "6668":237.62,
  "6669":218.05,
  "667":500.8,
  "6671":2182.91,
  "6672":1954.88,
  "6673":199.57,
  "668":7095.06,
  "670":1545.72,
  "6701":323.16,
  "68":5150.11,
  "680":5353.545,
  "688":1822.61,
  "70":299.4,
  "701":2196.99,
  "71":4186.86,
  "72":430.75,
  "74":3420.2,
  "757":206.36,
  "758":39.8,
  "76":919.52,
  "760":262.85,
  "77":243.595,
  "771":88.16,
  "82":31.29,
  "84":904.41,
  "86":1894.705,
  "87":1210.92,
  "90":503.54,
  "91":139.76,
  "92":75.3,
  "95":68.78,
  "96":344.13,
  "97":925.32,
  "971":747.24,
  "98":190.72,
};
 
 
const PROD_ACUM_INI  = Object.fromEntries(Object.keys(FCST_ACTUAL_INI).map(k=>[k,0]));
const PROD_PEND_INI = {
  "109":116.2,
  "110":1252.6,
  "12":149.0,
  "14":2043.6,
  "200":1819.3,
  "201":1913.0,
  "203":762.0,
  "21":434.6,
  "213":335.0,
  "222":1987.25,
  "23":4.0,
  "260":23.7,
  "282":206.0,
  "302":122.0,
  "38":745.0,
  "4050":2514.9,
  "4051":433.0,
  "4054":357.0,
  "4055":854.0,
  "5010":97.0,
  "53":696.0,
  "57":466.6,
  "60":27.0,
  "6066":2443.2,
  "6166":381.1,
  "6669":245.1,
  "6673":162.0,
  "758":26.0,
  "760":794.9,
  "77":3789.9,
  "771":2111.4,
  "84":1684.95,
  "90":867.75,
};
;
const PROD_S2_INI    = Object.fromEntries(Object.keys(FCST_ACTUAL_INI).map(k=>[k,undefined]));
const VENTA_ACUM_INI = {
  "108":399.0,
  "109":165.0,
  "11":59.0,
  "110":996.0,
  "115":659.0,
  "1151":6.0,
  "116":308.0,
  "13":11.3,
  "14":1.301,
  "15":5.267,
  "1500":85.0,
  "1512":596.0,
  "2":78.0,
  "200":1.029,
  "201":1.642,
  "2012":243.0,
  "202":339.0,
  "203":257.0,
  "204":28.0,
  "206":1.446,
  "21":615.0,
  "210":4.024,
  "211":310.0,
  "2110":377.0,
  "212":5.01,
  "213":265.0,
  "214":387.0,
  "215":581.0,
  "216":807.0,
  "217":2.19,
  "218":80.0,
  "219":153.0,
  "2190":423.0,
  "222":1.234,
  "224":172.0,
  "23":30.0,
  "242":198.0,
  "25":56.0,
  "250":2.174,
  "252":1.304,
  "254":4.904,
  "255":58.0,
  "260":144.0,
  "28":33.0,
  "282":239.0,
  "300":5.0,
  "301":13.0,
  "302":40.0,
  "3161":113.0,
  "38":1.261,
  "4004":33.0,
  "4005":223.0,
  "4038":166.0,
  "4050":3.133,
  "4051":288.0,
  "4052":139.0,
  "4053":558.0,
  "4054":117.0,
  "4055":487.0,
  "4056":915.0,
  "4057":310.0,
  "4059":129.0,
  "40591":48.0,
  "4062":35.0,
  "41":53.0,
  "45":64.0,
  "49":33.0,
  "5009":156.0,
  "5010":128.0,
  "5011":-6.0,
  "5012":1.0,
  "5014":984.0,
  "5041":8.0,
  "5044":102.0,
  "5061":532.0,
  "5064":72.0,
  "5068":196.0,
  "53":217.0,
  "550":948.0,
  "56":147.0,
  "57":896.0,
  "59":2.0,
  "60":40.0,
  "600":4.672,
  "6000":297.0,
  "601":265.0,
  "6066":1.061,
  "610":5.796,
  "613":790.0,
  "61511":53.0,
  "61611":35.0,
  "6166":121.0,
  "61711":20.0,
  "62":126.0,
  "64":232.0,
  "661":856.0,
  "6611":128.0,
  "6612":473.0,
  "6613":57.0,
  "6615":216.0,
  "6616":151.0,
  "6617":191.0,
  "6644":210.0,
  "666":466.0,
  "6668":767.0,
  "6669":376.0,
  "667":439.0,
  "6671":121.0,
  "6672":320.0,
  "6673":126.0,
  "668":2.432,
  "670":379.0,
  "6701":159.0,
  "68":946.0,
  "680":1.287,
  "688":200.0,
  "70":80.0,
  "701":418.0,
  "71":2.349,
  "72":97.0,
  "74":1.924,
  "757":141.0,
  "758":31.0,
  "76":5.607,
  "760":299.0,
  "77":1.136,
  "771":500.0,
  "82":22.0,
  "84":971.0,
  "86":677.0,
  "87":267.0,
  "9":3.964,
  "90":607.0,
  "900":133.0,
  "901":46.0,
  "902":1.639,
  "91":31.0,
  "92":4.0,
  "95":152.0,
  "958":25.0,
  "96":55.0,
  "970":14.0,
  "971":25.0,
  "972":3.114,
  "98":139.0,
  "CP100":23.443,
  "CP500":18.0,
  "CP700":418.0,
  "CP800":100.0,
  "HAM0002":2.114,
  "HAM0005":14.0,
  "HAM0006":53.0,
  "JC001":426.0,
  "JC002":157.0,
  "JC003":243.0,
  "JC004":90.0,
  "LACT0001":1.752,
  "LACT0003":156.0,
  "LACT0005":247.0,
  "LACT0006":1.459,
  "LACT0007":2.781,
  "LACT0008":920.0,
  "LACTM001":2.0,
  "LACTM002":1.0,
  "LACTM004":4.0,
  "Q053":53.0,
  "Q200":65.0,
  "Q212":477.0,
  "Q215":51.0,
  "Q216":3.0,
  "Q2293":47.0,
  "Q233":282.0,
  "Q236":186.0,
  "Q238":150.0,
  "Q239":163.0,
  "Q247":10.0,
  "Q253":731.0,
  "Q2781":402.0,
  "Q2791":63.0,
  "Q2802":23.0,
  "Q2814":37.0,
  "Q290":13.0,
  "Q2903":58.0,
  "Q293":213.0,
  "Q295":1.0,
  "Q298":3.0,
  "Q325":352.0,
  "Q329":43.0,
  "Q330":47.0,
  "Q3391":86.0,
  "Q368":184.0,
  "Q610":1.033,
  "Q700":72.0,
  "Q710":90.0,
  "Q720":187.0,
  "Q757":118.0,
  "Q802":155.0,
  "Q814":180.0,
  "Q817":13.0,
  "Q818":23.0,
  "Q834":81.0,
  "Q872":309.0,
  "Q882":223.0,
  "Q884":53.0,
  "Q903":117.0,
  "QJC003":64.0,
  "QJC0031":2.0,
  "QLACT006":11.0,
  "SLS0001":55.0,
  "SLS0003":27.0,
  "SLS0004":17.0,
  "SLS0005":4.0,
  "SLS0006":7.0,
  "SLS0007":56.0,
  "SLS0008":6.0,
  "SLS0009":35.0,
  "SLS0010":11.0,
  "Total":154.255,
  "VEG0001":100.0,
  "VEG0002":72.0,
  "VEG0003":38.0,
  "VEG0004":43.0,
  "VEG0005":10.0,
  "VEG0006":73.0,
  "VEG0007":4.0,
  "VEG0008":7.0,
  "VEG0009":2.0,
  "VEG0010":7.0,
  "VEG0011":18.0,
};
const PEDIDOS_PEND_INI = {
  "108":10.0,
  "109":2.0,
  "110":7.5,
  "115":63.8,
  "14":5.2,
  "1500":1.38,
  "1512":7.8,
  "200":11.2,
  "201":25.75,
  "206":24.0,
  "21":3.6,
  "210":69.6,
  "212":272.25,
  "215":5.58,
  "216":5.75,
  "217":5.9,
  "2190":6.6,
  "222":24.7,
  "242":4.45,
  "254":18.0,
  "260":7.8,
  "302":3.2,
  "38":1.5,
  "4004":1.8,
  "4005":0.3,
  "4050":11.55,
  "4052":10.5,
  "4053":2.1,
  "4054":1.75,
  "4055":1.05,
  "4056":3.5,
  "4057":0.62,
  "45":1.85,
  "49":1.85,
  "5009":0.5,
  "5044":1.8,
  "5064":2.16,
  "53":28.8,
  "56":1.8,
  "57":3.7,
  "60":3.55,
  "600":30.25,
  "6066":3.8,
  "610":6.0,
  "61511":0.6,
  "61611":1.0,
  "6166":14.8,
  "61711":1.5,
  "64":0.54,
  "661":0.54,
  "6611":0.18,
  "6612":2.7,
  "6613":0.45,
  "6615":1.5,
  "6616":2.5,
  "6617":2.5,
  "6644":2.4,
  "666":0.54,
  "6669":6.4,
  "667":6.1,
  "6672":3.2,
  "668":6.7,
  "670":0.54,
  "6701":2.16,
  "68":5.6,
  "680":11.8,
  "757":3.2,
  "76":3.9,
  "760":2.0,
  "77":4.3,
  "771":6.6,
  "84":5.3,
  "86":7.5,
  "87":4.9,
  "90":7.8,
  "95":1.1,
  "958":2.88,
  "96":10.0,
};
 
// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const COL_W = 72; // ancho uniforme de columnas de datos en px
 
const Th = ({children,right,center,style:s})=>(
  <th style={{padding:"5px 6px",textAlign:"center",
    color:C.muted,fontWeight:600,fontSize:10,letterSpacing:"0.05em",
    textTransform:"uppercase",whiteSpace:"nowrap",width:COL_W,minWidth:COL_W,
    borderBottom:`1px solid ${C.hairline}`,background:"#f8fafc",
    position:"sticky",top:0,zIndex:3,...s}}>
    {children}
  </th>
);
 
// Celda de dato — sin recuadro, centrada
const Tv = ({children,right,center,dim,mono,color,style:s})=>(
  <td style={{padding:"6px 6px",textAlign:"center",
    color:color||(dim?C.muted:C.text),fontSize:12,width:COL_W,
    fontFamily:mono?"'JetBrains Mono','Fira Code',monospace":"inherit",...s}}>
    {children}
  </td>
);
 
// Celda de input — centrada
const Ti = ({children,right})=>(
  <td style={{padding:"3px 4px",textAlign:"center",width:COL_W}}>
    {children}
  </td>
);
 
// Input editable — ancho uniforme
const Inp = ({value,onChange,width=64})=>(
  <input type="number" value={Math.round(value)||0} min={0}
    onChange={e=>onChange(Math.max(0,+e.target.value))}
    style={{width,padding:"3px 6px",border:`1px solid ${C.inputBorder}`,
      borderRadius:5,background:C.inputBg,color:C.text,fontSize:12,
      textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
);
 
// Valor de solo lectura con hint debajo
const Val = ({v,hint,color,bold})=>(
  <div style={{textAlign:"center"}}>
    <div style={{color:color||C.text,fontWeight:bold?600:400,fontSize:12,lineHeight:1.2}}>
      {typeof v==="number"?Math.round(v).toLocaleString("es-UY"):v}
    </div>
    {hint&&<div style={{fontSize:9,color:C.muted,marginTop:1}}>{hint}</div>}
  </div>
);
 
// Badge de estado — compacto, solo color + texto
const Badge = ({estado})=>{
  const e = POLITICA_DEFAULT[estado];
  if (!e) return null;
  return (
    <span style={{color:e.color,background:e.bg,
      border:`1px solid ${e.border}`,
      padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:600,
      whiteSpace:"nowrap",display:"inline-block"}}>
      {e.label}
    </span>
  );
};
 
// Pill de días con color de estado
const DiasPill = ({dias,estado})=>{
  const e = POLITICA_DEFAULT[estado]||{};
  const txt = dias===999?"∞":`${dias.toFixed(1)}d`;
  return (
    <span style={{color:e.color||C.text,fontWeight:600,fontSize:12}}>{txt}</span>
  );
};
 
const _SectionBar = ({children,right})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"20px 0 12px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:3,height:16,background:C.accent,borderRadius:2}}/>
      <span style={{fontSize:13,fontWeight:700,color:C.text}}>{children}</span>
    </div>
    {right&&<div>{right}</div>}
  </div>
);
 
// ─── KPI PANEL — 3 grupos ────────────────────────────────────────────────────
function KpiPanel({totFcst,totAcum,totProdS,totProdAcum,totProdOptS2,fcstS2Total,alertasS,alertasS2}) {
  const fmt = n => Math.round(n).toLocaleString("es-UY");
  const pctAcum = totFcst>0?Math.round(totAcum/totFcst*100):0;
  const pctProdAcum = totProdS>0?Math.round(totProdAcum/totProdS*100):0;
 
  const grupo = (titulo,color,children) => (
    <div style={{background:C.surface,border:`1px solid ${C.hairline}`,borderRadius:10,
      padding:"14px 18px",flex:1,minWidth:220,borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,fontWeight:700,color,letterSpacing:"0.08em",
        textTransform:"uppercase",marginBottom:12}}>{titulo}</div>
      {children}
    </div>
  );
 
  const fila = (label,value,hint,bold) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",
      marginBottom:6}}>
      <span style={{fontSize:11,color:C.textDim}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{fontSize:bold?16:13,fontWeight:bold?700:500,color:C.text}}>{value}</span>
        {hint&&<div style={{fontSize:10,color:C.muted}}>{hint}</div>}
      </div>
    </div>
  );
 
  // Barra de progreso
  const barra = (pct,color) => (
    <div style={{height:4,background:C.faint,borderRadius:2,marginBottom:10,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,pct)}%`,height:"100%",
        background:pct>100?"#dc2626":color,borderRadius:2,transition:"width 0.3s"}}/>
    </div>
  );
 
  return (
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
      {/* VENTA */}
      {grupo("Venta","#2563eb",<>
        {fila("Fcst S",`${fmt(totFcst)} kg`,null,true)}
        {barra(pctAcum,"#2563eb")}
        {fila("Facturado acum.",`${fmt(totAcum)} kg`,`${pctAcum}% del fcst`)}
        {fila("Fcst S+1",`${fmt(fcstS2Total)} kg`)}
      </>)}
 
      {/* PRODUCCIÓN */}
      {grupo("Producción","#7c3aed",<>
        {fila("Plan S",`${fmt(totProdS)} kg`,null,true)}
        {barra(pctProdAcum,"#7c3aed")}
        {fila("Prod. acum. S",`${fmt(totProdAcum)} kg`,`${pctProdAcum}% del plan`)}
        {fila("Prod. óptima S+1",`${fmt(totProdOptS2)} kg`)}
      </>)}
 
      {/* STOCK / ALERTAS */}
      {grupo("Alertas de stock","#dc2626",<>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Semana S</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.entries(POLITICA_DEFAULT).map(([k,v])=>{
              const cnt = alertasS[k]||0;
              return cnt>0?(
                <span key={k} style={{background:v.bg,color:v.color,
                  border:`1px solid ${v.border}`,padding:"2px 8px",
                  borderRadius:10,fontSize:10,fontWeight:600}}>
                  {cnt} {v.label}
                </span>
              ):null;
            })}
            {Object.values(alertasS).every(v=>!v)&&(
              <span style={{color:C.ok.color,fontSize:11,fontWeight:600}}>✓ Sin alertas</span>
            )}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Semana S+1</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.entries(POLITICA_DEFAULT).map(([k,v])=>{
              const cnt = alertasS2[k]||0;
              return cnt>0?(
                <span key={k} style={{background:v.bg,color:v.color,
                  border:`1px solid ${v.border}`,padding:"2px 8px",
                  borderRadius:10,fontSize:10,fontWeight:600}}>
                  {cnt} {v.label}
                </span>
              ):null;
            })}
            {Object.values(alertasS2).every(v=>!v)&&(
              <span style={{color:C.ok.color,fontSize:11,fontWeight:600}}>✓ Sin alertas</span>
            )}
          </div>
        </div>
      </>)}
    </div>
  );
}
 
// ─── LÓGICA CENTRAL ──────────────────────────────────────────────────────────
function calcDias(kgStock, kgVentaSemanal) {
  if (kgVentaSemanal <= 0) return kgStock > 0 ? 999 : 0;
  return (kgStock / kgVentaSemanal) * 7;
}
 
function calcRow(art, {fcstS, fcstS2, fcstS3, stockActual, ventaAcum, pedidosPend,
  prodAcum, prodPend, prodS2, conArrastre, usarPromedio}) {
 
  const vu      = art.vidaUtil;
  const pctObj  = (art.pctVUObj != null && art.pctVUObj > 0) ? art.pctVUObj : 0.20;
  const diasObj = vu * pctObj;
  const tme     = art.tme || 0;
  // Alerta: el stock objetivo supera el TME (queda menos VU de la que exige el cliente)
  const alertaTME = tme > 0 && diasObj > tme;
 
  // ── STOCK ACTUAL ──
  const stkActual    = stockActual[art.sku] || 0;
  const fcst         = fcstS[art.sku] || 0;
  const diasActual   = calcDias(stkActual, fcst);
  const estadoActual = getEstado(diasActual, vu, fcst);
 
  // ── VENTA S ──
  const factAcum  = ventaAcum[art.sku] || 0;
  const pedidos   = pedidosPend[art.sku] || 0;
  const fcstPend  = fcst - factAcum - pedidos;
  const ventaTotalS = factAcum + pedidos + Math.max(0, fcstPend);
 
  // ── PRODUCCIÓN S ──
  const pAcum = prodAcum[art.sku] || 0;
  // Prod. pendiente S: viene del CSV cargado en pestaña Producción, sino es 0
  const pPend = prodPend[art.sku] || 0;
  const prodTotalS = pAcum + pPend; // informativo
 
  // ── STOCK CIERRE S ──
  const stkCierreS = stkActual - Math.max(0, fcstPend) + pPend;
 
  // ── VENTA S+1 ──
  const fcstS2base = fcstS2[art.sku] || 0;
  const permiteArrastre = art.permiteArrastre !== false && (art.vidaUtil > 12);
  const arrastre   = (conArrastre && permiteArrastre)
    ? Math.max(0, fcstPend - Math.max(0, stkCierreS)) : 0;
  const fcstS2v    = fcstS2base + arrastre;
 
  // Días stock cierre S: medido contra fcst S+1 (es lo que el stock tiene que cubrir)
  const diasS    = calcDias(Math.max(0, stkCierreS), fcstS2v);
  const estadoS  = getEstado(diasS, vu, fcstS2v);
 
  // ── PRODUCCIÓN S+1 ──
  const fcstS3v = fcstS3[art.sku] || 0;
  // Stock objetivo: usa promedio de S, S+1, S+2 o solo S+2 según toggle
  const fcstRef  = usarPromedio
    ? ((fcst || 0) + (fcstS2v || 0) + (fcstS3v || 0)) / 3
    : fcstS3v;
  const stkObjS2  = (fcstRef / 7) * diasObj;
  const prodOptS2 = Math.max(0, fcstS2v + stkObjS2 - Math.max(0, stkCierreS));
  const prodS2val = (prodS2[art.sku] !== undefined && prodS2[art.sku] !== null)
    ? (prodS2[art.sku] || 0)
    : prodOptS2;
 
  // ── STOCK CIERRE S+1 ──
  const stkCierreS2 = Math.max(0, stkCierreS) - fcstS2v + prodS2val;
  // Días medidos contra fcst S+2
  const diasS2      = calcDias(Math.max(0, stkCierreS2), fcstS3v);
  const estadoS2    = getEstado(diasS2, vu, fcstS3v);
 
  return {
    stkActual, diasActual, estadoActual,
    fcst, factAcum, pedidos, fcstPend, ventaTotalS,
    pAcum, pPend, prodTotalS,
    stkCierreS, diasS, estadoS,
    fcstS3v,
    fcstS2v, arrastre,
    prodOptS2, prodS2val,
    stkCierreS2, diasS2, estadoS2,
    diasObj, tme, alertaTME,
  };
}
 
// ─── UTILIDADES CSV ──────────────────────────────────────────────────────────
function parsearCSV(texto) {
  // Detecta separador: tab, punto y coma o coma
  const sep = texto.includes("\t") ? "\t" : texto.includes(";") ? ";" : ",";
  return texto.trim().split("\n")
    .filter(l=>l.trim())
    .map(l=>l.split(sep).map(c=>c.trim().replace(/^["']|["']$/g,"")));
}
 
function parseKg(raw="") {
  // Maneja formato europeo: "3.199,5" → 3199.5 o "3.199" → 3199
  const s = raw.trim();
  if (!s || s==="-") return 0;
  return parseFloat(s.replace(/\./g,"").replace(",",".")) || 0;
}
 
function descargarCSV(nombre, contenido) {
  try {
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error("Error al descargar CSV:", err);
    alert("No se pudo generar el archivo: " + err.message);
  }
}
 
function CargaCSV({ titulo, descripcion, color="#2563eb", onCargar, ultimaCarga, plantillaNombre, plantillaContenido, children }) {
  const [msg, setMsg]         = useState(null);
  const [noEncontrados, setNoEncontrados] = useState([]);
  const [verDetalle, setVerDetalle]       = useState(false);
  const inputRef = useRef();
 
  function leerArchivo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parsearCSV(e.target.result);
        const { ok, noMatch, err, skusNoMatch=[] } = onCargar(rows);
        const partes = [`✓ ${ok} SKUs actualizados`];
        if (noMatch>0) partes.push(`${noMatch} no encontrados en maestro`);
        if (err>0)     partes.push(`${err} filas con error`);
        setMsg({ tipo:"ok", texto:partes.join(" · "), ts:new Date().toLocaleString("es-UY") });
        setNoEncontrados(skusNoMatch);
        setVerDetalle(false);
      } catch(ex) {
        setMsg({ tipo:"err", texto:"Error al leer el archivo: "+ex.message });
      }
    };
    reader.readAsText(file, "UTF-8");
    inputRef.current.value="";
  }
 
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
      padding:"18px 20px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
        gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:color,display:"inline-block"}}/>
            {titulo}
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.5}}>{descripcion}</div>
          {children}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",minWidth:160}}>
          <button onClick={()=>inputRef.current.click()}
            style={{background:color,border:"none",color:"#fff",padding:"8px 18px",
              borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
            ↑ Importar CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,.txt" style={{display:"none"}}
            onChange={e=>leerArchivo(e.target.files[0])}/>
          <button onClick={()=>descargarCSV(plantillaNombre, plantillaContenido)}
            style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
              padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:11}}>
            ↓ Plantilla CSV
          </button>
          {msg&&(
            <div style={{fontSize:10,textAlign:"right",maxWidth:220,lineHeight:1.4}}>
              <div style={{color:msg.tipo==="ok"?C.ok.color:C.faltante.color}}>{msg.texto}</div>
              {msg.ts&&<div style={{color:C.muted,marginTop:2}}>{msg.ts}</div>}
              {noEncontrados.length>0&&(
                <button onClick={()=>setVerDetalle(v=>!v)}
                  style={{marginTop:4,background:"none",border:`1px solid ${C.border}`,
                    color:"#b45309",padding:"2px 8px",borderRadius:4,cursor:"pointer",fontSize:10}}>
                  {verDetalle?"Ocultar":"Ver"} {noEncontrados.length} no encontrados
                </button>
              )}
            </div>
          )}
          {ultimaCarga&&!msg&&(
            <div style={{fontSize:10,color:C.muted,textAlign:"right"}}>
              Última carga: {ultimaCarga}
            </div>
          )}
        </div>
      </div>
      {/* Panel detalle no encontrados */}
      {verDetalle&&noEncontrados.length>0&&(
        <div style={{marginTop:12,padding:"10px 14px",background:"#fffbeb",
          border:"1px solid #fde68a",borderRadius:7}}>
          <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:6}}>
            SKUs no encontrados en el maestro — no se cargaron
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {noEncontrados.map(sku=>(
              <span key={sku} style={{background:"#fef3c7",color:"#92400e",
                border:"1px solid #fde68a",padding:"1px 7px",borderRadius:4,
                fontSize:10,fontFamily:"monospace"}}>
                {sku}
              </span>
            ))}
          </div>
          <div style={{fontSize:10,color:"#b45309",marginTop:8}}>
            Para incluirlos: agregá estos SKUs al Maestro y volvé a importar el CSV.
          </div>
        </div>
      )}
    </div>
  );
}
 
// ─── MÓDULO VENTA ─────────────────────────────────────────────────────────────
function PanelFCST({ maestro, fcstActual, setFcstActual, fcstS2, setFcstS2, fcstS3, setFcstS3,
  ventaAcum, setVentaAcum, pedidosPend, setPedidosPend }) {
  const [ultimaCargaFcst, setUltimaCargaFcst] = useState(null);
  const [ultimaCargaVA,   setUltimaCargaVA]   = useState(null);
  const [ultimaCargaPP,   setUltimaCargaPP]   = useState(null);
  const [verSector, setVerSector]             = useState(false);
 
  const skuSet = new Set(maestro.map(a=>a.sku));
 
  function cargarFcst(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const s1={}, s2={}, s3={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku = r[0].trim();
      if (!sku || sku.toLowerCase()==="sku") return;
      const v1=parseKg(r[1]), v2=parseKg(r[2]||"0"), v3=parseKg(r[3]||"0");
      s1[sku]=v1; s2[sku]=v2; s3[sku]=v3;
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setFcstActual(p=>({...p,...s1}));
    setFcstS2(p=>({...p,...s2}));
    setFcstS3(p=>({...p,...s3}));
    setUltimaCargaFcst(new Date().toLocaleString("es-UY"));
    return {ok,noMatch,err:0,skusNoMatch};
  }
 
  function cargarVentaAcum(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const va={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku = r[0].trim();
      if (!sku || sku.toLowerCase()==="sku" || sku.toLowerCase()==="número de artículo") return;
      const kg = parseKg(r[1]);
      va[sku] = kg;
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setVentaAcum(p=>({...p,...va}));
    setUltimaCargaVA(new Date().toLocaleString("es-UY"));
    return {ok,noMatch,err:0,skusNoMatch};
  }
 
  function cargarPedidosPend(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const pp={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku = r[0].trim();
      if (!sku || sku.toLowerCase()==="sku" || sku.toLowerCase()==="número de artículo") return;
      const kg = parseKg(r[1]);
      pp[sku] = kg;
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setPedidosPend(p=>({...p,...pp}));
    setUltimaCargaPP(new Date().toLocaleString("es-UY"));
    return {ok,noMatch,err:0,skusNoMatch};
  }
 
  const plantillaContenido = "SKU;S_actual;S+1;S+2\n" + maestro.map(a=>`${a.sku};0;0;0`).join("\n");
  const plantillaVA = "SKU;Venta_acum_kg\n" + maestro.map(a=>`${a.sku};0`).join("\n");
  const plantillaPP = "SKU;Pedidos_pend_kg\n" + maestro.map(a=>`${a.sku};0`).join("\n");
 
  const tot1  = maestro.reduce((a,r)=>a+(fcstActual[r.sku]||0),0);
  const tot2  = maestro.reduce((a,r)=>a+(fcstS2[r.sku]||0),0);
  const tot3  = maestro.reduce((a,r)=>a+(fcstS3[r.sku]||0),0);
  const totVA = maestro.reduce((a,r)=>a+(ventaAcum[r.sku]||0),0);
  const pct21 = tot1>0 ? Math.round((tot2-tot1)/tot1*100) : 0;
  const pct32 = tot2>0 ? Math.round((tot3-tot2)/tot2*100) : 0;
  const pctVA = tot1>0 ? Math.round(totVA/tot1*100) : 0;
 
  const pctColor = p => p>5?"#15803d":p<-5?"#b91c1c":"#d97706";
  const fmt      = n => Math.round(n).toLocaleString("es-UY");
 
  // Barra de avance
  const BarraAvance = ({pct,color}) => (
    <div style={{marginTop:6}}>
      <div style={{height:3,background:C.faint,borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:color,borderRadius:2}}/>
      </div>
      <div style={{fontSize:10,color,fontWeight:600,marginTop:2}}>{pct}% de avance</div>
    </div>
  );
 
  // Desglose por sector
  const sectores = [...new Set(maestro.map(a=>a.sector))];
  const porSector = sectores.map(sec=>{
    const arts = maestro.filter(a=>a.sector===sec);
    const s1=arts.reduce((a,r)=>a+(fcstActual[r.sku]||0),0);
    const s2=arts.reduce((a,r)=>a+(fcstS2[r.sku]||0),0);
    const s3=arts.reduce((a,r)=>a+(fcstS3[r.sku]||0),0);
    const va=arts.reduce((a,r)=>a+(ventaAcum[r.sku]||0),0);
    return { sec, s1, s2, s3, va,
      pct21: s1>0?Math.round((s2-s1)/s1*100):0,
      pct32: s2>0?Math.round((s3-s2)/s2*100):0,
      pctVA: s1>0?Math.round(va/s1*100):0,
      pctTotal: tot1>0?Math.round(s1/tot1*100):0 };
  }).sort((a,b)=>b.s1-a.s1);
 
  return (
    <div>
      <CargaCSV titulo="Forecast comercial"
        descripcion="CSV con 4 columnas: SKU · Fcst S · Fcst S+1 · Fcst S+2. Una fila por producto. Separador: punto y coma."
        color={C.gVenta} onCargar={cargarFcst} ultimaCarga={ultimaCargaFcst}
        plantillaNombre="forecast.csv" plantillaContenido={plantillaContenido}/>
 
      <CargaCSV titulo="Venta acumulada — SAP"
        descripcion="CSV con 2 columnas: SKU · kg facturados acumulados a la fecha. Mismo formato de exportación SAP que el stock."
        color="#0891b2" onCargar={cargarVentaAcum} ultimaCarga={ultimaCargaVA}
        plantillaNombre="venta_acumulada.csv" plantillaContenido={plantillaVA}/>
 
      <CargaCSV titulo="Pedidos pendientes — SAP"
        descripcion="CSV con 2 columnas: SKU · kg en pedidos confirmados pero aún no facturados."
        color="#0369a1" onCargar={cargarPedidosPend} ultimaCarga={ultimaCargaPP}
        plantillaNombre="pedidos_pendientes.csv" plantillaContenido={plantillaPP}/>
 
      {/* 4 tarjetas */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {/* Fcst S */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Fcst S</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(tot1)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>semana en curso</div>
        </div>
        {/* Venta acumulada */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Venta acumulada</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(totVA)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <BarraAvance pct={pctVA} color={pctVA>=80?"#15803d":pctVA>=50?"#d97706":"#b91c1c"}/>
        </div>
        {/* Fcst S+1 */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Fcst S+1</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(tot2)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
            <span style={{fontSize:12,fontWeight:700,color:pctColor(pct21)}}>{pctFmt(pct21)}</span>
            <span style={{fontSize:10,color:C.muted}}>vs S actual</span>
          </div>
        </div>
        {/* Fcst S+2 */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Fcst S+2</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(tot3)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
            <span style={{fontSize:12,fontWeight:700,color:pctColor(pct32)}}>{pctFmt(pct32)}</span>
            <span style={{fontSize:10,color:C.muted}}>vs S+1</span>
          </div>
        </div>
      </div>
 
      {/* Desglose por sector */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text}}>Desglose por sector</div>
        <button onClick={()=>setVerSector(v=>!v)}
          style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
            padding:"4px 12px",borderRadius:5,cursor:"pointer",fontSize:11}}>
          {verSector?"Ocultar":"Ver desglose"}
        </button>
      </div>
 
      {verSector&&(
        <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:16}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              <Th>Sector</Th>
              <Th right>Fcst S</Th><Th right>% total</Th>
              <Th right>Vta. acum.</Th><Th right>% avance</Th>
              <Th right>Fcst S+1</Th><Th right>Var.</Th>
              <Th right>Fcst S+2</Th><Th right>Var.</Th>
            </tr></thead>
            <tbody>
              {porSector.map(({sec,s1,s2,s3,va,pct21:p21,pct32:p32,pctVA:pVA,pctTotal})=>(
                <tr key={sec} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv><span style={{fontWeight:500}}>{sec}</span></Tv>
                  <Tv right>{fmt(s1)}</Tv>
                  <Tv right>
                    <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                      <div style={{width:44,height:4,background:C.faint,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${pctTotal}%`,height:"100%",background:C.gVenta,borderRadius:2}}/>
                      </div>
                      <span style={{color:C.muted,fontSize:11}}>{pctTotal}%</span>
                    </div>
                  </Tv>
                  <Tv right dim>{fmt(va)}</Tv>
                  <Tv right>
                    <span style={{color:pVA>=80?"#15803d":pVA>=50?"#d97706":"#b91c1c",fontWeight:600,fontSize:11}}>{pVA}%</span>
                  </Tv>
                  <Tv right dim>{fmt(s2)}</Tv>
                  <Tv right><span style={{color:pctColor(p21),fontWeight:600,fontSize:11}}>{pctFmt(p21)}</span></Tv>
                  <Tv right dim>{fmt(s3)}</Tv>
                  <Tv right><span style={{color:pctColor(p32),fontWeight:600,fontSize:11}}>{pctFmt(p32)}</span></Tv>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${C.hairline}`,background:"#f8fafc"}}>
                <Tv><span style={{fontWeight:700}}>Total</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(tot1)}</span></Tv>
                <Tv right><span style={{color:C.muted,fontSize:11}}>100%</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totVA)}</span></Tv>
                <Tv right><span style={{color:pctColor(pctVA-100),fontWeight:700}}>{pctVA}%</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(tot2)}</span></Tv>
                <Tv right><span style={{color:pctColor(pct21),fontWeight:700}}>{pctFmt(pct21)}</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(tot3)}</span></Tv>
                <Tv right><span style={{color:pctColor(pct32),fontWeight:700}}>{pctFmt(pct32)}</span></Tv>
              </tr>
            </tbody>
          </table>
        </div>
      )}
 
      {/* Tabla detalle SKU */}
      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Detalle por SKU — editable celda a celda</div>
      <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,maxHeight:420,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            <Th>SKU</Th><Th>Descripción</Th><Th>Sector</Th>
            <Th right>Fcst S</Th><Th right>Vta. acum.</Th><Th right>% av.</Th>
            <Th right>S+1</Th><Th right>Var.</Th>
            <Th right>S+2</Th><Th right>Var.</Th>
          </tr></thead>
          <tbody>
            {maestro.map(art=>{
              const s1=fcstActual[art.sku]||0, s2=fcstS2[art.sku]||0, s3=fcstS3[art.sku]||0;
              const va=ventaAcum[art.sku]||0;
              const pctAv=s1>0?Math.round(va/s1*100):null;
              const v21=s1>0?Math.round((s2-s1)/s1*100):null;
              const v32=s2>0?Math.round((s3-s2)/s2*100):null;
              return (
                <tr key={art.sku} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv mono dim>{art.sku}</Tv>
                  <Tv>{art.desc}</Tv>
                  <Tv dim>{art.sector}</Tv>
                  <Tv right><Inp value={s1} width={72} onChange={v=>setFcstActual(p=>({...p,[art.sku]:v}))}/></Tv>
                  <Tv right dim>{fmt(va)}</Tv>
                  <Tv right>
                    {pctAv!==null
                      ? <span style={{color:pctAv>=80?"#15803d":pctAv>=50?"#d97706":"#b91c1c",fontSize:10,fontWeight:600}}>{pctAv}%</span>
                      : <span style={{color:C.muted,fontSize:10}}>—</span>}
                  </Tv>
                  <Tv right><Inp value={s2} width={72} onChange={v=>setFcstS2(p=>({...p,[art.sku]:v}))}/></Tv>
                  <Tv right>{v21!==null?<span style={{color:pctColor(v21),fontSize:10,fontWeight:600}}>{pctFmt(v21)}</span>:<span style={{color:C.muted,fontSize:10}}>—</span>}</Tv>
                  <Tv right><Inp value={s3} width={72} onChange={v=>setFcstS3(p=>({...p,[art.sku]:v}))}/></Tv>
                  <Tv right>{v32!==null?<span style={{color:pctColor(v32),fontSize:10,fontWeight:600}}>{pctFmt(v32)}</span>:<span style={{color:C.muted,fontSize:10}}>—</span>}</Tv>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── MÓDULO PRODUCCIÓN ────────────────────────────────────────────────────────
function PanelProd({ maestro, prodAcum, setProdAcum, prodPend, setProdPend, prodS2, setProdS2, fcstActual }) {
  const [ultimaCarga, setUltimaCarga] = useState(null);
  const [verSector, setVerSector]     = useState(false);
  const skuSet = new Set(maestro.map(a=>a.sku));
 
  function cargarProd(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const pend={}, s2={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku=r[0].trim();
      if (!sku||sku.toLowerCase()==="sku") return;
      pend[sku]=parseKg(r[1]); s2[sku]=parseKg(r[2]||"0");
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setProdPend(p=>({...p,...pend}));
    setProdS2(p=>({...p,...s2}));
    setUltimaCarga(new Date().toLocaleString("es-UY"));
    return {ok,noMatch,err:0,skusNoMatch};
  }
 
  const plantillaContenidoProd = "SKU;Prod_pend_S;Prod_S+1\n" + maestro.map(a=>`${a.sku};0;0`).join("\n");
 
  const fmt      = n => Math.round(n).toLocaleString("es-UY");
  const pctColor = p => p>5?"#15803d":p<-5?"#b91c1c":"#d97706";
 
  const totAcum  = maestro.reduce((a,r)=>a+(prodAcum[r.sku]||0),0);
  const totPend  = maestro.reduce((a,r)=>a+(prodPend[r.sku]||0),0);
  const totTotal = totAcum + totPend;
  const totS2    = maestro.reduce((a,r)=>a+(prodS2[r.sku]||0),0);
  const totFcst  = maestro.reduce((a,r)=>a+(fcstActual[r.sku]||0),0);
  const pctAcumTotal = totTotal>0?Math.round(totAcum/totTotal*100):0;
  const pctTotalFcst = totFcst>0?Math.round(totTotal/totFcst*100):0;
 
  // Barra de avance
  const BarraAvance = ({pct,color}) => (
    <div style={{marginTop:6}}>
      <div style={{height:3,background:C.faint,borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:color,borderRadius:2}}/>
      </div>
      <div style={{fontSize:10,color,fontWeight:600,marginTop:2}}>{pct}%</div>
    </div>
  );
 
  // Desglose por sector
  const sectores = [...new Set(maestro.map(a=>a.sector))];
  const porSector = sectores.map(sec=>{
    const arts = maestro.filter(a=>a.sector===sec);
    const acum=arts.reduce((a,r)=>a+(prodAcum[r.sku]||0),0);
    const pend=arts.reduce((a,r)=>a+(prodPend[r.sku]||0),0);
    const total=acum+pend;
    const fcst=arts.reduce((a,r)=>a+(fcstActual[r.sku]||0),0);
    const s2=arts.reduce((a,r)=>a+(prodS2[r.sku]||0),0);
    return { sec, acum, pend, total, fcst, s2,
      pctAcumT: total>0?Math.round(acum/total*100):0,
      pctTotFcst: fcst>0?Math.round(total/fcst*100):0,
      pctDel: totTotal>0?Math.round(total/totTotal*100):0 };
  }).sort((a,b)=>b.total-a.total);
 
  return (
    <div>
      <CargaCSV titulo="Plan de producción"
        descripcion="CSV con 3 columnas: SKU · Prod pendiente S · Prod S+1. Separador: punto y coma."
        color={C.gProd} onCargar={cargarProd} ultimaCarga={ultimaCarga}
        plantillaNombre="produccion.csv" plantillaContenido={plantillaContenidoProd}/>
 
      {/* 4 tarjetas */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {/* Prod acum */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Prod. acum. S</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(totAcum)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <BarraAvance pct={pctAcumTotal} color={pctAcumTotal>=60?"#15803d":pctAcumTotal>=30?"#d97706":"#b91c1c"}/>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>del total producido S</div>
        </div>
        {/* Prod pend */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Prod. pendiente S</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(totPend)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <div style={{fontSize:10,color:C.muted,marginTop:6}}>días restantes de la semana</div>
        </div>
        {/* Prod total S */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Prod. total S</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(totTotal)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <BarraAvance pct={pctTotalFcst} color={pctTotalFcst>=90?"#15803d":pctTotalFcst>=70?"#d97706":"#b91c1c"}/>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>del fcst S</div>
        </div>
        {/* Plan S+1 */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Plan S+1</div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>{fmt(totS2)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span></div>
          <div style={{fontSize:10,color:C.muted,marginTop:6}}>plan confirmado planta</div>
        </div>
      </div>
 
      {/* Desglose por sector */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text}}>Desglose por sector</div>
        <button onClick={()=>setVerSector(v=>!v)}
          style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
            padding:"4px 12px",borderRadius:5,cursor:"pointer",fontSize:11}}>
          {verSector?"Ocultar":"Ver desglose"}
        </button>
      </div>
 
      {verSector&&(
        <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:16}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              <Th>Sector</Th>
              <Th right>Prod. acum.</Th><Th right>Prod. pend.</Th>
              <Th right>Total S</Th><Th right>Acum/Total</Th>
              <Th right>Fcst S</Th><Th right>Total/Fcst</Th>
              <Th right>Plan S+1</Th>
            </tr></thead>
            <tbody>
              {porSector.map(({sec,acum,pend,total,fcst,s2,pctAcumT,pctTotFcst,pctDel})=>(
                <tr key={sec} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv><span style={{fontWeight:500}}>{sec}</span></Tv>
                  <Tv right dim>{fmt(acum)}</Tv>
                  <Tv right dim>{fmt(pend)}</Tv>
                  <Tv right>{fmt(total)}</Tv>
                  <Tv right>
                    <span style={{color:pctAcumT>=60?"#15803d":pctAcumT>=30?"#d97706":"#b91c1c",fontWeight:600,fontSize:11}}>
                      {pctAcumT}%
                    </span>
                  </Tv>
                  <Tv right dim>{fmt(fcst)}</Tv>
                  <Tv right>
                    <span style={{color:pctTotFcst>=90?"#15803d":pctTotFcst>=70?"#d97706":"#b91c1c",fontWeight:600,fontSize:11}}>
                      {pctTotFcst}%
                    </span>
                  </Tv>
                  <Tv right dim>{fmt(s2)}</Tv>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${C.hairline}`,background:"#f8fafc"}}>
                <Tv><span style={{fontWeight:700}}>Total</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totAcum)}</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totPend)}</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totTotal)}</span></Tv>
                <Tv right><span style={{color:pctColor(pctAcumTotal-50),fontWeight:700}}>{pctAcumTotal}%</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totFcst)}</span></Tv>
                <Tv right><span style={{color:pctColor(pctTotalFcst-90),fontWeight:700}}>{pctTotalFcst}%</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totS2)}</span></Tv>
              </tr>
            </tbody>
          </table>
        </div>
      )}
 
      {/* Tabla detalle SKU */}
      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Detalle por SKU — editable celda a celda</div>
      <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,maxHeight:420,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            <Th>SKU</Th><Th>Descripción</Th><Th>Sector</Th>
            <Th right>Prod. acum.</Th>
            <Th right>Prod. pend.</Th>
            <Th right>Total S</Th><Th right>Acum/Total</Th>
            <Th right>Plan S+1</Th>
          </tr></thead>
          <tbody>
            {maestro.map(art=>{
              const acum=prodAcum[art.sku]||0, pend=prodPend[art.sku]||0;
              const total=acum+pend, s2val=prodS2[art.sku]||0;
              const pctAT=total>0?Math.round(acum/total*100):null;
              return (
                <tr key={art.sku} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv mono dim>{art.sku}</Tv>
                  <Tv>{art.desc}</Tv>
                  <Tv dim>{art.sector}</Tv>
                  <Tv right><Inp value={acum} width={72} onChange={v=>setProdAcum(p=>({...p,[art.sku]:v}))}/></Tv>
                  <Tv right><Inp value={pend} width={72} onChange={v=>setProdPend(p=>({...p,[art.sku]:v}))}/></Tv>
                  <Tv right><span style={{fontWeight:500}}>{fmt(total)}</span></Tv>
                  <Tv right>
                    {pctAT!==null
                      ? <span style={{color:pctAT>=60?"#15803d":pctAT>=30?"#d97706":"#b91c1c",fontSize:10,fontWeight:600}}>{pctAT}%</span>
                      : <span style={{color:C.muted,fontSize:10}}>—</span>}
                  </Tv>
                  <Tv right><Inp value={s2val} width={72} onChange={v=>setProdS2(p=>({...p,[art.sku]:v}))}/></Tv>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── MÓDULO PRINCIPAL ────────────────────────────────────────────────────────
function PanelPlan({ maestro, fcstActual, setFcstActual, fcstS2, setFcstS2, fcstS3,
  stockActual, setStockActual, ventaAcum, setVentaAcum,
  pedidosPend, setPedidosPend, prodAcum, setProdAcum,
  prodPend, setProdPend, prodS2, setProdS2 }) {
 
  const [filtroSector, setFiltroSector]   = useState("Todos");
  const [filtroEstado, setFiltroEstado]   = useState("Todos");
  const [filtroReventa, setFiltroReventa] = useState("Todos"); // Todos / Propio / Reventa
  const [filtroVacio, setFiltroVacio]     = useState("Todos"); // Todos / Si / No
  const [buscar, setBuscar]             = useState("");
  const [orden, setOrden]               = useState({ col:"desc", dir:"asc" });
  const [mostrarS2, setMostrarS2]       = useState(true);
  const [conArrastre, setConArrastre]   = useState(false);
  const [usarPromedio, setUsarPromedio] = useState(false);
  const sectores = ["Todos",...new Set(maestro.map(a=>a.sector))];
 
  const ctx = { fcstS:fcstActual, fcstS2, fcstS3, stockActual, ventaAcum, pedidosPend,
                prodAcum, prodPend, prodS2, conArrastre, usarPromedio };
 
  const rows = maestro.map(art=>({ art, ...calcRow(art, ctx) }));
 
  const rowsFilt = rows.filter(r=>{
    const sOk = filtroSector==="Todos"||r.art.sector===filtroSector;
    const eOk = filtroEstado==="Todos" || r.estadoActual===filtroEstado;
    const rOk = filtroReventa==="Todos" || (filtroReventa==="Reventa"?r.art.reventa:!r.art.reventa);
    const vOk = filtroVacio==="Todos"   || (filtroVacio==="Si"?r.art.vacio:!r.art.vacio);
    const bOk = !buscar.trim() ||
      r.art.sku.toLowerCase().includes(buscar.toLowerCase()) ||
      r.art.desc.toLowerCase().includes(buscar.toLowerCase());
    return sOk&&eOk&&rOk&&vOk&&bOk;
  }).sort((a,b)=>{
    const d = orden.dir==="asc" ? 1 : -1;
    if (orden.col==="sku")  return d * String(a.art.sku).localeCompare(String(b.art.sku), undefined, {numeric:true});
    if (orden.col==="desc") return d * a.art.desc.localeCompare(b.art.desc);
    if (orden.col==="dias") {
      const da = isNaN(a.diasActual)||a.diasActual===999 ? 9999 : Number(a.diasActual);
      const db = isNaN(b.diasActual)||b.diasActual===999 ? 9999 : Number(b.diasActual);
      return d * (da - db);
    }
    if (orden.col==="estado") {
      const ord = ["faltante","substockAlerta","sinForecast","ok","sobrestockAlerta","sobrestockRiesgo"];
      const ia = ord.indexOf(a.estadoActual); 
      const ib = ord.indexOf(b.estadoActual);
      return d * ((ia===-1?3:ia) - (ib===-1?3:ib));
    }
    return 0;
  });
 
  // Toggle de orden
  function toggleOrden(col) {
    setOrden(o => o.col===col ? { col, dir: o.dir==="asc"?"desc":"asc" } : { col, dir:"asc" });
  }
  const sortIcon = col => orden.col===col ? (orden.dir==="asc"?" ↑":" ↓") : " ↕";
 
  const fmt = n => Math.round(n).toLocaleString("es-UY");
 
  // Totales para KpiPanel
  const totFcst      = rows.reduce((a,r)=>a+r.fcst,0);
  const totAcum      = rows.reduce((a,r)=>a+r.factAcum,0);
  const totProdS     = rows.reduce((a,r)=>a+r.prodTotalS,0);
  const totProdAcum  = rows.reduce((a,r)=>a+r.pAcum,0);
  const totProdOptS2 = rows.reduce((a,r)=>a+r.prodOptS2,0);
  const fcstS2Total  = rows.reduce((a,r)=>a+r.fcstS2v,0);
 
  // Conteo de alertas por estado
  const cuentaAlertas = (campo) => {
    const c={};
    Object.keys(POLITICA_DEFAULT).forEach(k=>{ c[k]=rows.filter(r=>r[campo]===k).length; });
    return c;
  };
  const alertasS  = cuentaAlertas("estadoS");
  const alertasS2 = cuentaAlertas("estadoS2");
 
  // Header de grupo — Opción A: fondo blanco, color solo en texto y borde superior
  const GrpTh = ({label,cols,color,sep}) => (
    <th colSpan={cols} style={{padding:"5px 10px",textAlign:"center",fontSize:9,fontWeight:700,
      letterSpacing:"0.08em",textTransform:"uppercase",
      color:color,background:"#f8fafc",
      borderTop:`2px solid ${color}`,
      borderLeft:sep?`1px solid ${C.hairline}`:undefined,
      borderBottom:`1px solid ${C.hairline}`,
      position:"sticky",top:0,zIndex:3}}>
      {label}
    </th>
  );
 
  // Fondo de fila — siempre blanco, estado visible solo en badges y números
  const rowBg = () => "#fff";
 
  const sel = {background:"#f0f4ff"};
 
  return (
    <div>
      <KpiPanel totFcst={totFcst} totAcum={totAcum} totProdS={totProdS}
        totProdAcum={totProdAcum} totProdOptS2={totProdOptS2} fcstS2Total={fcstS2Total}
        alertasS={alertasS} alertasS2={alertasS2}/>
 
      {/* Controles */}
      <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Buscar por código o descripción..." value={buscar}
          onChange={e=>setBuscar(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
            padding:"7px 12px",borderRadius:6,fontSize:12,outline:"none",minWidth:220,flex:1}}/>
        <select value={filtroSector} onChange={e=>setFiltroSector(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.textDim,
            padding:"6px 12px",borderRadius:6,fontSize:12,outline:"none"}}>
          {sectores.map((s,i)=><option key={s} value={s}>{i===0?"Todos los sectores":s}</option>)}
        </select>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.textDim,
            padding:"6px 12px",borderRadius:6,fontSize:12,outline:"none"}}>
          <option value="Todos">Todos los estados</option>
          {Object.entries(POLITICA_DEFAULT).map(([k,v])=>(
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filtroReventa} onChange={e=>setFiltroReventa(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.textDim,
            padding:"6px 12px",borderRadius:6,fontSize:12,outline:"none"}}>
          <option value="Todos">Propio + Reventa</option>
          <option value="Propio">Solo producción propia</option>
          <option value="Reventa">Solo reventa</option>
        </select>
        <select value={filtroVacio} onChange={e=>setFiltroVacio(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.textDim,
            padding:"6px 12px",borderRadius:6,fontSize:12,outline:"none"}}>
          <option value="Todos">Con y sin vacío</option>
          <option value="Si">Solo al vacío</option>
          <option value="No">Sin vacío</option>
        </select>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim,cursor:"pointer"}}>
          <input type="checkbox" checked={mostrarS2} onChange={e=>setMostrarS2(e.target.checked)}/>
          Ver S+1
        </label>
        {mostrarS2&&(
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",
            color:conArrastre?"#c2410c":C.textDim,padding:"4px 10px",borderRadius:5,
            background:conArrastre?"#fff7ed":"transparent",
            border:`1px solid ${conArrastre?"#fed7aa":C.border}`}}>
            <input type="checkbox" checked={conArrastre} onChange={e=>setConArrastre(e.target.checked)}/>
            Sumar demanda no atendida a S+1
          </label>
        )}
        {mostrarS2&&(
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",
            color:usarPromedio?C.accent:C.textDim,padding:"4px 10px",borderRadius:5,
            background:usarPromedio?C.accentDim:"transparent",
            border:`1px solid ${usarPromedio?C.accent:C.border}`}}>
            <input type="checkbox" checked={usarPromedio} onChange={e=>setUsarPromedio(e.target.checked)}/>
            Venta promedio S/S+1/S+2
          </label>
        )}
        <div style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>{rowsFilt.length} artículos</div>
      </div>
 
      {/* Leyenda filtro */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {Object.entries(POLITICA_DEFAULT).map(([k,v])=>(
          <span key={k} style={{
            background:filtroEstado===k?v.bg:"transparent",
            color:filtroEstado===k?v.color:C.muted,
            border:`1px solid ${filtroEstado===k?v.border:C.hairline}`,
            padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer"}}
            onClick={()=>setFiltroEstado(filtroEstado===k?"Todos":k)}>
            {v.label}
          </span>
        ))}
      </div>
 
      {/* Tabla */}
      <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${C.border}`,
        maxHeight:600,overflowY:"auto",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{position:"sticky",top:0,zIndex:4}}>
              <th rowSpan={2} onClick={()=>toggleOrden("sku")}
                style={{padding:"8px 8px",background:"#f8fafc",fontWeight:600,
                fontSize:10,color:orden.col==="sku"?C.accent:C.muted,textTransform:"uppercase",
                letterSpacing:"0.06em",borderBottom:`2px solid ${C.hairline}`,
                position:"sticky",top:0,left:0,zIndex:5,textAlign:"center",
                width:64,minWidth:64,whiteSpace:"nowrap",cursor:"pointer",userSelect:"none",
                borderRight:`1px solid ${C.hairline}`}}>
                Cód.{sortIcon("sku")}
              </th>
              <th rowSpan={2} onClick={()=>toggleOrden("desc")}
                style={{padding:"8px 10px",background:"#f8fafc",fontWeight:600,
                fontSize:10,color:orden.col==="desc"?C.accent:C.muted,textTransform:"uppercase",
                letterSpacing:"0.06em",borderBottom:`2px solid ${C.hairline}`,
                position:"sticky",top:0,left:64,zIndex:5,textAlign:"left",
                width:180,minWidth:180,cursor:"pointer",userSelect:"none",
                borderRight:`2px solid ${C.border}`}}>
                Descripción{sortIcon("desc")}
              </th>
              <GrpTh label="Stock actual" cols={3} color="#475569"/>
              <GrpTh label="Venta S" cols={4} color="#2563eb" sep/>
              <GrpTh label="Producción S" cols={2} color="#7c3aed"/>
              <GrpTh label="Stock cierre S" cols={3} color="#0f766e"/>
              {mostrarS2&&<>
                <GrpTh label="Venta S+1" cols={1} color="#1d4ed8" sep/>
                <GrpTh label="Producción S+1" cols={2} color="#6d28d9"/>
                <GrpTh label="Stock cierre S+1" cols={3} color="#0d9488"/>
                <GrpTh label="Venta S+2" cols={1} color="#1d4ed8" sep/>
              </>}
            </tr>
            <tr style={{position:"sticky",top:28,zIndex:3,background:"#f8fafc",
              borderBottom:`2px solid ${C.hairline}`}}>
              {/* Stock actual */}
              <Th right>kg</Th>
              <Th right>Días</Th>
              <Th>Estado</Th>
              {/* Venta S */}
              <Th right>Fcst S</Th><Th right>Fact. acum.</Th><Th right>Ped. pend.</Th><Th right>Fcst pend.</Th>
              {/* Producción S */}
              <Th right>Prod. acum.</Th><Th right>Prod. pend.</Th>
              {/* Stock cierre S */}
              <Th right>kg</Th><Th right>Días</Th><Th>Estado</Th>
              {mostrarS2&&<>
                <Th right>Fcst S+1</Th>
                <Th right>Prod. S+1</Th><Th right>Óptima</Th>
                <Th right>kg</Th><Th right>Días</Th><Th>Estado</Th>
                <Th right>Fcst S+2</Th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rowsFilt.map(({art,stkActual,diasActual,estadoActual,
              fcst,factAcum,pedidos,fcstPend,
              pAcum,pPend,
              stkCierreS,diasS,estadoS,
              fcstS2v,fcstS3v,arrastre,prodOptS2,prodS2val,
              stkCierreS2,diasS2,estadoS2,diasObj})=>{
 
              const bg = rowBg(estadoActual);
              const sep = {borderLeft:`1px solid ${C.hairline}`};
 
              return (
                <tr key={art.sku}
                  style={{borderTop:`1px solid ${C.hairline}`,background:bg}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background=bg}>
 
                  {/* SKU — sticky izquierda */}
                  <td style={{padding:"6px 8px",position:"sticky",left:0,zIndex:1,
                    background:"inherit",borderRight:`1px solid ${C.hairline}`,
                    fontFamily:"monospace",fontSize:11,color:C.textDim,
                    whiteSpace:"nowrap",textAlign:"center",width:64,minWidth:64}}>
                    {art.sku}
                  </td>
 
                  {/* DESCRIPCIÓN — sticky después del SKU */}
                  <td style={{padding:"6px 10px",position:"sticky",left:64,zIndex:1,
                    background:"inherit",borderRight:`2px solid ${C.border}`,
                    width:180,minWidth:180}}>
                    <div style={{fontWeight:500,color:C.text,fontSize:12,
                      width:170,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {art.desc}
                    </div>
                    <div style={{fontSize:9,color:C.muted,marginTop:1}}>
                      VU {art.vidaUtil}d · obj {diasObj.toFixed(0)}d
                    </div>
                  </td>
 
                  {/* STOCK ACTUAL — solo lectura */}
                  <Tv right color={POLITICA_DEFAULT[estadoActual]?.color}>
                    <Val v={stkActual} color={POLITICA_DEFAULT[estadoActual]?.color} bold/>
                  </Tv>
                  <Tv right><DiasPill dias={diasActual} estado={estadoActual}/></Tv>
                  <Tv><Badge estado={estadoActual}/></Tv>
 
                  {/* VENTA S — todo solo lectura */}
                  <Tv right dim style={sep}><Val v={fcst}/></Tv>
                  <Tv right dim><Val v={factAcum}
                    hint={fcst>0?`${Math.round(factAcum/fcst*100)}%`:""}/></Tv>
                  <Tv right dim><Val v={pedidos}/></Tv>
                  <Tv right>
                    <span style={{color:fcstPend<0?"#b45309":fcstPend===0?C.muted:C.text,
                      fontSize:12,fontWeight:fcstPend!==0?500:400}}>
                      {fmt(Math.max(0,fcstPend))}
                    </span>
                    {fcstPend<0&&<div style={{fontSize:9,color:"#b45309"}}>sobreventa</div>}
                  </Tv>
 
                  {/* PRODUCCIÓN S — acum solo lectura, pend editable */}
                  <Tv right dim style={sep}><Val v={pAcum}/></Tv>
                  <Ti right>
                    <Inp value={Math.round(pPend)} width={75}
                      onChange={v=>setProdPend(p=>({...p,[art.sku]:v}))}/>
                  </Ti>
 
                  {/* STOCK CIERRE S — calculado */}
                  <Tv right style={sep}>
                    <span style={{color:stkCierreS<0?"#b91c1c":C.text,fontWeight:stkCierreS<0?600:400,fontSize:12}}>
                      {fmt(stkCierreS)}
                    </span>
                    {stkCierreS<0&&<div style={{fontSize:9,color:"#b91c1c"}}>déficit</div>}
                  </Tv>
                  <Tv right><DiasPill dias={diasS} estado={estadoS}/></Tv>
                  <Tv><Badge estado={estadoS}/></Tv>
 
                  {/* S+1 */}
                  {mostrarS2&&<>
                    {/* Fcst S+1 — solo lectura */}
                    <Tv right dim style={sep}>
                      <Val v={fcstS2v} hint={arrastre>0?`+${fmt(arrastre)} arr.`:null}/>
                    </Tv>
 
                    {/* Prod S+1 — editable, por defecto = óptima calculada */}
                    <Ti right>
                      <Inp value={Math.round(prodS2val)} width={75}
                        onChange={v=>setProdS2(p=>({...p,[art.sku]:v}))}/>
                      {(prodS2[art.sku]===undefined||prodS2[art.sku]===null)
                        ? <div style={{fontSize:9,color:C.accent,textAlign:"center",marginTop:1}}>auto</div>
                        : <div style={{fontSize:9,color:C.muted,textAlign:"center",marginTop:1,cursor:"pointer"}}
                            onClick={()=>setProdS2(p=>({...p,[art.sku]:undefined}))}>
                            ↺ reset
                          </div>}
                    </Ti>
                    {/* Óptima — referencia chica */}
                    <Tv right>
                      <span style={{fontSize:10,color:C.muted}}>{fmt(prodOptS2)}</span>
                    </Tv>
 
                    {/* Stock cierre S+1 */}
                    <Tv right style={sep}>
                      <span style={{color:stkCierreS2<0?"#b91c1c":C.text,fontWeight:stkCierreS2<0?600:400,fontSize:12}}>
                        {fmt(Math.max(0,stkCierreS2))}
                      </span>
                      {stkCierreS2<0&&<div style={{fontSize:9,color:"#b91c1c"}}>déficit</div>}
                    </Tv>
                    <Tv right><DiasPill dias={diasS2} estado={estadoS2}/></Tv>
                    <Tv><Badge estado={estadoS2}/></Tv>
 
                    {/* Fcst S+2 — solo lectura, al final */}
                    <Tv right dim style={sep}>
                      <Val v={fcstS3v}/>
                    </Tv>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── MÓDULO STOCK ────────────────────────────────────────────────────────────
function PanelStock({ maestro, stockActual, setStockActual }) {
  const [ultimaCarga, setUltimaCarga] = useState(null);
  const [verSector, setVerSector]     = useState(false);
  const skuSet = new Set(maestro.map(a=>a.sku));
 
  function cargarStock(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const s={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku = r[0]?.trim();
      if (!sku || sku.toLowerCase()==="sku" || sku.toLowerCase()==="número de artículo") return;
      const kg = parseKg(r[1]);
      if (isNaN(kg)) return;
      s[sku] = kg;
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setStockActual(p=>({...p,...s}));
    setUltimaCarga(new Date().toLocaleString("es-UY"));
    return {ok, noMatch, err:0};
  }
 
  const plantillaContenido = "SKU;Stock_kg\n" + maestro.map(a=>`${a.sku};0`).join("\n");
 
  const fmt = n => Math.round(n).toLocaleString("es-UY");
 
  // Totales por sector
  const sectores = [...new Set(maestro.map(a=>a.sector))];
  const totStock  = maestro.reduce((a,r)=>a+(stockActual[r.sku]||0),0);
  const porSector = sectores.map(sec=>{
    const arts = maestro.filter(a=>a.sector===sec);
    const kg = arts.reduce((a,r)=>a+(stockActual[r.sku]||0),0);
    return { sec, kg, pct: totStock>0?Math.round(kg/totStock*100):0 };
  }).sort((a,b)=>b.kg-a.kg);
 
  return (
    <div>
      <CargaCSV titulo="Stock actual — SAP"
        descripcion="CSV con 2 columnas: SKU · kg en stock. Mismo formato de exportación SAP. Suma CD01 + CD05 antes de importar."
        color="#0f766e" onCargar={cargarStock} ultimaCarga={ultimaCarga}
        plantillaNombre="stock.csv" plantillaContenido={plantillaContenido}/>
 
      {/* Totales */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>
            Stock total
          </div>
          <div style={{fontSize:20,fontWeight:700,color:C.text}}>
            {fmt(totStock)} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>kg</span>
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>{maestro.filter(a=>stockActual[a.sku]>0).length} artículos con stock</div>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>
            Sin stock
          </div>
          <div style={{fontSize:20,fontWeight:700,color:C.faltante.color}}>
            {maestro.filter(a=>!(stockActual[a.sku]>0)).length}
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>artículos en cero</div>
        </div>
        {ultimaCarga&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>
            Última carga
          </div>
          <div style={{fontSize:13,fontWeight:600,color:C.ok.color}}>{ultimaCarga}</div>
        </div>}
      </div>
 
      {/* Desglose por sector */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text}}>Desglose por sector</div>
        <button onClick={()=>setVerSector(v=>!v)}
          style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
            padding:"4px 12px",borderRadius:5,cursor:"pointer",fontSize:11}}>
          {verSector?"Ocultar":"Ver desglose"}
        </button>
      </div>
 
      {verSector&&(
        <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:16}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>
              <Th>Sector</Th><Th right>Stock (kg)</Th><Th right>% del total</Th>
            </tr></thead>
            <tbody>
              {porSector.map(({sec,kg,pct})=>(
                <tr key={sec} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv><span style={{fontWeight:500}}>{sec}</span></Tv>
                  <Tv right>{fmt(kg)}</Tv>
                  <Tv right>
                    <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                      <div style={{width:60,height:4,background:C.faint,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:"#0f766e",borderRadius:2}}/>
                      </div>
                      <span style={{color:C.muted,fontSize:11}}>{pct}%</span>
                    </div>
                  </Tv>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${C.hairline}`,background:"#f8fafc"}}>
                <Tv><span style={{fontWeight:700}}>Total</span></Tv>
                <Tv right><span style={{fontWeight:700}}>{fmt(totStock)}</span></Tv>
                <Tv right><span style={{color:C.muted,fontSize:11}}>100%</span></Tv>
              </tr>
            </tbody>
          </table>
        </div>
      )}
 
      {/* Tabla detalle */}
      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Detalle por artículo — editable celda a celda</div>
      <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,maxHeight:480,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            <Th>SKU</Th><Th>Descripción</Th><Th>Sector</Th><Th right>Stock (kg)</Th>
          </tr></thead>
          <tbody>
            {maestro.map(art=>{
              const kg = stockActual[art.sku]||0;
              return (
                <tr key={art.sku} style={{borderTop:`1px solid ${C.faint}`}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Tv mono dim>{art.sku}</Tv>
                  <Tv>{art.desc}</Tv>
                  <Tv dim>{art.sector}</Tv>
                  <Tv right>
                    <Inp value={kg} width={80}
                      onChange={v=>setStockActual(p=>({...p,[art.sku]:v}))}/>
                  </Tv>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── MÓDULO PEDIDO A PLANTA ───────────────────────────────────────────────────
function PanelSAP({ maestro, rows, politica }) {
  const GRUPOS = {
    "Pedido semanal": a=>!["SECOS"].includes(a.sector)&&!a.desc.toLowerCase().includes("pack"),
    "Secadero":       a=>a.sector==="SECOS",
    "Packs":          a=>a.desc.toLowerCase().includes("pack"),
  };
 
  function exportarGrupo(grupo, items) {
    const header = "SKU;Descripción;Pasta;Fcst S+1 (kg);Stk cierre S (kg);Stk inicio S+1 (sem);Prod. óptima S+1 (kg);Batch ref.\n";
    const body = items.map(r=>{
      const stkCierreS = Math.max(0, r.stkCierreS);
      const diasIni = r.fcstS2v > 0 ? (stkCierreS/r.fcstS2v).toFixed(2) : "";
      return [r.art.sku, r.art.desc, r.art.pasta||"",
        Math.round(r.fcstS2v), Math.round(stkCierreS),
        diasIni, Math.round(r.prodOptS2), Math.round(r.art.kgBatch)
      ].join(";");
    }).join("\n");
    descargarCSV(`pedido_${grupo.toLowerCase().replace(/ /g,"_")}_S+1.csv`, header+body);
  }
 
  function exportarTodo() {
    const header = "Grupo;SKU;Descripción;Pasta;Fcst S+1 (kg);Stk cierre S (kg);Stk inicio S+1 (sem);Prod. óptima S+1 (kg);Batch ref.\n";
    const body = Object.entries(GRUPOS).flatMap(([grupo,filtro])=>
      rows.filter(r=>filtro(r.art)&&r.prodOptS2>0).map(r=>{
        const stkCierreS = Math.max(0, r.stkCierreS);
        const diasIni = r.fcstS2v > 0 ? (stkCierreS/r.fcstS2v).toFixed(2) : "";
        return [grupo, r.art.sku, r.art.desc, r.art.pasta||"",
          Math.round(r.fcstS2v), Math.round(stkCierreS),
          diasIni, Math.round(r.prodOptS2), Math.round(r.art.kgBatch)
        ].join(";");
      })
    ).join("\n");
    descargarCSV("pedido_planta_S+1.csv", header+body);
  }
 
  const totalItems = rows.filter(r=>r.prodOptS2>0).length;
  const totalKg    = rows.filter(r=>r.prodOptS2>0).reduce((a,r)=>a+r.prodOptS2,0);
 
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Semana S+1</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {totalItems} artículos · {Math.round(totalKg).toLocaleString("es-UY")} kg totales
          </div>
        </div>
        <button onClick={exportarTodo}
          style={{background:C.gProd,border:"none",color:"#fff",padding:"8px 18px",
            borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>
          ↓ Exportar todo (CSV)
        </button>
      </div>
 
      {Object.entries(GRUPOS).map(([grupo,filtro])=>{
        const items = rows.filter(r=>filtro(r.art)&&r.prodOptS2>0);
        if (items.length===0) return null;
        const totalGrupo = items.reduce((a,r)=>a+r.prodOptS2,0);
        return (
          <div key={grupo} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:3,height:16,background:C.accent,borderRadius:2}}/>
                <span style={{fontSize:13,fontWeight:700,color:C.text}}>{grupo}</span>
                <span style={{fontSize:11,color:C.muted}}>
                  {items.length} artículos · {Math.round(totalGrupo).toLocaleString("es-UY")} kg
                </span>
              </div>
              <button onClick={()=>exportarGrupo(grupo,items)}
                style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
                  padding:"4px 12px",borderRadius:5,cursor:"pointer",fontSize:11}}>
                ↓ CSV
              </button>
            </div>
            <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>
                  <Th>SKU</Th><Th>Descripción</Th><Th>Pasta</Th>
                  <Th right>Fcst S+1</Th><Th right>Stk cierre S</Th>
                  <Th right>Stk inicio S+1 (sem)</Th>
                  <Th right>Prod. óptima S+1</Th><Th right>Batch ref.</Th>
                </tr></thead>
                <tbody>
                  {items.map(r=>{
                    const stkCierreS = Math.max(0, r.stkCierreS);
                    const diasInicioS2 = r.fcstS2v > 0
                      ? (stkCierreS / r.fcstS2v).toFixed(2)
                      : "—";
                    return (
                    <tr key={r.art.sku} style={{borderTop:`1px solid ${C.faint}`}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <Tv mono dim>{r.art.sku}</Tv>
                      <Tv>{r.art.desc}</Tv>
                      <Tv><span style={{color:C.accent,fontFamily:"monospace",fontSize:10}}>{r.art.pasta}</span></Tv>
                      <Tv right dim>{Math.round(r.fcstS2v).toLocaleString("es-UY")}</Tv>
                      <Tv right dim>{Math.round(stkCierreS).toLocaleString("es-UY")}</Tv>
                      <Tv right>
                        {r.fcstS2v > 0 ? (()=>{
                          const diasIniNum = stkCierreS / r.fcstS2v * 7;
                          const vu = r.art.vidaUtil;
                          const pct = vu > 0 ? diasIniNum / vu : 0;
                          const estado = pct >= (politica.sobrestockRiesgo?.min||0.8) ? politica.sobrestockRiesgo
                            : pct >= (politica.sobrestockAlerta?.min||0.3) ? politica.sobrestockAlerta
                            : pct >= (politica.ok?.min||0.1) ? politica.ok
                            : pct >= (politica.substockAlerta?.min||0.01) ? politica.substockAlerta
                            : politica.faltante;
                          return (
                            <span style={{color:estado?.color||C.text,fontWeight:600,fontSize:12}}>
                              {diasInicioS2}
                            </span>
                          );
                        })()
                        : <span style={{color:C.muted}}>—</span>}
                      </Tv>
                      <Tv right>
                        <span style={{color:C.gProd,fontWeight:700}}>
                          {Math.round(r.prodOptS2).toLocaleString("es-UY")}
                        </span>
                      </Tv>
                      <Tv right dim>{r.art.kgBatch.toLocaleString("es-UY")}</Tv>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
 
// ─── MÓDULO MAESTRO ───────────────────────────────────────────────────────────
// Política de stock mutable (fuera del componente para que persista entre renders)
const POLITICA_INI = {
  sobrestockRiesgo: { min:0.80, max:null, ...C.sobRiesgo },
  sobrestockAlerta: { min:0.30, max:0.80, ...C.sobAlerta },
  ok:               { min:0.10, max:0.30, ...C.ok },
  substockAlerta:   { min:0.01, max:0.10, ...C.subAlerta },
  faltante:         { min:0,    max:0.01, ...C.faltante },
  sinForecast:      { min:null, max:null, color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", label:"Sin forecast" },
};
 
function PanelMaestro({ maestro, setMaestro, politica, setPolitica }) {
  const [buscar, setBuscar]   = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm]       = useState(null);
  const [rol, setRol]         = useState("admin");
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [msgCarga, setMsgCarga] = useState(null);
  const inputMaestroRef = useRef();
 
  const arts = maestro.filter(a=>
    a.desc.toLowerCase().includes(buscar.toLowerCase())||
    a.sku.toLowerCase().includes(buscar.toLowerCase())||
    (a.pasta||"").toLowerCase().includes(buscar.toLowerCase())
  );
 
  // Exportar maestro actual como CSV
  function exportarMaestro() {
    const header = "SKU;Descripcion;Pasta;Familia;Subfamilia;Sector;VidaUtil;TME;ObjPct;KgBatch;KgBatchMin;LeadTime;PesoUnitario;UnBatera;PermiteArrastre;Reventa;Vacio\n";
    const body = maestro.map(a=>
      [a.sku, a.desc, a.pasta||"", a.familia||"", a.subfamilia||"", a.sector,
       a.vidaUtil, a.tme||"",
       a.pctVUObj ? Math.round(a.pctVUObj*100) : "",
       a.kgBatch, a.kgBatchMin, a.leadTime,
       a.pesoUnitario||"", a.unBatera||"",
       a.permiteArrastre===false?"No":"Si",
       a.reventa?"Si":"No",
       a.vacio?"Si":"No",
      ].join(";")
    ).join("\n");
    descargarCSV("maestro_articulos.csv", header+body);
  }
 
  // Importar CSV masivo — agrega nuevos y actualiza existentes por SKU
  function importarMaestro(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parsearCSV(e.target.result);
        let agregados=0, actualizados=0, err=0;
        const copia = [...maestro];
        const idxPorSku = Object.fromEntries(copia.map((a,i)=>[a.sku,i]));
 
        rows.forEach(r=>{
          if (r.length < 5) return;
          const sku = r[0]?.trim();
          if (!sku || sku.toLowerCase()==="sku") return;
          try {
            const pn = v => parseFloat((v||"0").toString().replace(",",".")) || 0;
            const art = {
              sku,
              desc:          r[1]?.trim()||"",
              pasta:         r[2]?.trim()||"",
              familia:       r[3]?.trim()||"",
              subfamilia:    r[4]?.trim()||"",
              sector:        r[5]?.trim()||"",
              vidaUtil:      pn(r[6]) || 60,
              tme:           pn(r[7]) || 0,
              pctVUObj:      r[8]?.trim() ? Math.max(1,Math.min(100,pn(r[8])))/100 : null,
              kgBatch:       pn(r[9])  || 500,
              kgBatchMin:    pn(r[10]) || 500,
              leadTime:      pn(r[11]) || 3,
              pesoUnitario:  pn(r[12]) || 0,
              unBatera:      pn(r[13]) || 0,
              permiteArrastre: (r[14]?.trim().toLowerCase()||"si")!=="no",
              reventa:       (r[15]?.trim().toLowerCase()||"no")==="si",
              vacio:         (r[16]?.trim().toLowerCase()||"no")==="si",
            };
            if (idxPorSku[sku] !== undefined) {
              copia[idxPorSku[sku]] = art;
              actualizados++;
            } else {
              copia.push(art);
              idxPorSku[sku] = copia.length-1;
              agregados++;
            }
          } catch { err++; }
        });
 
        setMaestro(copia);
        setMsgCarga(`✓ ${agregados} agregados · ${actualizados} actualizados${err>0?` · ${err} errores`:""} — ${new Date().toLocaleString("es-UY")}`);
        setTimeout(()=>setMsgCarga(null), 5000);
      } catch(ex) {
        setMsgCarga("Error al leer el archivo: "+ex.message);
      }
    };
    reader.readAsText(file, "UTF-8");
    inputMaestroRef.current.value="";
  }
 
  function editar(idx) { setEditIdx(idx); setForm({...maestro[idx]}); }
 
  function guardar() {
    const art={...form,vidaUtil:+form.vidaUtil,kgBatch:+form.kgBatch,
      kgBatchMin:+form.kgBatchMin,leadTime:+form.leadTime};
    const copia=[...maestro];
    if(editIdx!==null) copia[editIdx]=art; else copia.push(art);
    setMaestro(copia); setForm(null); setEditIdx(null);
  }
 
  function eliminarSeleccionados() {
    if (seleccionados.size===0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.size} artículo(s)?`)) return;
    setMaestro(maestro.filter((_,i)=>!seleccionados.has(i)));
    setSeleccionados(new Set());
  }
 
  function toggleSel(i) {
    const s = new Set(seleccionados);
    s.has(i) ? s.delete(i) : s.add(i);
    setSeleccionados(s);
  }
 
  const sectorColor = {
    CHORIZOS:  { bg:"#fff7ed", color:"#c2410c" },
    FRANKFURT: { bg:"#eff6ff", color:"#1d4ed8" },
    PASTAS:    { bg:"#f5f3ff", color:"#6d28d9" },
    "JAMÓN":   { bg:"#f0fdf4", color:"#15803d" },
    SECOS:     { bg:"#f8fafc", color:"#475569" },
  };
 
  // Actualizar el límite entre dos franjas: hasta de una = desde de la siguiente
  // filasOrden va de mayor a menor riesgo: sobrestockRiesgo > sobrestockAlerta > ok > substockAlerta > faltante
  function setLimite(key, valor) {
    const pct = Math.max(0, Math.min(100, +valor)) / 100;
    const idx = filasOrden.indexOf(key);
    const keySiguiente = filasOrden[idx + 1]; // la franja inferior, cuyo "max" es este mismo límite
 
    setPolitica(prev => {
      const next = { ...prev, [key]: { ...prev[key], min: pct } };
      if (keySiguiente && next[keySiguiente]) {
        next[keySiguiente] = { ...next[keySiguiente], max: pct };
      }
      return next;
    });
  }
 
  const filasOrden = ["sobrestockRiesgo","sobrestockAlerta","ok","substockAlerta","faltante"];
 
  return (
    <div>
      {/* ── SELECTOR DE ROL — arriba de todo ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,padding:"10px 16px",background:C.surface,
        border:`1px solid ${C.border}`,borderRadius:8}}>
        <div style={{fontSize:11,color:C.muted}}>
          Sesión actual: <strong style={{color:C.text}}>{rol==="admin"?"Administrador":"Usuario"}</strong>
          {rol==="admin"
            ? " · podés editar artículos, alertas de stock e importar/exportar el maestro"
            : " · solo lectura, podés exportar el maestro a CSV"}
        </div>
        <div style={{display:"flex",gap:0,background:"#f8fafc",border:`1px solid ${C.border}`,
          borderRadius:6,overflow:"hidden"}}>
          {["admin","user"].map(r=>(
            <button key={r} onClick={()=>setRol(r)}
              style={{background:rol===r?C.accent:"transparent",border:"none",
                color:rol===r?"#fff":C.muted,padding:"7px 16px",cursor:"pointer",
                fontSize:12,fontWeight:rol===r?700:400}}>
              {r==="admin"?"🔐 Admin":"👤 User"}
            </button>
          ))}
        </div>
      </div>
 
      {/* ── ALERTAS DE STOCK ── */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
        padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>
          Alertas de stock {rol==="admin"&&<span style={{color:C.accent}}>🔐</span>}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.hairline}`}}>
                <Th>Estado</Th>
                <Th right>Desde (% VU)</Th>
                <Th right>Hasta (% VU)</Th>
                <Th>Ejemplo VU 60d</Th>
              </tr>
            </thead>
            <tbody>
              {filasOrden.map((k,i)=>{
                const v = politica[k];
                if (!v || v.min===null) return null;
                const desdePct = Math.round((v.min||0)*100);
                const hastaPct = v.max!=null ? Math.round(v.max*100) : null;
                const desdeD   = Math.round(60*(v.min||0));
                const hastaD   = v.max!=null ? Math.round(60*v.max) : null;
                const esUltima = i===filasOrden.length-1; // faltante: el "desde" siempre es 0%, no editable
                return (
                  <tr key={k} style={{borderTop:`1px solid ${C.faint}`}}>
                    <Tv>
                      <span style={{background:v.bg,color:v.color,border:`1px solid ${v.border}`,
                        padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600}}>
                        {v.label}
                      </span>
                    </Tv>
                    <Tv right>
                      {(!esUltima && rol==="admin") ? (
                        <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                          <Inp value={desdePct} width={55}
                            onChange={val=>setLimite(k,val)}/>
                          <span style={{color:C.muted,fontSize:11}}>%</span>
                        </div>
                      ) : <span style={{color:C.textDim,fontSize:12}}>{desdePct}%</span>}
                    </Tv>
                    <Tv right>
                      {hastaPct!=null
                        ? <span style={{color:C.textDim}}>{hastaPct}%</span>
                        : <span style={{color:C.muted,fontSize:11}}>sin límite</span>}
                    </Tv>
                    <Tv dim>
                      {desdeD}d {hastaD!=null?`→ ${hastaD}d`:"→ ∞"}
                    </Tv>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:10}}>
          Stock objetivo = 20% de la vida útil · Los umbrales definen el semáforo de alertas
        </div>
      </div>
 
      {/* ── BARRA DE CONTROLES ── */}
      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <input placeholder="Buscar SKU, descripción o pasta..." value={buscar}
          onChange={e=>setBuscar(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
            padding:"8px 14px",borderRadius:6,fontSize:12,outline:"none",flex:1,minWidth:200}}/>
        {rol==="admin"&&<>
          <button onClick={()=>{setForm({sku:"",desc:"",pasta:"",familia:"",
            sector:"CHORIZOS",vidaUtil:60,kgBatch:500,kgBatchMin:500,leadTime:3,
            permiteArrastre:true});setEditIdx(null);}}
            style={{background:C.accent,border:"none",color:"#fff",padding:"8px 14px",
              borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>
            + Artículo
          </button>
          <button onClick={eliminarSeleccionados} disabled={seleccionados.size===0}
            style={{background:seleccionados.size>0?"#fef2f2":"#f8fafc",
              border:`1px solid ${seleccionados.size>0?"#fecaca":C.border}`,
              color:seleccionados.size>0?"#b91c1c":C.muted,
              padding:"8px 14px",borderRadius:6,cursor:seleccionados.size>0?"pointer":"not-allowed",
              fontSize:12,fontWeight:700}}>
            − {seleccionados.size>0?`${seleccionados.size} artículo(s)`:"Artículo"}
          </button>
          <div style={{width:1,height:28,background:C.border}}/>
          <button onClick={()=>inputMaestroRef.current.click()}
            style={{background:"#f0fdf4",border:`1px solid #bbf7d0`,color:"#15803d",
              padding:"8px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>
            ↑ Importar CSV
          </button>
          <input ref={inputMaestroRef} type="file" accept=".csv,.txt" style={{display:"none"}}
            onChange={e=>importarMaestro(e.target.files[0])}/>
        </>}
        <button onClick={exportarMaestro}
          style={{background:"#f8fafc",border:`1px solid ${C.border}`,color:C.muted,
            padding:"8px 14px",borderRadius:6,cursor:"pointer",fontSize:12}}>
          ↓ Exportar CSV
        </button>
      </div>
      {msgCarga&&(
        <div style={{fontSize:11,color:C.ok.color,fontWeight:600,marginBottom:12,
          padding:"8px 14px",background:C.ok.bg,border:`1px solid ${C.ok.border}`,borderRadius:6}}>
          {msgCarga}
        </div>
      )}
 
      {/* ── FORMULARIO ── */}
      {form&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          padding:20,marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>
            {editIdx!==null?"Editar artículo":"Nuevo artículo"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
            {[["SKU","sku","text",false],["Descripción","desc","text",false],
              ["Pasta","pasta","text",true],["Familia","familia","text",false],
              ["Subfamilia","subfamilia","text",false],
              ["Sector","sector","text",false],
              ["Vida útil (días)","vidaUtil","number",true],
              ["TME (días)","tme","number",true],
              ["Kg/Batch","kgBatch","number",true],["Kg/Batch mín.","kgBatchMin","number",true],
              ["Lead time (días)","leadTime","number",true],
              ["Peso unitario (kg)","pesoUnitario","number",false],
              ["Un/batera","unBatera","number",false],
            ].map(([label,key,type,esAdmin])=>(
              <label key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                <span style={{fontSize:10,color:C.muted}}>
                  {label}{esAdmin&&<span style={{color:C.gProd}}> 🔐</span>}
                </span>
                <input type={type} value={form[key]||""}
                  disabled={esAdmin&&rol!=="admin"}
                  onChange={e=>!(esAdmin&&rol!=="admin")&&setForm({...form,[key]:e.target.value})}
                  style={{background:esAdmin&&rol!=="admin"?"#f9fafb":C.surface,
                    border:`1px solid ${C.border}`,color:C.text,padding:"6px 10px",
                    borderRadius:5,fontSize:12,outline:"none",
                    cursor:esAdmin&&rol!=="admin"?"not-allowed":"text"}}/>
              </label>
            ))}
            {/* % objetivo de stock — manejo especial, se guarda como decimal */}
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>
                % obj. stock (vacío=20% global) <span style={{color:C.gProd}}>🔐</span>
              </span>
              <input type="number" min={1} max={100}
                value={form.pctVUObj!=null ? Math.round(form.pctVUObj*100) : ""}
                disabled={rol!=="admin"}
                placeholder="20"
                onChange={e=>{
                  if (rol!=="admin") return;
                  const raw = e.target.value;
                  setForm({...form, pctVUObj: raw==="" ? null : Math.max(1,Math.min(100,+raw))/100});
                }}
                style={{background:rol!=="admin"?"#f9fafb":C.surface,
                  border:`1px solid ${C.border}`,color:C.text,padding:"6px 10px",
                  borderRadius:5,fontSize:12,outline:"none",
                  cursor:rol!=="admin"?"not-allowed":"text"}}/>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Permite arrastre S→S+1 🔐</span>
              <select value={form.permiteArrastre===false?"no":"si"}
                disabled={rol!=="admin"}
                onChange={e=>rol==="admin"&&setForm({...form,permiteArrastre:e.target.value==="si"})}
                style={{background:rol!=="admin"?"#f9fafb":C.surface,
                  border:`1px solid ${C.border}`,color:C.text,padding:"6px 10px",
                  borderRadius:5,fontSize:12,outline:"none"}}>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Reventa</span>
              <select value={form.reventa?"si":"no"}
                onChange={e=>setForm({...form,reventa:e.target.value==="si"})}
                style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
                  padding:"6px 10px",borderRadius:5,fontSize:12,outline:"none"}}>
                <option value="no">No (producción propia)</option>
                <option value="si">Sí (reventa)</option>
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Vacío 🔐</span>
              <select value={form.vacio?"si":"no"}
                disabled={rol!=="admin"}
                onChange={e=>rol==="admin"&&setForm({...form,vacio:e.target.value==="si"})}
                style={{background:rol!=="admin"?"#f9fafb":C.surface,
                  border:`1px solid ${C.border}`,color:C.text,padding:"6px 10px",
                  borderRadius:5,fontSize:12,outline:"none"}}>
                <option value="no">No</option>
                <option value="si">Sí (envasado al vacío)</option>
              </select>
            </label>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            {rol==="admin"&&<button onClick={guardar}
              style={{background:C.accent,border:"none",color:"#fff",padding:"8px 20px",
                borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:13}}>Guardar</button>}
            <button onClick={()=>{setForm(null);setEditIdx(null);}}
              style={{background:C.surface,border:`1px solid ${C.border}`,color:C.muted,
                padding:"8px 16px",borderRadius:6,cursor:"pointer",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      )}
 
      {/* ── TABLA DE ARTÍCULOS ── */}
      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>
        {arts.length} artículos
        {seleccionados.size>0&&<span style={{color:"#b91c1c",marginLeft:8}}>{seleccionados.size} seleccionados</span>}
      </div>
      <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`,
        maxHeight:500,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            {rol==="admin"&&<Th/>}
            <Th>SKU</Th><Th>Descripción</Th><Th>Pasta</Th><Th>Sector</Th><Th>Subfamilia</Th>
            <Th right>VU (d) 🔐</Th><Th right>TME 🔐</Th><Th right>Obj. % 🔐</Th><Th right>Obj. días</Th>
            <Th right>Kg/Batch 🔐</Th><Th right>Batch mín 🔐</Th>
            <Th right>Lead 🔐</Th><Th right>Peso u.</Th><Th right>Un/bat.</Th>
            <Th>Arrastre 🔐</Th><Th>Reventa</Th><Th>Vacío 🔐</Th><Th/>
          </tr></thead>
          <tbody>
            {arts.map((art,i)=>{
              const realIdx = maestro.indexOf(art);
              const pctObj  = (art.pctVUObj != null && art.pctVUObj > 0) ? art.pctVUObj : 0.20;
              const diasObj = (art.vidaUtil * pctObj).toFixed(1);
              const sc  = sectorColor[art.sector]||{bg:"#f8fafc",color:"#64748b"};
              const sel = seleccionados.has(realIdx);
              return (
                <tr key={art.sku+i}
                  style={{borderTop:`1px solid ${C.faint}`,
                    background:sel?"#eff6ff":"transparent"}}
                  onMouseEnter={e=>!sel&&(e.currentTarget.style.background="#f8fafc")}
                  onMouseLeave={e=>!sel&&(e.currentTarget.style.background="transparent")}>
                  {rol==="admin"&&(
                    <td style={{padding:"6px 8px",width:32}}>
                      <input type="checkbox" checked={sel}
                        onChange={()=>toggleSel(realIdx)}
                        style={{cursor:"pointer"}}/>
                    </td>
                  )}
                  <Tv mono dim>{art.sku}</Tv>
                  <Tv><span style={{color:C.text}}>{art.desc}</span></Tv>
                  <Tv><span style={{color:C.accent,fontFamily:"monospace",fontSize:10}}>{art.pasta||"—"}</span></Tv>
                  <Tv>
                    <span style={{background:sc.bg,color:sc.color,
                      padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:600}}>
                      {art.sector}
                    </span>
                  </Tv>
                  <Tv dim><span style={{fontSize:10}}>{art.subfamilia||"—"}</span></Tv>
                  <Tv right dim>{art.vidaUtil}</Tv>
                  {/* TME con alerta si diasObj > TME */}
                  <Tv right>
                    {art.tme ? (
                      <span style={{color: diasObj > art.tme ? "#b91c1c" : C.textDim, fontWeight: diasObj > art.tme ? 700 : 400}}>
                        {art.tme}d
                        {diasObj > art.tme && <span title="Stock objetivo supera el TME"> ⚠</span>}
                      </span>
                    ) : <span style={{color:C.muted}}>—</span>}
                  </Tv>
                  <Tv right>
                    {rol==="admin" ? (
                      <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                        <Inp value={Math.round(pctObj*100)} width={48}
                          onChange={v=>{
                            const copia=[...maestro];
                            copia[realIdx]={...copia[realIdx],pctVUObj:Math.max(1,Math.min(100,v))/100};
                            setMaestro(copia);
                          }}/>
                        <span style={{fontSize:10,color:C.muted}}>%</span>
                      </div>
                    ) : (
                      <span style={{color:art.pctVUObj?C.accent:C.muted,fontWeight:art.pctVUObj?600:400}}>
                        {Math.round(pctObj*100)}%
                        {art.pctVUObj&&<span style={{fontSize:9,color:C.accent}}> ✎</span>}
                      </span>
                    )}
                  </Tv>
                  <Tv right><span style={{color:C.ok.color,fontWeight:600}}>{diasObj}d</span></Tv>
                  <Tv right dim>{art.kgBatch.toLocaleString("es-UY")}</Tv>
                  <Tv right dim>{art.kgBatchMin.toLocaleString("es-UY")}</Tv>
                  <Tv right dim>{art.leadTime}</Tv>
                  <Tv right dim>{art.pesoUnitario||"—"}</Tv>
                  <Tv right dim>{art.unBatera||"—"}</Tv>
                  <Tv>
                    {art.permiteArrastre===false
                      ? <span style={{color:C.muted,fontSize:10}}>No</span>
                      : <span style={{color:C.ok.color,fontSize:10,fontWeight:600}}>Sí</span>}
                  </Tv>
                  <Tv>
                    {art.reventa
                      ? <span style={{background:"#eff6ff",color:"#1d4ed8",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:600}}>Reventa</span>
                      : <span style={{color:C.muted,fontSize:10}}>Propio</span>}
                  </Tv>
                  <Tv>
                    {art.vacio
                      ? <span style={{color:C.ok.color,fontSize:10,fontWeight:600}}>Sí</span>
                      : <span style={{color:C.muted,fontSize:10}}>No</span>}
                  </Tv>
                  <Tv>
                    {rol==="admin"&&(
                      <button onClick={()=>editar(realIdx)}
                        style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,
                          padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:11}}>
                        Editar
                      </button>
                    )}
                  </Tv>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
// ─── MÓDULO INSTRUCTIVO ───────────────────────────────────────────────────────
function PanelInstructivo() {
  const [seccion, setSeccion] = useState("flujo");
 
  const secciones = [
    { id:"flujo",    label:"Flujo del proceso" },
    { id:"calculos", label:"Reglas de cálculo" },
    { id:"politica", label:"Política de stock" },
    { id:"cargas",   label:"Carga de datos" },
    { id:"maestro",  label:"Maestro de artículos" },
  ];
 
  const H2 = ({children}) => (
    <div style={{fontSize:14,fontWeight:700,color:C.text,margin:"20px 0 8px",
      paddingBottom:6,borderBottom:`1px solid ${C.hairline}`}}>
      {children}
    </div>
  );
  const H3 = ({children}) => (
    <div style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"14px 0 4px"}}>{children}</div>
  );
  const P = ({children}) => (
    <div style={{fontSize:12,color:C.text,lineHeight:1.7,marginBottom:6}}>{children}</div>
  );
  const Formula = ({children}) => (
    <div style={{background:"#f8fafc",border:`1px solid ${C.hairline}`,borderRadius:6,
      padding:"8px 14px",fontFamily:"'JetBrains Mono','Fira Code',monospace",
      fontSize:11,color:"#1d4ed8",margin:"6px 0 10px",lineHeight:1.8}}>
      {children}
    </div>
  );
  const Tag = ({children,color="#1d4ed8",bg="#eff6ff"}) => (
    <span style={{background:bg,color,border:`1px solid ${color}30`,
      padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:600,
      display:"inline-block",margin:"0 2px"}}>{children}</span>
  );
  const Tabla = ({headers,rows}) => (
    <div style={{overflowX:"auto",borderRadius:7,border:`1px solid ${C.hairline}`,margin:"8px 0 16px"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{background:"#f8fafc",borderBottom:`1px solid ${C.hairline}`}}>
            {headers.map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",
              fontWeight:700,color:C.muted,letterSpacing:"0.04em"}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} style={{borderTop:`1px solid ${C.faint}`}}>
              {r.map((c,j)=><td key={j} style={{padding:"7px 12px",fontSize:11,color:C.text,
                verticalAlign:"top"}}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
 
  return (
    <div style={{display:"flex",gap:24,alignItems:"flex-start"}}>
      {/* Sidebar */}
      <div style={{minWidth:160,background:C.surface,border:`1px solid ${C.border}`,
        borderRadius:10,padding:"8px 0",position:"sticky",top:24}}>
        {secciones.map(s=>(
          <button key={s.id} onClick={()=>setSeccion(s.id)}
            style={{display:"block",width:"100%",textAlign:"left",
              background:seccion===s.id?C.accentDim:"none",border:"none",
              color:seccion===s.id?C.accent:C.textDim,
              padding:"9px 16px",cursor:"pointer",fontSize:12,
              fontWeight:seccion===s.id?700:400,
              borderLeft:seccion===s.id?`3px solid ${C.accent}`:"3px solid transparent"}}>
            {s.label}
          </button>
        ))}
      </div>
 
      {/* Contenido */}
      <div style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,
        borderRadius:10,padding:"24px 28px",maxWidth:760}}>
 
        {seccion==="flujo"&&<>
          <H2>Flujo del proceso de planificación</H2>
          <P>El proceso tiene una cadencia semanal con dos reuniones de alineación fijas y un cierre de pedidos el lunes.</P>
 
          <H3>Jueves 13hs — Reunión Planificación + Planta</H3>
          <Tabla
            headers={["Quién","Qué"]}
            rows={[
              ["Planta","Informa producción elaborada pero no cerrada en SAP, producción en proceso y plan hasta fin de semana"],
              ["Planificación","Carga esa información en la herramienta (producción pendiente S)"],
              ["Ambos","Revisan el borrador del plan S+1 con toda la información disponible y anticipan posibles ajustes"],
            ]}
          />
 
          <H3>Viernes 8am — Cálculo y envío del pedido</H3>
          <Tabla
            headers={["Fuente","Dato","Cómo llega"]}
            rows={[
              ["SAP","Stock actual del CD","Manual (futuro: automático)"],
              ["SAP","Venta facturada acumulada","Manual (futuro: automático)"],
              ["SAP","Pedidos pendientes sin facturar","Manual (futuro: automático)"],
              ["Comercial","Forecast S, S+1 y S+2 actualizado","CSV importado en la herramienta"],
              ["Planificación","Genera el Pedido a Planta con las cantidades óptimas S+1","Exportado como CSV desde pestaña Pedido a Planta"],
            ]}
          />
 
          <H3>Viernes 13hs — Reunión Planificación + Planta</H3>
          <Tabla
            headers={["Quién","Qué"]}
            rows={[
              ["Planificación","Presenta el pedido generado y el estado de stock proyectado S+1"],
              ["Planta","Confirma o ajusta el plan S+1 según capacidad, batches y lead times"],
              ["Planificación","Carga el plan confirmado en la herramienta (producción S+1)"],
              ["Ambos","Las solicitudes de traslado en SAP quedan abiertas hasta el lunes para ajustes de último momento"],
            ]}
          />
 
          <H3>Lunes — Cierre de pedidos</H3>
          <Tabla
            headers={["Hora","Quién","Qué"]}
            rows={[
              ["Durante el día","Planificación / Planta","Ajustes finales si hay variaciones de último momento"],
              ["Fin del día","Planificación","Cierre definitivo de las solicitudes de traslado en SAP"],
            ]}
          />
 
          <H3>Diario — Ajuste operativo</H3>
          <Tabla
            headers={["Momento","Quién","Qué"]}
            rows={[
              ["8:00hs","Planta","Corte para chorizos frescos (VU ≤ 12d). Se confirma o ajusta producción del día."],
              ["13:00hs","Planta","Corte para especiales y feteados (contra pedido)."],
              ["Durante el día","Planificación","Monitoreo de stock y venta. Actualiza producción acumulada."],
            ]}
          />
 
          <H3>Cadencias de actualización de datos</H3>
          <Tabla
            headers={["Variable","Fuente","Cuándo","Método"]}
            rows={[
              ["Stock actual","SAP","Viernes 8am + diario","Manual (futuro: automático)"],
              ["Venta facturada acum.","SAP","Viernes 8am + diario","Manual (futuro: automático)"],
              ["Pedidos pendientes","SAP","Viernes 8am","Manual (futuro: automático)"],
              ["Producción acumulada","SAP","Diario","Manual (futuro: automático)"],
              ["Producción pendiente S","Planta → Planificación","Jueves 13hs (reunión)","CSV importado o carga manual"],
              ["Forecast S, S+1, S+2","Comercial","Viernes 8am","CSV importado"],
              ["Plan producción S+1","Planta confirmado","Viernes 13hs (reunión)","CSV importado o edición manual"],
            ]}
          />
        </>}
 
        {seccion==="calculos"&&<>
          <H2>Reglas de cálculo</H2>
          <P>Todas las fórmulas operan sobre kg. Los cálculos se realizan semana a semana, de izquierda a derecha en la tabla de Plan & Estado.</P>
 
          <H3>Semana S — Venta</H3>
          <Formula>
            Fcst pendiente = Fcst S − Venta facturada acum. − Pedidos pendientes{"\n"}
            {"  "}→ Si es negativo: sobrevendieron vs. forecast{"\n"}
            {"  "}→ Si es positivo: falta cubrir con stock + producción{"\n\n"}
            Venta total S = Fact. acum. + Pedidos pend. + max(0, Fcst pendiente)
          </Formula>
 
          <H3>Semana S — Producción</H3>
          <Formula>
            Prod. total S = Prod. acumulada (SAP) + Prod. pendiente (plan planta){"\n\n"}
            Prod. pendiente sugerida = max(0, Venta total S + Stock objetivo − Stock actual − Prod. acum.)
          </Formula>
 
          <H3>Stock cierre S</H3>
          <Formula>
            Stock cierre S = Stock actual − Venta total S + Prod. total S{"\n"}
            {"  "}→ Puede ser negativo (déficit){"\n"}
            {"  "}→ Si Fcst pendiente es negativo (sobreventa), no se resta demanda adicional
          </Formula>
 
          <H3>Semana S+1 — Producción óptima</H3>
          <Formula>
            Stock objetivo S+1 = (Fcst S+1 / 7) × Días objetivo{"\n"}
            Días objetivo = Vida útil × 20%{"\n\n"}
            Prod. óptima S+1 = max(0, Fcst S+1 + Stock objetivo S+1 − max(0, Stock cierre S))
          </Formula>
          <P>La producción óptima es la <strong>referencia calculada</strong> por la herramienta. El planner puede ajustarla según restricciones de batch, capacidad y lead time.</P>
 
          <H3>Stock cierre S+1</H3>
          <Formula>
            Stock cierre S+1 = max(0, Stock cierre S) − Fcst S+1 + Prod. S+1 (ajustada por planner)
          </Formula>
 
          <H3>Días de stock</H3>
          <Formula>
            Días de stock = (kg en stock / Fcst semanal) × 7{"\n"}
            {"  "}→ Si Fcst = 0: se muestra como "Sin forecast" (no es faltante){"\n"}
            {"  "}→ Si stock > 0 y Fcst = 0: se muestra "∞"
          </Formula>
 
          <H3>Arrastre S → S+1 (opcional)</H3>
          <Formula>
            Arrastre = max(0, Fcst pendiente − max(0, Stock cierre S)){"\n"}
            Fcst S+1 efectivo = Fcst S+1 base + Arrastre{"\n\n"}
            Solo aplica a artículos con "Permite arrastre = Sí" en el Maestro.{"\n"}
            Por defecto: Sí para productos con VU {">"} 12 días, No para frescos.
          </Formula>
        </>}
 
        {seccion==="politica"&&<>
          <H2>Política de stock</H2>
          <P>Los estados de stock se calculan como porcentaje de la vida útil (VU) del producto. Los umbrales son configurables por Admin en la pestaña Maestro.</P>
 
          <Tabla
            headers={["Estado","Rango % VU","Descripción","Acción sugerida"]}
            rows={[
              [<Tag color="#92400e" bg="#fffbeb">Riesgo Vto.</Tag>,"{">"} 80% VU","Stock muy alto, riesgo de vencimiento antes de venderse","Frenar producción. Evaluar descuentos o acciones comerciales."],
              [<Tag color="#b45309" bg="#fffbeb">Sobrestock</Tag>,"30–80% VU","Stock por encima del objetivo, sin riesgo inmediato","Reducir o eliminar producción esta semana."],
              [<Tag color="#15803d" bg="#f0fdf4">OK</Tag>,"10–30% VU","Stock dentro de la zona objetivo (default: 20% VU)","Producción normal según plan."],
              [<Tag color="#c2410c" bg="#fff7ed">Substock</Tag>,"1–10% VU","Stock bajo el objetivo, riesgo de quiebre próximo","Priorizar producción. Revisar plan S+1."],
              [<Tag color="#b91c1c" bg="#fef2f2">Faltante</Tag>,"0–1% VU","Stock prácticamente agotado","Producción urgente. Alertar a Comercial."],
              [<Tag color="#94a3b8" bg="#f8fafc">Sin forecast</Tag>,"—","No hay forecast cargado para este producto","Verificar con Comercial si el producto sigue activo."],
            ]}
          />
 
          <H3>Stock objetivo por producto</H3>
          <Formula>
            Días objetivo = Vida útil × 20%{"\n\n"}
            Ejemplo — Chorizo Extra (VU 12d):  objetivo = 2.4 días de stock{"\n"}
            Ejemplo — Jamón ET. Dorada (VU 120d): objetivo = 24 días de stock{"\n"}
            Ejemplo — Panceta Bacon (VU 60d):   objetivo = 12 días de stock
          </Formula>
          <P>El 20% se origina en que ciertos clientes exigen que los productos se entreguen con al menos el 80% de la vida útil restante. Eso deja una ventana de comercialización del 20% de la VU desde la fecha de elaboración.</P>
        </>}
 
        {seccion==="cargas"&&<>
          <H2>Carga de datos</H2>
 
          <H3>Formato CSV general</H3>
          <P>Todos los archivos usan <strong>punto y coma (;)</strong> como separador. Los números usan coma decimal (formato UY/ES). La primera fila es el encabezado y se ignora automáticamente.</P>
 
          <H3>Forecast (pestaña Forecast)</H3>
          <Formula>
            SKU;S_actual;S+1;S+2{"\n"}
            13;13486;14200;13900{"\n"}
            9;3757;3900;3800{"\n"}
            ...
          </Formula>
          <P>Una fila por SKU. Las tres semanas en un mismo archivo. Al importar, se pisan todos los valores del forecast para los SKUs incluidos.</P>
 
          <H3>Producción (pestaña Producción)</H3>
          <Formula>
            SKU;Prod_pend_S;Prod_S+1{"\n"}
            13;8500;12000{"\n"}
            9;2800;3500{"\n"}
            ...
          </Formula>
          <P><Tag>Prod pend S</Tag> es lo que planta planifica producir en los días restantes de la semana actual. <Tag>Prod S+1</Tag> es el plan de producción para la semana siguiente, confirmado con planta.</P>
 
          <H3>Producción acumulada</H3>
          <P>Por ahora se carga manualmente celda a celda en la tabla de la pestaña Producción. En una etapa futura se conectará directamente con SAP.</P>
 
          <H3>Datos de SAP (stock, ventas, pedidos)</H3>
          <P>Por ahora se cargan manualmente en la tabla de Plan & Estado. En una etapa futura se automatizará la descarga desde SAP a una carpeta y la importación se realizará con un botón.</P>
        </>}
 
        {seccion==="maestro"&&<>
          <H2>Maestro de artículos</H2>
          <P>El maestro centraliza los parámetros de cada SKU. Hay dos niveles de acceso:</P>
          <Tabla
            headers={["Rol","Puede hacer"]}
            rows={[
              ["🔐 Admin","Ver y editar todos los campos, agregar y eliminar artículos, modificar la política de stock"],
              ["📋 Planificación","Ver todos los datos. No puede modificar parámetros marcados con 🔐"],
            ]}
          />
 
          <H3>Campos del artículo</H3>
          <Tabla
            headers={["Campo","Descripción","Impacto en cálculos","Admin"]}
            rows={[
              ["SKU","Código del artículo en SAP","Clave de cruce con todos los datos importados","No"],
              ["Descripción","Nombre del producto","Visual","No"],
              ["Pasta","Código del semielaborado o pieza base","Agrupación en Nivel 2 (Semielaborados)","Sí 🔐"],
              ["Familia","Agrupación comercial","Filtros y reportes","No"],
              ["Sector","Sector productivo","Desglose en Forecast y Producción","No"],
              ["Vida útil (días)","VU total desde elaboración","Define stock objetivo y umbrales de alerta","Sí 🔐"],
              ["Kg/Batch","Tamaño del batch de producción","Referencia para la propuesta de producción","Sí 🔐"],
              ["Kg/Batch mínimo","Batch mínimo operable","Cantidad mínima para iniciar producción","Sí 🔐"],
              ["Lead time (días)","Días entre pedido y disponibilidad","Planificación de semielaborados (Fase 2)","Sí 🔐"],
              ["Permite arrastre","Si la demanda no atendida se suma al fcst S+1","Activa el arrastre cuando el toggle está encendido","Sí 🔐"],
            ]}
          />
 
          <H3>Agregar y eliminar artículos</H3>
          <P>En modo Admin, el botón <strong>+ Artículo</strong> abre el formulario de alta. Para eliminar, seleccioná uno o varios artículos con el checkbox y usá el botón <strong>− Artículo(s)</strong>. Se pide confirmación antes de eliminar.</P>
 
          <H3>Política de stock</H3>
          <P>Los umbrales de la política se editan directamente en la tabla de la sección "Política de stock" dentro del Maestro (solo en modo Admin). El campo "Hasta" de cada franja es editable; el "Desde" se actualiza automáticamente como el "Hasta" de la franja anterior.</P>
        </>}
      </div>
    </div>
  );
}
 
// ─── MÓDULO CARGA DE DATOS ───────────────────────────────────────────────────
function PanelCarga({ maestro,
  setStockActual, setVentaAcum, setPedidosPend, setProdAcum, setProdPend,
  setFcstActual, setFcstS2, setFcstS3,
  logs, registrarLog }) {
 
  const skuSet = new Set(maestro.map(a=>a.sku));
  const [verDetalle, setVerDetalle] = useState(null);
 
  function semaforo(log) {
    if (!log) return { color:"#94a3b8", bg:"#f8fafc", label:"Sin datos", icono:"⚪" };
    const horas = (new Date() - new Date(log.fecha)) / 3600000;
    if (horas < 12)  return { color:"#15803d", bg:"#f0fdf4", label:"Hoy", icono:"🟢" };
    if (horas < 48)  return { color:"#d97706", bg:"#fffbeb", label:"Hace 1-2 días", icono:"🟡" };
    return { color:"#b91c1c", bg:"#fef2f2", label:"Hace 3+ días", icono:"🔴" };
  }
 
  function fmtFecha(log) {
    if (!log) return "—";
    const d = new Date(log.fecha);
    return d.toLocaleDateString("es-UY") + " " + d.toLocaleTimeString("es-UY",{hour:"2-digit",minute:"2-digit"});
  }
 
  function mkCargar(setter, campo) {
    return function(rows) {
      let ok=0, noMatch=0; const skusNoMatch=[];
      const data={};
      rows.forEach(r=>{
        if (r.length<2) return;
        const sku=r[0]?.trim();
        if (!sku||sku.toLowerCase()==="sku"||sku.toLowerCase()==="número de artículo") return;
        const kg=parseKg(r[1]);
        data[sku]=kg;
        if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
      });
      setter(p=>({...p,...data}));
      const res={ok,noMatch,err:0,skusNoMatch};
      registrarLog(campo,res);
      return res;
    };
  }
 
  function cargarFcst(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const s1={},s2={},s3={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku=r[0]?.trim();
      if (!sku||sku.toLowerCase()==="sku") return;
      s1[sku]=parseKg(r[1]); s2[sku]=parseKg(r[2]||"0"); s3[sku]=parseKg(r[3]||"0");
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setFcstActual(p=>({...p,...s1}));
    setFcstS2(p=>({...p,...s2}));
    setFcstS3(p=>({...p,...s3}));
    const res={ok,noMatch,err:0,skusNoMatch};
    registrarLog("forecast",res);
    return res;
  }
 
  function cargarProd(rows) {
    let ok=0, noMatch=0; const skusNoMatch=[];
    const pend={},acum={};
    rows.forEach(r=>{
      if (r.length<2) return;
      const sku=r[0]?.trim();
      if (!sku||sku.toLowerCase()==="sku") return;
      acum[sku]=parseKg(r[1]); pend[sku]=parseKg(r[2]||"0");
      if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
    });
    setProdAcum(p=>({...p,...acum}));
    setProdPend(p=>({...p,...pend}));
    const res={ok,noMatch,err:0,skusNoMatch};
    registrarLog("produccion",res);
    return res;
  }
 
  const FUENTES = [
    { id:"stock",       label:"Stock",             icono:"📦", color:"#0f766e",
      desc:"SKU · kg en stock (suma CD01+CD05)",
      plantilla:"SKU;Stock_kg\n"+maestro.map(a=>`${a.sku};0`).join("\n"),
      onCargar: mkCargar(setStockActual,"stock") },
    { id:"ventaAcum",   label:"Venta acumulada",   icono:"💰", color:"#0891b2",
      desc:"SKU · kg facturados acumulados a la fecha",
      plantilla:"SKU;Venta_acum_kg\n"+maestro.map(a=>`${a.sku};0`).join("\n"),
      onCargar: mkCargar(setVentaAcum,"ventaAcum") },
    { id:"pedidosPend", label:"Pedidos pendientes", icono:"📋", color:"#0369a1",
      desc:"SKU · kg en pedidos confirmados sin facturar",
      plantilla:"SKU;Pedidos_pend_kg\n"+maestro.map(a=>`${a.sku};0`).join("\n"),
      onCargar: mkCargar(setPedidosPend,"pedidosPend") },
    { id:"produccion",  label:"Producción",         icono:"🏭", color:"#7c3aed",
      desc:"SKU · Prod acum · Prod pendiente S",
      plantilla:"SKU;Prod_pend_S;Prod_S+1\n"+maestro.map(a=>`${a.sku};0;0`).join("\n"),
      onCargar: cargarProd },
    { id:"forecast",    label:"Forecast",           icono:"📊", color:"#2563eb",
      desc:"SKU · Fcst S · Fcst S+1 · Fcst S+2",
      plantilla:"SKU;S_actual;S+1;S+2\n"+maestro.map(a=>`${a.sku};0;0;0`).join("\n"),
      onCargar: cargarFcst },
  ];
 
  return (
    <div>
      {/* ── ESTADO DE CARGAS ── */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
        padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Estado de cargas</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {FUENTES.map(f=>{
            const log = logs[f.id];
            const sem = semaforo(log);
            const tieneErrores = log && log.noMatch > 0;
            return (
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",background:sem.bg,borderRadius:7,
                border:`1px solid ${sem.color}30`}}>
                <span style={{fontSize:18}}>{f.icono}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text}}>{f.label}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:1}}>
                    {log ? `${log.ok} SKUs cargados · ${fmtFecha(log)}` : "Sin carga registrada"}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {tieneErrores&&(
                    <button onClick={()=>setVerDetalle(verDetalle===f.id?null:f.id)}
                      style={{background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",
                        padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontWeight:600}}>
                      ⚠ {log.noMatch} no encontrados {verDetalle===f.id?"▲":"▼"}
                    </button>
                  )}
                  {log&&!tieneErrores&&(
                    <span style={{fontSize:10,color:sem.color,fontWeight:600}}>✓ Sin errores</span>
                  )}
                  <span style={{fontSize:11,color:sem.color,fontWeight:700}}>{sem.icono} {sem.label}</span>
                </div>
              </div>
            );
          })}
        </div>
 
        {/* Panel detalle errores */}
        {verDetalle&&logs[verDetalle]&&logs[verDetalle].skusNoMatch.length>0&&(
          <div style={{marginTop:12,padding:"12px 16px",background:"#fffbeb",
            border:"1px solid #fde68a",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#92400e"}}>
                SKUs no encontrados — {FUENTES.find(f=>f.id===verDetalle)?.label}
              </div>
              <button onClick={()=>setVerDetalle(null)}
                style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>×</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
              {logs[verDetalle].skusNoMatch.map(sku=>(
                <span key={sku} style={{background:"#fef3c7",color:"#92400e",
                  border:"1px solid #fde68a",padding:"2px 8px",borderRadius:4,
                  fontSize:10,fontFamily:"monospace"}}>
                  {sku}
                </span>
              ))}
            </div>
            <div style={{fontSize:10,color:"#b45309",lineHeight:1.5}}>
              Estos SKUs tienen datos en el archivo pero no están en el Maestro → sus valores no se cargaron.
              Agregálos en la pestaña <strong>Maestro → ↑ Importar CSV</strong> y volvé a cargar este archivo.
            </div>
          </div>
        )}
      </div>
 
      {/* ── BLOQUES DE CARGA ── */}
      <div style={{display:"grid",gap:0}}>
        {FUENTES.map(f=>(
          <CargaCSV key={f.id} titulo={f.label} descripcion={f.desc}
            color={f.color} onCargar={f.onCargar}
            ultimaCarga={logs[f.id]?fmtFecha(logs[f.id]):null}
            plantillaNombre={`${f.id}.csv`} plantillaContenido={f.plantilla}/>
        ))}
      </div>
    </div>
  );
}
 
export default function App() {
  const [tab, setTab]         = useState("plan");
  const [maestro, setMaestro] = useState(MAESTRO_UNICO);
  const [politica, setPolitica] = useState(POLITICA_INI);
  const [fcstActual, setFcstActual] = useState(FCST_ACTUAL_INI);
  const [fcstS2, setFcstS2]         = useState(FCST_S2_INI);
  const [fcstS3, setFcstS3]         = useState(FCST_S3_INI);
  const [stockActual, setStockActual]   = useState(STOCK_INI);
  const [ventaAcum, setVentaAcum]       = useState(VENTA_ACUM_INI);
  const [pedidosPend, setPedidosPend]   = useState(PEDIDOS_PEND_INI);
  const [prodAcum, setProdAcum]         = useState(PROD_ACUM_INI);
  const [prodPend, setProdPend]         = useState(PROD_PEND_INI);
  const [prodS2, setProdS2]             = useState(PROD_S2_INI);
 
  // ── LOGS DE CARGA ──
  const LOG_INI = { stock:null, ventaAcum:null, pedidosPend:null, produccion:null, forecast:null };
  const [logs, setLogs] = useState(LOG_INI);
 
  function registrarLog(fuente, {ok, noMatch, err, skusNoMatch=[]}) {
    setLogs(prev=>({...prev, [fuente]:{
      fecha: new Date(),
      ok, noMatch, err,
      skusNoMatch,
    }}));
  }
 
  // ── GUARDAR / CARGAR SESIÓN ──
  const sesionInputRef = useRef();
 
  function exportarSesion() {
    const sesion = {
      version: 1,
      fecha: new Date().toISOString(),
      maestro, politica,
      fcstActual, fcstS2, fcstS3,
      stockActual, ventaAcum, pedidosPend,
      prodAcum, prodPend, prodS2,
    };
    descargarCSV("sesion_planificacion.json", JSON.stringify(sesion, null, 2));
  }
 
  function importarSesion(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const s = JSON.parse(e.target.result);
        if (s.maestro)     setMaestro(s.maestro);
        if (s.politica)    setPolitica(s.politica);
        if (s.fcstActual)  setFcstActual(s.fcstActual);
        if (s.fcstS2)      setFcstS2(s.fcstS2);
        if (s.fcstS3)      setFcstS3(s.fcstS3);
        if (s.stockActual) setStockActual(s.stockActual);
        if (s.ventaAcum)   setVentaAcum(s.ventaAcum);
        if (s.pedidosPend) setPedidosPend(s.pedidosPend);
        if (s.prodAcum)    setProdAcum(s.prodAcum);
        if (s.prodPend)    setProdPend(s.prodPend);
        if (s.prodS2)      setProdS2(s.prodS2);
        alert(`✓ Sesión cargada (${new Date(s.fecha).toLocaleString("es-UY")})`);
      } catch(ex) {
        alert("Error al cargar la sesión: " + ex.message);
      }
    };
    reader.readAsText(file, "UTF-8");
    sesionInputRef.current.value = "";
  }
 
  const ctx0 = { fcstS:fcstActual, fcstS2, fcstS3, stockActual, ventaAcum, pedidosPend,
                 prodAcum, prodPend, prodS2, conArrastre:false };
  const rows = maestro.map(art=>({ art, ...calcRow(art, ctx0) }));
 
  const alertasTotal = rows.filter(r=>["faltante","substockAlerta"].includes(r.estadoActual)).length;
 
  const tabs = [
    { id:"plan",  label:"Plan & Estado" },
    { id:"carga", label:"📥 Carga de datos" },
    { id:"sap",   label:"Pedido a Planta" },
    { id:"mto",   label:"Maestro" },
    { id:"info",  label:"Instructivo" },
  ];
 
  return (
    <div style={{fontFamily:"'DM Sans','IBM Plex Sans',system-ui,sans-serif",
      background:C.bg,minHeight:"100vh",color:C.text}}>
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"12px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.text,letterSpacing:"-0.02em"}}>
            Planificación de Producción
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>
            {maestro.length} artículos · Semana S26/2026
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {alertasTotal>0&&(
            <span style={{background:C.faltante.bg,color:C.faltante.color,padding:"4px 10px",borderRadius:4,fontSize:12,fontWeight:700}}>
              ⚠ {alertasTotal} alertas
            </span>
          )}
          <button onClick={exportarSesion}
            style={{background:C.ok.bg,border:`1px solid ${C.ok.border}`,color:C.ok.color,
              padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>
            💾 Guardar sesión
          </button>
          <button onClick={()=>sesionInputRef.current.click()}
            style={{background:C.accentDim,border:`1px solid ${C.accent}`,color:C.accent,
              padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>
            📂 Cargar sesión
          </button>
          <input ref={sesionInputRef} type="file" accept=".json" style={{display:"none"}}
            onChange={e=>importarSesion(e.target.files[0])}/>
          <span style={{background:C.sobAlerta.bg,color:C.sobAlerta.color,padding:"4px 10px",borderRadius:4,fontSize:11,fontWeight:600}}>
            Packs · Semielaborados → Fase 2
          </span>
        </div>
      </div>
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",background:C.surface}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:"none",border:"none",color:tab===t.id?C.accent:C.muted,
              padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:400,
              borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{padding:"24px"}}>
        {tab==="plan"&&<PanelPlan maestro={maestro}
          fcstActual={fcstActual} setFcstActual={setFcstActual}
          fcstS2={fcstS2} setFcstS2={setFcstS2} fcstS3={fcstS3}
          stockActual={stockActual} setStockActual={setStockActual}
          ventaAcum={ventaAcum} setVentaAcum={setVentaAcum}
          pedidosPend={pedidosPend} setPedidosPend={setPedidosPend}
          prodAcum={prodAcum} setProdAcum={setProdAcum}
          prodPend={prodPend} setProdPend={setProdPend}
          prodS2={prodS2} setProdS2={setProdS2}/>}
        {tab==="carga"&&<PanelCarga maestro={maestro}
          setStockActual={setStockActual}
          setVentaAcum={setVentaAcum} setPedidosPend={setPedidosPend}
          setProdAcum={setProdAcum} setProdPend={setProdPend}
          setFcstActual={setFcstActual} setFcstS2={setFcstS2} setFcstS3={setFcstS3}
          logs={logs} registrarLog={registrarLog}/>}
        {tab==="sap"&&<PanelSAP maestro={maestro} rows={rows} politica={politica}/>}
        {tab==="mto"&&<PanelMaestro maestro={maestro} setMaestro={setMaestro}
          politica={politica} setPolitica={setPolitica}/>}
        {tab==="info"&&<PanelInstructivo/>}
      </div>
    </div>
  );
}
 
import { useState, useMemo, useRef, useEffect } from "react";

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#f4f5f7", surface:"#ffffff", border:"#e4e7ec", borderHover:"#c8cdd8",
  accent:"#4f46e5", accentDim:"#eef2ff",
  // estados de stock — solo para badges y colores de alerta
  ok:          { color:"#15803d", bg:"#f0fdf4", border:"#bbf7d0", label:"OK",         icon:"●" },
  sobRiesgo:   { color:"#6d28d9", bg:"#f5f3ff", border:"#ddd6fe", label:"Riesgo Vto", icon:"●" },
  sobAlerta:   { color:"#1d4ed8", bg:"#eff6ff", border:"#bfdbfe", label:"Sobrestock", icon:"●" },
  subAlerta:   { color:"#ca8a04", bg:"#fefce8", border:"#fde047", label:"Substock",   icon:"●" },
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
const SECTOR_COLOR = {
  "CHORIZOS Y EMB.": { bg:"#fff7ed", color:"#c2410c" },
  CHORIZOS:          { bg:"#fff7ed", color:"#c2410c" },
  FRANKFURTERS:      { bg:"#eff6ff", color:"#1d4ed8" },
  FRANKFURT:         { bg:"#eff6ff", color:"#1d4ed8" },
  "PASTAS FINAS":    { bg:"#f5f3ff", color:"#6d28d9" },
  PASTAS:            { bg:"#f5f3ff", color:"#6d28d9" },
  JAMONERÍA:         { bg:"#f0fdf4", color:"#15803d" },
  "JAMÓN":           { bg:"#f0fdf4", color:"#15803d" },
  SECOS:             { bg:"#fefce8", color:"#854d0e" },
  QUESOS:            { bg:"#f0f9ff", color:"#0369a1" },
  HAMBURGUESAS:      { bg:"#fdf4ff", color:"#7e22ce" },
  VEGANOS:           { bg:"#f0fdf4", color:"#166534" },
  ADEREZOS:          { bg:"#fff1f2", color:"#be123c" },
  "JAMÓN CRUDO":     { bg:"#fef9c3", color:"#854d0e" },
};

const POLITICA_DEFAULT = {
  sobrestockRiesgo: { min:0.80, ...C.sobRiesgo },
  sobrestockAlerta: { min:0.30, ...C.sobAlerta },
  ok:               { min:0.10, ...C.ok },
  substockAlerta:   { min:0.01, ...C.subAlerta },
  faltante:         { min:0,    ...C.faltante },
  sinForecast:      { min:null, color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", label:"Sin forecast" },
};

function getEstado(diasStock, vidaUtil, fcst, diasMin, diasObj, diasMax) {
  if (!fcst || fcst === 0) return "sinForecast";
  if (diasStock <= 0) return "faltante";
  // Si tenemos parámetros configurados, usarlos
  if (diasMin != null && diasObj != null) {
    if (diasMax != null && diasStock > diasMax) return "sobrestockRiesgo";
    if (diasStock > diasObj) return "sobrestockAlerta";
    if (diasStock >= diasMin) return "ok";
    if (diasStock > 0) return "substockAlerta";
    return "faltante";
  }
  // Fallback: % de VU (para artículos sin parámetros configurados)
  const pct = vidaUtil > 0 ? diasStock / vidaUtil : 0;
  if (pct >= 0.80) return "sobrestockRiesgo";
  if (pct >= 0.30) return "sobrestockAlerta";
  if (pct >= 0.10) return "ok";
  if (pct >= 0.01) return "substockAlerta";
  return "faltante";
}



// ─── MAESTRO INICIAL ─────────────────────────────────────────────────────────
const MAESTRO_INI = [
  { sku:"Q700", desc:"JAMÓN COCIDO AL NATURAL EN FETAS (200G.)", pasta:"PJA1400", familia:"JAMÓN COCIDO", subfamilia:"AL NATURAL", sector:"JAMONERÍA", vidaUtil:30, tme:10, leadTime:4, kgBatch:589.6, kgBatchMin:294.8, pesoUnitario:0.2, unBatera:60, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q710", desc:"LOMITO CANADIENSE AL NATURAL EN FETAS (200G.)", pasta:"PJA1500", familia:"LOMITOS", subfamilia:"AL NATURAL", sector:"JAMONERÍA", vidaUtil:30, tme:10, leadTime:4, kgBatch:598.8, kgBatchMin:299.4, pesoUnitario:0.2, unBatera:60, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q720", desc:"PECHUGA DE POLLO AL NATURAL EN FETAS (200G.)", pasta:"PJA1600", familia:"POLLO", subfamilia:"AL NATURAL", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:4, kgBatch:589.0, kgBatchMin:294.5, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"210", desc:"FIAMBRE DE CERDO ARIZONA", pasta:"PJA895", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:5.8, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"211", desc:"MITADES FIAMBRE DE CERDO ARIZONA", pasta:"PJA896", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:50, tme:23, leadTime:3, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:2.8, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"212", desc:"(cuadrado) FIAMBRE DE CERDO ARIZONA", pasta:"PJA897", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:6.05, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q325", desc:"FIAMBRE DE CERDO ARIZONA CUBETEADO 1X1 (1 KG)", pasta:"PJA898", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:30, tme:13, leadTime:2, kgBatch:1250.0, kgBatchMin:625.0, pesoUnitario:1.0, unBatera:10, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q329", desc:"FIAMBRE DE CERDO ARIZONA BARRA FETAS (1 Kg.)", pasta:"PJA899", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:30, tme:13, leadTime:2, kgBatch:1250.0, kgBatchMin:625.0, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q330", desc:"FIAMBRE DE CERDO ARIZONA CUADRADO FETAS (1 KG.)", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ARIZONA", sector:"JAMONERÍA", vidaUtil:30, tme:13, leadTime:2, kgBatch:1250.0, kgBatchMin:625.0, pesoUnitario:1.0, unBatera:10, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"71", desc:"FIAMBRE DE CERDO ET. ROJA", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ET ROJA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:5.75, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"72", desc:"MITADES FIAMBRE DE CERDO ET. ROJA", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ET ROJA", sector:"JAMONERÍA", vidaUtil:50, tme:23, leadTime:3, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:2.8, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"74", desc:"(cuadrado) FIAMBRE DE CERDO ET. ROJA", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ET ROJA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:2.88, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q339", desc:"FIAMBRE DE CERDO ET. ROJA BARRA EN FETAS (1 KG.)", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ET ROJA", sector:"JAMONERÍA", vidaUtil:30, tme:13, leadTime:2, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:1.0, unBatera:1, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q3391", desc:"FIAMBRE DE CERDO ET. ROJA EN FETAS (200g.)", pasta:"PJA900", familia:"FIAMBRE DE CERDO", subfamilia:"FIAMB. CERDO ET ROJA", sector:"JAMONERÍA", vidaUtil:30, tme:0, leadTime:2, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:0.2, unBatera:60, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"217", desc:"JAMON COCIDO ARIZONA", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:5.9, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"218", desc:"JAMON COCIDO ARIZONA MITADES", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ARIZONA", sector:"JAMONERÍA", vidaUtil:50, tme:23, leadTime:4, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:3.0, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"219", desc:"(cuadrado) JAMON COCIDO ARIZONA", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:6.15, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"2190", desc:"JAMON COCIDO ARIZONA 16x16", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:6.6, unBatera:3, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q290", desc:"JAMON COCIDO ARIZONA BARRA FETAS (1 KG.)", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ARIZONA", sector:"JAMONERÍA", vidaUtil:30, tme:13, leadTime:2, kgBatch:1280.0, kgBatchMin:640.0, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"1151", desc:"JAMÓN COCIDO CONFITERO", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN CONFITERO", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:6.05, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"600", desc:"(cuadrado) JAMON COCIDO ET. DORADA", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:6.05, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"6000", desc:"JAMON COCIDO ET. DORADA 16x16", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:6.6, unBatera:3, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"601", desc:"MITADES JAMON COCIDO ET. DORADA", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:50, tme:23, leadTime:4, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:3.05, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"610", desc:"JAMON COCIDO ET. DORADA CENTENARIO BARRA", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:6.0, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"613", desc:"JAMON COCIDO ET. DORADA MOLDE D (P/FETEADO)", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:120, tme:0, leadTime:4, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:8.0, unBatera:1, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q2781", desc:"JAMON COCIDO ET. DORADA CUBETEADO 1X1 (1 kg.)", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:30, tme:0, leadTime:2, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:1.0, unBatera:10, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q279", desc:"JAMON COCIDO ET. DORADA BARRA FETAS (1 KG.)", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:30, tme:12, leadTime:2, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q2791", desc:"JAMON COCIDO ET. DORADA CUADRADO FETAS (1 KG.)", pasta:"PJA600", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:30, tme:0, leadTime:2, kgBatch:614.0, kgBatchMin:307.0, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q610", desc:"JAMON COCIDO ET. DORADA EN FETAS (200G.)", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN DORADO", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:2, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6668", desc:"(P/Feteado) JAMON COCIDO EXTRA ET. AZUL", pasta:"PJA100", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN ET AZUL", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1481.0, kgBatchMin:740.5, pesoUnitario:8.5, unBatera:4, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"667", desc:"MITADES JAMON COCIDO EXTRA ET. AZUL", pasta:"PJA001", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN ET AZUL", sector:"JAMONERÍA", vidaUtil:50, tme:22, leadTime:4, kgBatch:1412.0, kgBatchMin:706.0, pesoUnitario:3.05, unBatera:8, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"668", desc:"JAMON COCIDO EXTRA ET. AZUL", pasta:"PJA001", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN ET AZUL", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1412.0, kgBatchMin:706.0, pesoUnitario:6.7, unBatera:4, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q212", desc:"JAMON COCIDO EXTRA ET. AZUL EN FETAS (200G.)", pasta:"PJA100", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN ET AZUL", sector:"JAMONERÍA", vidaUtil:25, tme:0, leadTime:2, kgBatch:1481.0, kgBatchMin:740.5, pesoUnitario:0.2, unBatera:80, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"62", desc:"JAMON COCIDO ET. NEGRA MITADES", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:50, tme:23, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:2.8, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"68", desc:"JAMON COCIDO ET. NEGRA", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:5.6, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"680", desc:"(cuadrado) JAMON COCIDO ET. NEGRA", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:5.9, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"688", desc:"JAMON COCIDO ET. NEGRA CENTENARIO REDONDO", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:6.0, unBatera:4, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q253", desc:"JAMON COCIDO ET. NEGRA EN FETAS (200G.)", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:2, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:0.2, unBatera:100, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"550", desc:"Jamon Et. Negra Confitero", pasta:"PJA550", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:0, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:6.0, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"551", desc:"Jamon Et. Negra Confitero MITADES", pasta:"PJA550", familia:"JAMÓN COCIDO", subfamilia:"JAMÓN ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:0, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:3.0, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"115", desc:"(cuadrado) FIAMBRE DE CERDO PLUS CENTENARIO", pasta:"PJA800", familia:"FIAMBRE DE CERDO", subfamilia:"JAMÓN LÍNEA PLUS", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:538.0, kgBatchMin:269.0, pesoUnitario:5.8, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"116", desc:"FIAMBRE DE CERDO PLUS CENTENARIO", pasta:"PJA800", familia:"FIAMBRE DE CERDO", subfamilia:"JAMÓN LÍNEA PLUS", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:3, kgBatch:538.0, kgBatchMin:269.0, pesoUnitario:5.5, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"3161", desc:"JAMON COCIDO EXTRA TRADICIONAL MITAD", pasta:"PJA1300", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN TRADICIONAL", sector:"JAMONERÍA", vidaUtil:50, tme:19, leadTime:4, kgBatch:590.81, kgBatchMin:295.4, pesoUnitario:3.3, unBatera:8, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q200", desc:"JAMON COCIDO EXTRA TRADICIONAL EN FETAS (200g.)", pasta:"PJA1300", familia:"JAMÓN EXTRA", subfamilia:"JAMÓN TRADICIONAL", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:2, kgBatch:590.81, kgBatchMin:295.4, pesoUnitario:0.2, unBatera:1, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"2110", desc:"LOMITO CANADIENSE T. Inglesa", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CAN T. ING", sector:"JAMONERÍA", vidaUtil:50, tme:17, leadTime:4, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:1.5, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q2293", desc:"LOMITO CANADIENSE T. INGLESA FETAS (200G.)", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CAN T. ING", sector:"JAMONERÍA", vidaUtil:25, tme:12, leadTime:2, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"110", desc:"LOMITO CANADIENSE MITADES", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CANADIENSE", sector:"JAMONERÍA", vidaUtil:50, tme:17, leadTime:4, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:1.5, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"111", desc:"LOMITO CANADIENSE ENTERO", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CANADIENSE", sector:"JAMONERÍA", vidaUtil:50, tme:17, leadTime:4, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:2.0, unBatera:20, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q293", desc:"LOMITO CANADIENSE EN FETAS (200 G.)", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CANADIENSE", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:2, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:0.2, unBatera:80, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q295", desc:"LOMITO CANADIENSE EN FETAS (1 KG.)", pasta:"PJA700", familia:"LOMITOS", subfamilia:"LOMITO CANADIENSE", sector:"JAMONERÍA", vidaUtil:30, tme:12, leadTime:2, kgBatch:1342.0, kgBatchMin:671.0, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"108", desc:"LOMITO COCIDO MITADES", pasta:"PJA730", familia:"LOMITOS", subfamilia:"LOMITO COCIDO", sector:"JAMONERÍA", vidaUtil:50, tme:19, leadTime:4, kgBatch:1274.0, kgBatchMin:637.0, pesoUnitario:1.0, unBatera:18, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"109", desc:"LOMITO COCIDO", pasta:"PJA730", familia:"LOMITOS", subfamilia:"LOMITO COCIDO", sector:"JAMONERÍA", vidaUtil:50, tme:19, leadTime:4, kgBatch:1274.0, kgBatchMin:637.0, pesoUnitario:2.0, unBatera:8, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"70", desc:"PALETA COCIDA ET. NEGRA", pasta:"PJA500", familia:"JAMÓN COCIDO", subfamilia:"PALETA ET NEGRA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1318.0, kgBatchMin:659.0, pesoUnitario:5.8, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"701", desc:"PANCETA AMERICANA", pasta:"PIN003", familia:"PANCETA AMERICANA", subfamilia:"PANCETA AMERICANA", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:4, kgBatch:3768.09, kgBatchMin:1884.05, pesoUnitario:2.4, unBatera:10, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"76", desc:"PANCETA AHUMADA BACON MITAD VACIO", pasta:"PJA400", familia:"PANCETA BACON", subfamilia:"PANCETA BACON", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:5, kgBatch:1080.0, kgBatchMin:540.0, pesoUnitario:1.95, unBatera:15, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"760", desc:"PANCETA AHUMADA BACON  EN TROZOS/VACIO", pasta:"PJA400", familia:"PANCETA BACON", subfamilia:"PANCETA BACON", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:5, kgBatch:1080.0, kgBatchMin:540.0, pesoUnitario:0.25, unBatera:70, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q247", desc:"PANCETA AHUMADA BACON FETAS (1 KG.)", pasta:"PJA400", familia:"PANCETA BACON", subfamilia:"PANCETA BACON", sector:"JAMONERÍA", vidaUtil:40, tme:15, leadTime:2, kgBatch:300.0, kgBatchMin:300.0, pesoUnitario:1.0, unBatera:15, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"77", desc:"PANCETA AHUMADA ESPECIAL", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PANCETA ESPECIAL", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:5, kgBatch:780.0, kgBatchMin:390.0, pesoUnitario:2.15, unBatera:10, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"771", desc:"PANCETA AHUMADA ESPECIAL ENTERA", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PANCETA ESPECIAL", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:5, kgBatch:780.0, kgBatchMin:390.0, pesoUnitario:3.3, unBatera:6, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q233", desc:"PANCETA AHUMADA ESPECIAL EN FETAS (200G.)", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PANCETA ESPECIAL", sector:"JAMONERÍA", vidaUtil:25, tme:0, leadTime:2, kgBatch:780.0, kgBatchMin:390.0, pesoUnitario:0.2, unBatera:80, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q238", desc:"PANCETA AHUMADA ESPECIAL FETAS (1 KG.)", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PANCETA ESPECIAL", sector:"JAMONERÍA", vidaUtil:40, tme:15, leadTime:2, kgBatch:1200.0, kgBatchMin:600.0, pesoUnitario:1.0, unBatera:15, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q239", desc:"PANCETA AHUMADA ESPECIAL CUBETEADO AL VACIO (1kg)", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PANCETA ESPECIAL", sector:"JAMONERÍA", vidaUtil:25, tme:15, leadTime:4, kgBatch:1200.0, kgBatchMin:600.0, pesoUnitario:1.0, unBatera:15, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"65", desc:"PASTRAMI CENTENARIO", pasta:"", familia:"JAMÓN COCIDO", subfamilia:"PASTRAMI", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:4, kgBatch:400.0, kgBatchMin:200.0, pesoUnitario:2.45, unBatera:10, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"665", desc:"PASTRAMI CENTENARIO MITADES", pasta:"", familia:"JAMÓN COCIDO", subfamilia:"PASTRAMI", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:4, kgBatch:400.0, kgBatchMin:200.0, pesoUnitario:1.25, unBatera:20, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q225", desc:"PASTRAMI CENTENARIO FETAS (1 KG.)", pasta:"", familia:"JAMÓN COCIDO", subfamilia:"PASTRAMI", sector:"JAMONERÍA", vidaUtil:60, tme:0, leadTime:2, kgBatch:400.0, kgBatchMin:200.0, pesoUnitario:1.0, unBatera:15, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"757", desc:"PECHUGA DE POLLO AHUMADA", pasta:"PJA1700", familia:"POLLO", subfamilia:"PECHUGA DE POLLO", sector:"JAMONERÍA", vidaUtil:50, tme:12, leadTime:4, kgBatch:590.0, kgBatchMin:295.0, pesoUnitario:3.2, unBatera:0, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"758", desc:"PECHUGA DE POLLO AHUMADA MITADES", pasta:"PJA1700", familia:"POLLO", subfamilia:"PECHUGA DE POLLO", sector:"JAMONERÍA", vidaUtil:50, tme:17, leadTime:4, kgBatch:590.0, kgBatchMin:295.0, pesoUnitario:1.6, unBatera:0, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q757", desc:"PECHUGA DE POLLO AHUMADA EN FETAS (200G.)", pasta:"PJA1700", familia:"POLLO", subfamilia:"PECHUGA DE POLLO", sector:"JAMONERÍA", vidaUtil:25, tme:10, leadTime:2, kgBatch:590.0, kgBatchMin:295.0, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q215", desc:"PUNTAS JAMÓN COCIDO CENTENARIO", pasta:"PJA900", familia:"JAMÓN COCIDO", subfamilia:"PUNTAS", sector:"JAMONERÍA", vidaUtil:25, tme:9, leadTime:4, kgBatch:500, kgBatchMin:500, pesoUnitario:0.75, unBatera:48, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q236", desc:"PUNTAS PANCETA CENTENARIO", pasta:"PJA300", familia:"PANCETA ESPECIAL", subfamilia:"PUNTAS", sector:"JAMONERÍA", vidaUtil:25, tme:12, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:0.75, unBatera:48, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q298", desc:"PUNTAS LOMITO AHUMADO CENTENARIO", pasta:"PJA730", familia:"LOMITOS", subfamilia:"PUNTAS", sector:"JAMONERÍA", vidaUtil:25, tme:9, leadTime:4, kgBatch:500, kgBatchMin:500, pesoUnitario:0.75, unBatera:48, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q3384", desc:"PUNTAS FIAMBRE DE CERDO CENTENARIO", pasta:"", familia:"FIAMBRE DE CERDO", subfamilia:"PUNTAS", sector:"JAMONERÍA", vidaUtil:25, tme:9, leadTime:2, kgBatch:599.0, kgBatchMin:299.5, pesoUnitario:0.75, unBatera:48, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"41", desc:"QUESO DE CERDO MITADES", pasta:"PJA1200", familia:"SANDWICHERA", subfamilia:"QUESO DE CERDO", sector:"JAMONERÍA", vidaUtil:60, tme:23, leadTime:4, kgBatch:302.0, kgBatchMin:302.0, pesoUnitario:2.05, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"250", desc:"F. DE CERDO SANDWICHERA", pasta:"PJA1000", familia:"SANDWICHERA", subfamilia:"SANDWICH ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:5.75, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"252", desc:"F. DE CERDO/VAC SANDW. CLASICA ARIZ (cuadrado)", pasta:"PJA1100", familia:"SANDWICHERA", subfamilia:"SANDWICH ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:6.0, unBatera:15, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"254", desc:"(cuadrado) F. DE CERDO SANDWICHERA", pasta:"PJA1000", familia:"SANDWICHERA", subfamilia:"SANDWICH ARIZONA", sector:"JAMONERÍA", vidaUtil:120, tme:68, leadTime:4, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:6.0, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"255", desc:"(cuadrado) MITADES F. DE CERDO SANDWICHERA", pasta:"PJA1000", familia:"SANDWICHERA", subfamilia:"SANDWICH ARIZONA", sector:"JAMONERÍA", vidaUtil:50, tme:25, leadTime:4, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:3.0, unBatera:12, objDias:10, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q368", desc:"FIAMBRE DE CERDO SANDWICHERA ARIZONA BARRA FETAS (1 KG.)", pasta:"PJA1000", familia:"SANDWICHERA", subfamilia:"SANDWICH ARIZONA", sector:"JAMONERÍA", vidaUtil:30, tme:12, leadTime:2, kgBatch:1415.0, kgBatchMin:707.5, pesoUnitario:1.0, unBatera:15, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"200", desc:"CHORIZO ARIZONA PREMIUM", pasta:"PCH200", familia:"CHORIZO ARIZONA", subfamilia:"CHORIZO ARIZONA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:1376.07, kgBatchMin:688.03, pesoUnitario:2.8, unBatera:9, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"222", desc:"CHORIZO ARIZONA PREMIUM VACIO x 10 un.", pasta:"PCH200", familia:"CHORIZO ARIZONA", subfamilia:"CHORIZO ARIZONA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:1376.07, kgBatchMin:688.03, pesoUnitario:1.3, unBatera:18, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4052", desc:"CHORIZO ARIZONA X 3", pasta:"PCH200", familia:"CHORIZO ARIZONA", subfamilia:"CHORIZO ARIZONA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:1376.07, kgBatchMin:688.03, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"215", desc:"CHORIZO ARIZONA X7", pasta:"PCH200", familia:"CHORIZO ARIZONA", subfamilia:"CHORIZO ARIZONA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:0, leadTime:4, kgBatch:1376.07, kgBatchMin:688.03, pesoUnitario:0.93, unBatera:0, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4056", desc:"CHORIZO CHEDDAR BACON X 3", pasta:"PCH1000", familia:"SABORES", subfamilia:"CHORIZO CHEDDAR BACON", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:630.45, kgBatchMin:315.23, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"11", desc:"CHORIZO EXTRA RUEDA", pasta:"pch100", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1437.0, kgBatchMin:718.5, pesoUnitario:0.5, unBatera:20, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Contra pedido" },
  { sku:"13", desc:"CHORIZO EXTRA", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:3.5, unBatera:4, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Frescos" },
  { sku:"14", desc:"CHORIZO EXTRA PRECOCIDO x 10 MINIPACK", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:1.3, unBatera:20, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"15", desc:"CHORIZO EXTRA EXTRA LARGO", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:4.85, unBatera:4, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Frescos" },
  { sku:"1512", desc:"CHORIZO EXTRA CENTENARIO X 2 XL", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:21, leadTime:4, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:0.39, unBatera:40, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"2", desc:"CHORIZO EXTRA SPETO", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:1.55, unBatera:12, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Frescos" },
  { sku:"21", desc:"CHORIZO EXTRA ESPETO AL VACIO X 6", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:0.36, unBatera:40, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4050", desc:"CHORIZO EXTRA CENTENARIO X 3", pasta:"PCH001", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:21, leadTime:4, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:0.35, unBatera:45, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"1500", desc:"CHORIZO SIN SAL X2", pasta:"PCH1500", familia:"EXTRA", subfamilia:"CHORIZO EXTRA", sector:"CHORIZOS Y EMB.", vidaUtil:45, tme:0, leadTime:4, kgBatch:300.0, kgBatchMin:300.0, pesoUnitario:0.23, unBatera:60, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4038", desc:"PACK LA OLLA - Ch. Extra Ahumado + Panceta Bacon", pasta:"pch100", familia:"SABORES", subfamilia:"CHORIZO EXTRA AHUMAD", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:397.55, kgBatchMin:397.55, pesoUnitario:0.45, unBatera:42, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4053", desc:"CHORIZO EXTRA AHUMADO CENTENARIO X 3", pasta:"PCH600", familia:"SABORES", subfamilia:"CHORIZO EXTRA AHUMAD", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:397.55, kgBatchMin:397.55, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4051", desc:"CHORIZO PURO CERDO CENTENARIO X 3", pasta:"PCH100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:1390.39, kgBatchMin:695.2, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"9", desc:"CHORIZO PARRILLERO PURO CERDO", pasta:"PCH100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1390.39, kgBatchMin:695.2, pesoUnitario:3.5, unBatera:4, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Frescos" },
  { sku:"90", desc:"CHORIZO PARRILLERO PURO CERDO VACIO", pasta:"PCH100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:1390.39, kgBatchMin:695.2, pesoUnitario:1.3, unBatera:20, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"900", desc:"CHORIZO PURO CERDO RUEDA", pasta:"pch100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1410.0, kgBatchMin:705.0, pesoUnitario:0.5, unBatera:20, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Contra pedido" },
  { sku:"901", desc:"CHORIZO PURO CERDO RUEDA BUFFET", pasta:"pch100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1410.0, kgBatchMin:705.0, pesoUnitario:4.0, unBatera:2, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Contra pedido" },
  { sku:"902", desc:"CHORIZO PURO CERDO XL", pasta:"pch100", familia:"CHORIZO P. CERDO", subfamilia:"CHORIZO P. CERDO", sector:"CHORIZOS Y EMB.", vidaUtil:12, tme:2, leadTime:3, kgBatch:1410.0, kgBatchMin:705.0, pesoUnitario:4.8, unBatera:4, objDias:2, ter:1, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Contra pedido" },
  { sku:"4057", desc:"CHORIZOS CENTENARIO MIX. DEGUSTACIÓN", pasta:"", familia:"SABORES", subfamilia:"CHORIZO PACK DEGUSTACION", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:500, kgBatchMin:500, pesoUnitario:0.62, unBatera:36, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4060", desc:"CHORIS DEL MUNDO CENTENARIO", pasta:"", familia:"SABORES", subfamilia:"CHORIZO PACK DEGUSTACION", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:500, kgBatchMin:500, pesoUnitario:0.62, unBatera:36, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"40601", desc:"CHORIZO ESPAÑOL AL VACIO X 3", pasta:"", familia:"SABORES", subfamilia:"CHORIZO PACK DEGUSTACION", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:26, leadTime:4, kgBatch:592.13, kgBatchMin:296.06, pesoUnitario:0.37, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"12", desc:"CHORIZO COLORADO VACÍO x 10 un.", pasta:"", familia:"SABORES", subfamilia:"CHORIZOS COLORADO", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:3, kgBatch:209.91, kgBatchMin:209.91, pesoUnitario:1.3, unBatera:20, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4055", desc:"CHORIZO COLORADO (ESPAÑOL) X 3", pasta:"", familia:"SABORES", subfamilia:"CHORIZOS COLORADO", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:209.91, kgBatchMin:209.91, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4054", desc:"CHORIZO GOURMET CENTENARIO X 3", pasta:"", familia:"SABORES", subfamilia:"CHORIZOS GOURMET", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:453.1, kgBatchMin:226.55, pesoUnitario:0.35, unBatera:50, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4059", desc:"CHORIZO DEL CAMPO A LA MESA X 3", pasta:"", familia:"CHORIZOS TA-TA", subfamilia:"CHORIZOS TA-TA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:23, leadTime:4, kgBatch:1436.97, kgBatchMin:718.49, pesoUnitario:0.35, unBatera:45, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"40591", desc:"CHORIZO DEL CAMPO A LA MESA X 10", pasta:"", familia:"CHORIZOS TA-TA", subfamilia:"CHORIZOS TA-TA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:0, leadTime:4, kgBatch:1446.0, kgBatchMin:723.0, pesoUnitario:1.3, unBatera:18, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4006", desc:"HUNGARAS MINIPACK", pasta:"PCH500", familia:"HÚNGARAS", subfamilia:"HÚNGARAS", sector:"CHORIZOS Y EMB.", vidaUtil:45, tme:23, leadTime:5, kgBatch:209.91, kgBatchMin:209.91, pesoUnitario:0.35, unBatera:67, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"49", desc:"MORCILLAS DULCES (sueltas)", pasta:"PCH300", familia:"MORCILLAS", subfamilia:"MORCILLA DULCE", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:15, leadTime:4, kgBatch:164.33, kgBatchMin:164.33, pesoUnitario:1.85, unBatera:7, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5010", desc:"MORCILLAS DULCES x 2 (x unid)", pasta:"PCH300", familia:"MORCILLAS", subfamilia:"MORCILLA DULCE", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:13, leadTime:3, kgBatch:164.33, kgBatchMin:164.33, pesoUnitario:0.25, unBatera:80, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"45", desc:"MORCILLAS SALADAS (sueltas)", pasta:"PCH400", familia:"MORCILLAS", subfamilia:"MORCILLA SALADA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:15, leadTime:4, kgBatch:203.6, kgBatchMin:203.6, pesoUnitario:1.85, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5009", desc:"MORCILLAS SALADAS x 2 (x unid)", pasta:"PCH400", familia:"MORCILLAS", subfamilia:"MORCILLA SALADA", sector:"CHORIZOS Y EMB.", vidaUtil:60, tme:13, leadTime:3, kgBatch:203.6, kgBatchMin:203.6, pesoUnitario:0.25, unBatera:80, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4004", desc:"SALCHICHA CHEDDAR BACON", pasta:"PCH1000", familia:"SALCHICHAS", subfamilia:"SALCHICHA PARRILLERA", sector:"CHORIZOS Y EMB.", vidaUtil:30, tme:9, leadTime:5, kgBatch:630.45, kgBatchMin:315.23, pesoUnitario:0.3, unBatera:50, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"4005", desc:"SALCHICHA PARRILLERA MINI PACK", pasta:"PCH800", familia:"SALCHICHAS", subfamilia:"SALCHICHA PARRILLERA", sector:"CHORIZOS Y EMB.", vidaUtil:30, tme:9, leadTime:5, kgBatch:201.07, kgBatchMin:201.07, pesoUnitario:0.3, unBatera:90, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"97", desc:"FRANFRUTER EXTRA CENTENARIO x 8 un.", pasta:"ppf600", familia:"FRANKFURTERS", subfamilia:"FRANFRUTER EXTRA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:2, kgBatch:283.0, kgBatchMin:283.0, pesoUnitario:0.6, unBatera:60, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"970", desc:"FRANFRUTER EXTRA CENTENARIO x 24 un.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANFRUTER EXTRA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:3, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:1.2, unBatera:18, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"971", desc:"FRANFRUTER EXTRA CENTENARIO x 4 un.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANFRUTER EXTRA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:3, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:0.2, unBatera:108, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"972", desc:"FRANFRUTER EXTRA CENTENARIO 8un. + 4un.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANFRUTER EXTRA", sector:"FRANKFURTERS", vidaUtil:45, tme:15, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:0.7, unBatera:30, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"206", desc:"FRANKFURTERS ARIZONA x 2.5 Kg.", pasta:"PPF800", familia:"FRANKFURTERS", subfamilia:"FRANKFURTER ARIZONA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:3, kgBatch:295.03, kgBatchMin:295.03, pesoUnitario:2.4, unBatera:11, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"213", desc:"FRANKFURTERS ARIZONA S/LARGO x 1.5 Kg.", pasta:"PPF800", familia:"FRANKFURTERS", subfamilia:"FRANKFURTER ARIZONA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:1, kgBatch:295.03, kgBatchMin:295.03, pesoUnitario:1.5, unBatera:20, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"214", desc:"FRANKFURTERS ARIZONA x 8 un.", pasta:"PPF800", familia:"FRANKFURTERS", subfamilia:"FRANKFURTER ARIZONA", sector:"FRANKFURTERS", vidaUtil:45, tme:15, leadTime:2, kgBatch:295.03, kgBatchMin:295.03, pesoUnitario:0.48, unBatera:55, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"216", desc:"FRANKFURTERS ARIZONA x 1.2 Kg.", pasta:"PPF800", familia:"FRANKFURTERS", subfamilia:"FRANKFURTER ARIZONA", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:2, kgBatch:295.03, kgBatchMin:295.03, pesoUnitario:1.15, unBatera:25, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5068", desc:"FRANKFURTERS CENTE x 1Kg.+ FRANFRUTER EXTRA x 4 un.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANKFURTERS CENTE", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:1.2, unBatera:0, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"95", desc:"FRANKFURTERS CENTENARIO x 1 Kg.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANKFURTERS CENTE", sector:"FRANKFURTERS", vidaUtil:45, tme:18, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:1.1, unBatera:26, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"958", desc:"FRANKFURTERS CENTENARIO x 8 UN", pasta:"ppf600", familia:"FRANKFURTERS", subfamilia:"FRANKFURTERS CENTE", sector:"FRANKFURTERS", vidaUtil:45, tme:0, leadTime:1, kgBatch:283.0, kgBatchMin:283.0, pesoUnitario:0.48, unBatera:52, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"96", desc:"FRANKFURTERS CENTENARIO x 2,5 Kg.", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANKFURTERS CENTE", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:2, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:2.5, unBatera:11, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"98", desc:"FRANKFURTERS CENTENARIO S/LARGO x20 un", pasta:"PPF600", familia:"FRANKFURTERS", subfamilia:"FRANKFURTERS CENTE", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:3, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:1.5, unBatera:20, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5041", desc:"LIVIANITOS CENTENARIO x 8", pasta:"ppf600", familia:"FRANKFURTERS", subfamilia:"LIVIANITOS CENTENARI", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:0.3, unBatera:80, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5044", desc:"LIVIANITOS CENTENARIO x 4", pasta:"ppf600", familia:"FRANKFURTERS", subfamilia:"LIVIANITOS CENTENARI", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:0.15, unBatera:105, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5061", desc:"LIVIANITOS CENTENARIO PACK (8 und. + 1 x 4 und.)", pasta:"ppf600", familia:"FRANKFURTERS", subfamilia:"LIVIANITOS CENTENARI", sector:"FRANKFURTERS", vidaUtil:45, tme:17, leadTime:1, kgBatch:283.77, kgBatchMin:283.77, pesoUnitario:0.45, unBatera:35, objDias:9, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q901", desc:"Puntas Mortadela Centenario", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"PUNTAS", sector:"PASTAS FINAS", vidaUtil:25, tme:12, leadTime:3, kgBatch:500, kgBatchMin:500, pesoUnitario:0.75, unBatera:48, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"38", desc:"CHORIZO RUSO", pasta:"PPF500", familia:"RUSO Y PATÉ", subfamilia:"CHORIZO RUSO", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:465.8, kgBatchMin:232.9, pesoUnitario:1.5, unBatera:15, objDias:12, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"87", desc:"LEONESA CON JAMON MITADES", pasta:"PPF030", familia:"LEONESAS", subfamilia:"LEONESA CON JAMÓN", sector:"PASTAS FINAS", vidaUtil:75, tme:33, leadTime:5, kgBatch:578.9, kgBatchMin:289.45, pesoUnitario:2.45, unBatera:12, objDias:15, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"84", desc:"LEONESA FANTASIA MITADES", pasta:"PPF060", familia:"LEONESAS", subfamilia:"LEONESA FANTASÍA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:5, kgBatch:359.0, kgBatchMin:359.0, pesoUnitario:2.65, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"53", desc:"LEONESA PREMIUM MITADES", pasta:"PPF001", familia:"LEONESAS", subfamilia:"LEONESA PREMIUM", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:5, kgBatch:289.9, kgBatchMin:289.9, pesoUnitario:2.4, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q053", desc:"LEONESA PREMIUM EN FETAS (200g.)", pasta:"PPF001", familia:"LEONESAS", subfamilia:"LEONESA PREMIUM", sector:"PASTAS FINAS", vidaUtil:30, tme:0, leadTime:3, kgBatch:289.9, kgBatchMin:289.9, pesoUnitario:0.2, unBatera:60, objDias:6, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"224", desc:"MORTADELA T. Inglesa", pasta:"PPF100", familia:"MORTADELAS", subfamilia:"MORT T. INGLESA", sector:"PASTAS FINAS", vidaUtil:60, tme:36, leadTime:3, kgBatch:292.0, kgBatchMin:292.0, pesoUnitario:9.4, unBatera:2, objDias:12, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q2903", desc:"MORTADELA T. INGLESA FETAS (200G.)", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORT T. INGLESA", sector:"PASTAS FINAS", vidaUtil:25, tme:29, leadTime:1, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"201", desc:"MORTADELA ARIZONA FINA", pasta:"PPF401", familia:"MORTADELAS", subfamilia:"MORTADELA ARIZONA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:5.15, unBatera:5, objDias:12, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"2012", desc:"MORTADELA ARIZONA BOCHA MITADES", pasta:"PPF401", familia:"MORTADELAS", subfamilia:"MORTADELA ARIZONA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:9.8, unBatera:4, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"202", desc:"MORTADELA ARIZONA GRUESA", pasta:"PPF401", familia:"MORTADELAS", subfamilia:"MORTADELA ARIZONA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:6.1, unBatera:4, objDias:12, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"203", desc:"MORTADELA ARIZONA FINA MITADES", pasta:"PPF401", familia:"MORTADELAS", subfamilia:"MORTADELA ARIZONA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:2.45, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"204", desc:"MORTADELA ARIZONA GRUESA MITADES", pasta:"PPF401", familia:"MORTADELAS", subfamilia:"MORTADELA ARIZONA", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:3.0, unBatera:8, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"23", desc:"MORTADELA CENTENARIO BOLOGNESA MITADES", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORTADELA CENTE", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:292.0, kgBatchMin:292.0, pesoUnitario:2.3, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"242", desc:"MORTADELA CENTENARIO BOCHA MITADES", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORTADELA CENTE", sector:"PASTAS FINAS", vidaUtil:60, tme:33, leadTime:3, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:4.45, unBatera:4, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"28", desc:"MORTADELA CENTENARIO C/ MORRON MITADES", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORTADELA CENTE", sector:"PASTAS FINAS", vidaUtil:60, tme:28, leadTime:3, kgBatch:292.0, kgBatchMin:292.0, pesoUnitario:2.4, unBatera:12, objDias:12, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q903", desc:"MORTADELA BOLOGNESA FETAS (200g.)", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORTADELA CENTE", sector:"PASTAS FINAS", vidaUtil:25, tme:14, leadTime:1, kgBatch:339.23, kgBatchMin:339.23, pesoUnitario:0.2, unBatera:60, objDias:5, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"25", desc:"MORTADELA CENTENARIO PLUS MITADES", pasta:"PPF101", familia:"MORTADELAS", subfamilia:"MORTADELA LÍNEA PLUS", sector:"PASTAS FINAS", vidaUtil:75, tme:33, leadTime:3, kgBatch:294.0, kgBatchMin:294.0, pesoUnitario:2.2, unBatera:12, objDias:15, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"5014", desc:"PATE DE JAMON + PATE DE LENGUA", pasta:"PACK", familia:"", subfamilia:"RUSO Y PATÉ", sector:"PATÉ VARIEDADES", vidaUtil:60, tme:45, leadTime:4, kgBatch:500, kgBatchMin:200.0, pesoUnitario:3.0, unBatera:0, objDias:12, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q806", desc:"PUNTAS SALAME CENTENARIO", pasta:"PSE400", familia:"MILANES", subfamilia:"PUNTAS", sector:"SECOS", vidaUtil:40, tme:23, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:0.75, unBatera:48, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q818", desc:"PUNTAS BONDIOLA CENTENARIO", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"PUNTAS", sector:"SECOS", vidaUtil:40, tme:68, leadTime:5, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.75, unBatera:48, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"282", desc:"F. SECA BONDIOLA  T. Inglesa", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BON T. INGLESA", sector:"SECOS", vidaUtil:90, tme:68, leadTime:40, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.1, unBatera:18, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q2814", desc:"F. SECA BONDIOLA T. INGLESA FETAS (200G.)", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BON T. INGLESA", sector:"SECOS", vidaUtil:40, tme:68, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"82", desc:"F. SECA BONDIOLA CENTENARIO", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BONDIOLA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:40, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.1, unBatera:16, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"86", desc:"F. SECA BONDIOLA CENTENARIO VACIO S/PIEL", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BONDIOLA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:40, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.5, unBatera:15, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q814", desc:"F. SECA BONDIOLA CENTENARIO EN FETAS (200G.)", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BONDIOLA CENTENARIO", sector:"SECOS", vidaUtil:40, tme:68, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q817", desc:"F. SECA BONDIOLA CENTENARIO EN FETAS (1 KG.)", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BONDIOLA CENTENARIO", sector:"SECOS", vidaUtil:120, tme:68, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.0, unBatera:15, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q819", desc:"F. SECA BONDIOLA CENTENARIO CUBETEADO (1KG.)", pasta:"PSE001", familia:"BONDIOLA Y SERRANO", subfamilia:"BONDIOLA CENTENARIO", sector:"SECOS", vidaUtil:120, tme:60, leadTime:3, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.5, unBatera:20, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6669", desc:"F. SECA FINCETA LONGANIZA ARIZONA", pasta:"PSE500", familia:"FINCETAS", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.2, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"6670", desc:"F. SECA FINCETA LONGANIZA ARIZONA MITADES", pasta:"PSE500", familia:"FINCETAS", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:120, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.5, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6671", desc:"F. SECA FINCETA P. FINO ARIZONA", pasta:"PSE400", familia:"FINCETAS", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.0, unBatera:9, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"6672", desc:"F. SECA FINCETA P. GRUESO ARIZONA", pasta:"PSE400", familia:"FINCETAS", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.2, unBatera:8, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"6673", desc:"F. SECA BAG. SALAMIN ARIZONA", pasta:"PSE400", familia:"SALAMINES", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.8, unBatera:15, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"6674", desc:"F. SECA FINCETA P. FINO ARIZONA MITADES", pasta:"PSE400", familia:"FINCETAS", subfamilia:"F. SECA ARIZONA CORT", sector:"SECOS", vidaUtil:120, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.5, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6065", desc:"F. SECA MILAN ARIZONA MITADES", pasta:"PSE400", familia:"MILANES", subfamilia:"F. SECA ARIZONA MILA", sector:"SECOS", vidaUtil:120, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.95, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6066", desc:"F. SECA MILAN ARIZONA", pasta:"PSE400", familia:"MILANES", subfamilia:"F. SECA ARIZONA MILA", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.8, unBatera:5, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q843", desc:"F. SECA MILAN ARIZONA FETAS (1 KG.)", pasta:"PSE400", familia:"MILANES", subfamilia:"F. SECA ARIZONA MILA", sector:"SECOS", vidaUtil:120, tme:0, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.0, unBatera:15, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"59", desc:"F. SECA MILAN CENTENARIO MITADES", pasta:"PSE200", familia:"MILANES", subfamilia:"F. SECA CEN MILAN", sector:"SECOS", vidaUtil:120, tme:68, leadTime:25, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.1, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"60", desc:"F. SECA MILAN CENTENARIO", pasta:"PSE200", familia:"MILANES", subfamilia:"F. SECA CEN MILAN", sector:"SECOS", vidaUtil:90, tme:68, leadTime:25, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.55, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q802", desc:"F. SECA MILAN CENTENARIO FETAS (200G.)", pasta:"PSE200", familia:"MILANES", subfamilia:"F. SECA CEN MILAN", sector:"SECOS", vidaUtil:40, tme:23, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:80, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"300", desc:"F. SECA FINCETA P. FINO CENTENARIO", pasta:"PSE400", familia:"FINCETAS", subfamilia:"F. SECA CENTE CORTE", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.0, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"301", desc:"F. SECA FINCETA P. GRUESO CENTENARIO", pasta:"PSE400", familia:"FINCETAS", subfamilia:"F. SECA CENTE CORTE", sector:"SECOS", vidaUtil:120, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.5, unBatera:6, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"302", desc:"F. SECA FINCETA LONGANIZA CENTENARIO", pasta:"PSE500", familia:"FINCETAS", subfamilia:"F. SECA CENTE CORTE", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.2, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"5064", desc:"SURTIDO FACTURA SECA CHICA 12+1", pasta:"", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:120, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:2.16, unBatera:0, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"64", desc:"F. SECA BAG. HÚNGARO CENTENARIO VACIO", pasta:"PSE300", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:60, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"661", desc:"F. SECA BAG. SALAMIN CENTENARIO VACIO", pasta:"PSE450", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:90, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6611", desc:"SALAMIN CENTENARIO AHUMADO AL VACIO", pasta:"PSE450", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:60, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6612", desc:"F. SECA BAG. BASTÓN CENTENARIO AL VACIO SIN PIEL", pasta:"PSE300", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.45, unBatera:35, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6613", desc:"F. SECA BAG. BASTÓN HÚNGARO CENTENARIO AL VACIO SIN PIEL", pasta:"PSE300", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.45, unBatera:10, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6644", desc:"F. SECA CHACARERO CENTENARIO VACIO", pasta:"PSE450", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"666", desc:"F. SECA BAG. PIPA CENTENARIO VACIO", pasta:"PSE400", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:90, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"670", desc:"F. SECA BAG. LONGANIZA CENTENARIO VACIO", pasta:"PSE500", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:60, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6701", desc:"LONGANIZA CENTENARIO AHUMADA AL VACIO", pasta:"PSE520", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:12, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.18, unBatera:60, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q872", desc:"F. SECA BAG. SALAMIN CENTENARIO FETAS (1 kg.)", pasta:"PSE450", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:40, tme:23, leadTime:3, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.0, unBatera:10, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q884", desc:"MIX FETEADOS HÚNGARO-SALAMÍN-LONGANIZA (200 g.)", pasta:"PSE450", familia:"SALAMINES", subfamilia:"F. SECA CENTENARIO", sector:"SECOS", vidaUtil:120, tme:23, leadTime:3, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"56", desc:"F. SECA MILAN CENTE PLUS MITADES", pasta:"PSE400", familia:"MILANES", subfamilia:"F. SECA LÍNEA PLUS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:1.8, unBatera:12, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"57", desc:"F. SECA MILAN CENTE PLUS", pasta:"PSE400", familia:"MILANES", subfamilia:"F. SECA LÍNEA PLUS", sector:"SECOS", vidaUtil:90, tme:68, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.7, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"260", desc:"F. SECA MILAN T. Inglesa", pasta:"PSE200", familia:"MILANES", subfamilia:"F. SECA T. ING MILAN", sector:"SECOS", vidaUtil:90, tme:68, leadTime:25, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.9, unBatera:6, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"Q2802", desc:"F. SECA MILAN T. INGLESA FETAS (200G.)", pasta:"PSE200", familia:"MILANES", subfamilia:"F. SECA T. ING MILAN", sector:"SECOS", vidaUtil:40, tme:29, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6166", desc:"F. SECA MILAN VALLE DEL SOL", pasta:"", familia:"MILANES", subfamilia:"F. SECA VALLE DEL SOL", sector:"SECOS", vidaUtil:90, tme:59, leadTime:20, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:3.7, unBatera:1, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"91", desc:"F. SECA LOMITO SERRANO VACIO", pasta:"PSE100", familia:"BONDIOLA Y SERRANO", subfamilia:"LOMITO SERRANO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:50, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.75, unBatera:30, objDias:18, ter:7, segDias:0, permiteArrastre:false, reventa:false, vacio:false, tipoPlan:"Stock" },
  { sku:"92", desc:"F. SECA LOMITO SERRANO MITADES VACIO", pasta:"PSE100", familia:"BONDIOLA Y SERRANO", subfamilia:"LOMITO SERRANO", sector:"SECOS", vidaUtil:90, tme:68, leadTime:50, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.75, unBatera:30, objDias:18, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"Q834", desc:"F. SECA LOMITO SERRANO EN FETAS (200G.)", pasta:"PSE100", familia:"BONDIOLA Y SERRANO", subfamilia:"LOMITO SERRANO", sector:"SECOS", vidaUtil:40, tme:68, leadTime:1, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.2, unBatera:60, objDias:8, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"61611", desc:"PICADITOS LONGANIZA S/PIEL CENTENARIO 100 GR.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.1, unBatera:50, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"61711", desc:"PICADITOS HÚNGARO S/PIEL CENTENARIO 100 GR.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.1, unBatera:50, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"61511", desc:"PICADITOS SALAME S/PIEL CENTENARIO 100 GR.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.1, unBatera:50, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6615", desc:"F. SECA PICADITOS SALAME S/PIEL CENTENARIO 250 gr.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.25, unBatera:27, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6616", desc:"F. SECA PICADITOS LONGANIZA S/PIEL CENTENARIO 250 gr.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.25, unBatera:27, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"6617", desc:"F. SECA PICADITOS HÚNGARO S/PIEL CENTENARIO 250 gr.", pasta:"", familia:"SALAMINES", subfamilia:"PICADITOS", sector:"SECOS", vidaUtil:120, tme:68, leadTime:10, kgBatch:93.0, kgBatchMin:93.0, pesoUnitario:0.25, unBatera:27, objDias:24, ter:7, segDias:0, permiteArrastre:true, reventa:false, vacio:true, tipoPlan:"Stock" },
  { sku:"LACT0002", desc:"QUESO DAMBO BARRA 4 KG.", pasta:"", familia:"LACTEOS", subfamilia:"DAMBO", sector:"QUESOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:6, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"LACT0007", desc:"QUESO DAMBO BARRA 4 KG ELAB.", pasta:"", familia:"LACTEOS", subfamilia:"DAMBO", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:24, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"LACTM002", desc:"QUESO DAMBO MUESTRA 1KG", pasta:"", familia:"LACTEOS", subfamilia:"DAMBO", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:0.96, unBatera:24, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"QLACT002", desc:"QUESO DAMBO FETAS (1KG)", pasta:"", familia:"LACTEOS", subfamilia:"DAMBO", sector:"QUESOS", vidaUtil:20, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:1.0, unBatera:24, objDias:4, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"QLACT007", desc:"QUESO DAMBO FETAS (1KG)", pasta:"", familia:"LACTEOS", subfamilia:"DAMBO", sector:"QUESOS", vidaUtil:20, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:1.0, unBatera:24, objDias:4, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"LACT0006", desc:"QUESO MUZZARELLA BARRA 4 KG ELAB.", pasta:"", familia:"LACTEOS", subfamilia:"MUZZARELLA", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:24, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"LACT0001", desc:"QUESO MUZZARELLA BARRA 4 KG.", pasta:"", familia:"LACTEOS", subfamilia:"MUZZARELLA", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:6, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"LACT0008", desc:"QUESO MUZZARELLA VALLE DEL SOL 4KG.", pasta:"", familia:"LACTEOS", subfamilia:"MUZZARELLA", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:24, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"LACTM001", desc:"QUESO MUZZARELLA MUESTRA 1KG", pasta:"", familia:"LACTEOS", subfamilia:"MUZZARELLA", sector:"QUESOS", vidaUtil:360, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:0.96, unBatera:24, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"QLACT001", desc:"QUESO MUZZARELLA FETAS (1KG)", pasta:"", familia:"LACTEOS", subfamilia:"MUZZARELLA", sector:"QUESOS", vidaUtil:20, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:1.0, unBatera:24, objDias:4, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"LACT0003", desc:"QUESO PROVOLONE EN BARRA 4 KG.", pasta:"", familia:"LACTEOS", subfamilia:"PROVOLONE", sector:"QUESOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:6, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"883", desc:"QUESO PARRILLERO PROVOLONE", pasta:"", familia:"LACTEOS", subfamilia:"PROVOLONE", sector:"QUESOS", vidaUtil:180, tme:95, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.3, unBatera:108, objDias:36, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"LACT0005", desc:"QUESO SANDWICH BARRA 4 KG.", pasta:"", familia:"LACTEOS", subfamilia:"SANDWICH", sector:"QUESOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:3.85, unBatera:6, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"HAM0002", desc:"HAMBURGUESA EXTRA CENTENARIO CAJ X84", pasta:"", familia:"HAMBURGUESAS", subfamilia:"HAMBURGUESAS CENTENARIO", sector:"HAMBURGUESAS", vidaUtil:270, tme:0, leadTime:20, kgBatch:500, kgBatchMin:500, pesoUnitario:7.01, unBatera:2, objDias:54, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"HAM0004", desc:"HAMBURGUESA EXTRA CENTENARIO CAJ X84", pasta:"", familia:"HAMBURGUESAS", subfamilia:"HAMBURGUESAS CENTENARIO", sector:"HAMBURGUESAS", vidaUtil:360, tme:0, leadTime:20, kgBatch:500, kgBatchMin:500, pesoUnitario:7.01, unBatera:2, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"HAM0006", desc:"HAMBURGUESA CENTENARIO PACK X21", pasta:"", familia:"HAMBURGUESAS", subfamilia:"HAMBURGUESAS CENTENARIO", sector:"HAMBURGUESAS", vidaUtil:270, tme:0, leadTime:5, kgBatch:500, kgBatchMin:500, pesoUnitario:3.51, unBatera:4, objDias:54, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0007", desc:"MILANESA SABOR POLLO DE LA PLANTA 230G", pasta:"", familia:"VEGANOS", subfamilia:"CARNES VEGETALES", sector:"VEGANOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.23, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0008", desc:"HAMBURGUESA SABOR CARNE DE LA PLANTA 230G", pasta:"", familia:"VEGANOS", subfamilia:"CARNES VEGETALES", sector:"VEGANOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.23, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0009", desc:"TIRAS SABOR CARNE DE LA PLANTA 230G", pasta:"", familia:"VEGANOS", subfamilia:"CARNES VEGETALES", sector:"VEGANOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.23, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0010", desc:"TIRAS SABOR POLLO DE LA PLANTA 230G", pasta:"", familia:"VEGANOS", subfamilia:"CARNES VEGETALES", sector:"VEGANOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.23, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0001", desc:"HUMMUS CLÁSICO DE LA PLANTA 175G", pasta:"", familia:"VEGANOS", subfamilia:"HUMMUS", sector:"VEGANOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.17, unBatera:60, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0002", desc:"HUMMUS AJO Y LIMÓN DE LA PLANTA 175G", pasta:"", familia:"VEGANOS", subfamilia:"HUMMUS", sector:"VEGANOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.17, unBatera:60, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0003", desc:"HUMMUS AHUMADO C/PIMENTÓN 175G", pasta:"", familia:"VEGANOS", subfamilia:"HUMMUS", sector:"VEGANOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.17, unBatera:60, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0004", desc:"HUMMUS MIX SURTIDO SABORES 175G", pasta:"", familia:"VEGANOS", subfamilia:"HUMMUS", sector:"VEGANOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.17, unBatera:60, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0011", desc:"HUMMUS DE LA PLANTA PACK X3 525G", pasta:"", familia:"VEGANOS", subfamilia:"HUMMUS", sector:"VEGANOS", vidaUtil:180, tme:0, leadTime:15, kgBatch:500, kgBatchMin:500, pesoUnitario:0.52, unBatera:20, objDias:36, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0005", desc:"DULCE DE LECHE 220G  x 6un.", pasta:"", familia:"VEGANOS", subfamilia:"LÁCTEOS VEG", sector:"VEGANOS", vidaUtil:90, tme:0, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:0.22, unBatera:60, objDias:18, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"VEG0006", desc:"QUESO UNTABLE 230G x 6un.", pasta:"", familia:"VEGANOS", subfamilia:"LÁCTEOS VEG", sector:"VEGANOS", vidaUtil:90, tme:0, leadTime:10, kgBatch:500, kgBatchMin:500, pesoUnitario:0.23, unBatera:60, objDias:18, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0007", desc:"CHIMICHURRI CLÁSICO 160G PACK X6", pasta:"", familia:"ADEREZOS", subfamilia:"CHIMICHURRI", sector:"ADEREZOS", vidaUtil:120, tme:0, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:0.96, unBatera:10, objDias:24, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0009", desc:"CHIMICHURRI PICANTE 160G PACK X6", pasta:"", familia:"ADEREZOS", subfamilia:"CHIMICHURRI", sector:"ADEREZOS", vidaUtil:120, tme:0, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:0.96, unBatera:10, objDias:24, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0010", desc:"CHIMICHURRI MIX CLÁSICO Y PICANTE 160G", pasta:"", familia:"ADEREZOS", subfamilia:"CHIMICHURRI", sector:"ADEREZOS", vidaUtil:120, tme:0, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:0.96, unBatera:10, objDias:24, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0001", desc:"SALSA BARBACOA TIPO AMERICANA 350 GR", pasta:"", familia:"ADEREZOS", subfamilia:"SALSAS", sector:"ADEREZOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.36, unBatera:12, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0003", desc:"SALSA PICANTE SUAVE 360 G", pasta:"", familia:"ADEREZOS", subfamilia:"SALSAS", sector:"ADEREZOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:0.36, unBatera:12, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0005", desc:"SALSAS MIX SURTIDO SABORES PACK X6", pasta:"", familia:"ADEREZOS", subfamilia:"SALSAS", sector:"ADEREZOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:2.16, unBatera:12, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"SLS0004", desc:"SALSAS MIX SURTIDO SABORES PACK X12", pasta:"", familia:"ADEREZOS", subfamilia:"SALSAS", sector:"ADEREZOS", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:4.32, unBatera:12, objDias:72, ter:15, segDias:7, permiteArrastre:false, reventa:true, vacio:false, tipoPlan:"Stock" },
  { sku:"JC001", desc:"JAMÓN CRUDO SERRANO - PATA DESHUESADA", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"PIEZAS", sector:"JAMÓN CRUDO", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:5.0, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"JC002", desc:"JAMÓN CRUDO SERRANO - PATA DESHUESADA MITAD", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"PIEZAS", sector:"JAMÓN CRUDO", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:2.4, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"JC003", desc:"JAMÓN CRUDO SERRANO - BLOQUE PRENSADO", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"PIEZAS", sector:"JAMÓN CRUDO", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:5.0, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"JC004", desc:"JAMÓN CRUDO SERRANO - BLOQUE PRENSADO MITAD", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"PIEZAS", sector:"JAMÓN CRUDO", vidaUtil:360, tme:0, leadTime:90, kgBatch:500, kgBatchMin:500, pesoUnitario:2.2, unBatera:0, objDias:72, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"QJC003", desc:"JAMÓN CRUDO SERRANO x 100GR - PACK x 5un", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"FETEADO", sector:"JAMÓN CRUDO", vidaUtil:120, tme:60, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:0.5, unBatera:0, objDias:24, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" },
  { sku:"QJC0031", desc:"Jamon Crudo Serrano En Fetas (1KG.)", pasta:"", familia:"JAMÓN CRUDO", subfamilia:"FETEADO", sector:"JAMÓN CRUDO", vidaUtil:120, tme:0, leadTime:7, kgBatch:500, kgBatchMin:500, pesoUnitario:1.0, unBatera:0, objDias:24, ter:15, segDias:7, permiteArrastre:true, reventa:true, vacio:true, tipoPlan:"Stock" }
];

// Quitar duplicados por sku
const MAESTRO_UNICO = MAESTRO_INI.filter((a,i,arr)=>arr.findIndex(b=>b.sku===a.sku)===i);

// ─── DATOS INICIALES DE MUESTRA ──────────────────────────────────────────────
const FCST_ACTUAL_INI = {};
const FCST_S2_INI = {};
const FCST_S3_INI = {};
const STOCK_INI = {};


const PROD_ACUM_INI  = {};
const PROD_PEND_INI = {};
;
const PROD_S2_INI    = {};
const VENTA_ACUM_INI = {};
const PEDIDOS_PEND_INI = {};

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const COL_W = 58; // ancho uniforme de columnas de datos en px

const Th = ({children,right,center,style:s,onClick})=>(
  <th onClick={onClick} style={{padding:"5px 6px",textAlign:"center",
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
const InpDec = ({value,onChange,width=64,step=0.5})=>(
  <input type="number" value={value??0} min={0} step={step}
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
function KpiPanel({totFcst,totAcum,totProdS,totProdAcum,totProdOptS2,fcstS2Total,alertasS,alertasS2,totStkActual,totStkCierreS,totStkCierreS2}) {
  const fmt = n => Math.round(n).toLocaleString("es-UY");
  const pctAcum = totFcst>0?Math.round(totAcum/totFcst*100):0;
  const pctProdAcum = totProdS>0?Math.round(totProdAcum/totProdS*100):0;

  const grupo = (titulo,color,children,minW=180) => (
    <div style={{background:C.surface,border:`1px solid ${C.hairline}`,borderRadius:10,
      padding:"12px 16px",flex:1,minWidth:minW,borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,fontWeight:700,color,letterSpacing:"0.08em",
        textTransform:"uppercase",marginBottom:10}}>{titulo}</div>
      {children}
    </div>
  );

  const fila = (label,value,hint,bold) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
      <span style={{fontSize:10,color:C.textDim}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{fontSize:bold?15:12,fontWeight:bold?700:500,color:C.text}}>{value}</span>
        {hint&&<div style={{fontSize:9,color:C.muted}}>{hint}</div>}
      </div>
    </div>
  );

  const barra = (pct,color) => (
    <div style={{height:3,background:C.faint,borderRadius:2,marginBottom:8,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:pct>100?"#dc2626":color,borderRadius:2}}/>
    </div>
  );

  const chips = (alertas) => (
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {Object.entries(POLITICA_DEFAULT).map(([k,v])=>{
        const cnt=alertas[k]||0;
        return cnt>0?<span key={k} style={{background:v.bg,color:v.color,border:`1px solid ${v.border}`,padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:600}}>{cnt} {v.label}</span>:null;
      })}
      {Object.values(alertas).every(v=>!v)&&<span style={{color:C.ok.color,fontSize:10,fontWeight:600}}>✓ Sin alertas</span>}
    </div>
  );

  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
      {/* STOCK */}
      {grupo("Stock","#0f766e",<>
        {fila("Stock actual",`${fmt(totStkActual)} kg`,null,true)}
        {fila("Cierre S",`${fmt(totStkCierreS)} kg`)}
        {fila("Cierre S+1",`${fmt(totStkCierreS2)} kg`)}
      </>)}

      {/* VENTA */}
      {grupo("Venta","#2563eb",<>
        {fila("Fcst S",`${fmt(totFcst)} kg`,null,true)}
        {barra(pctAcum,"#2563eb")}
        {fila("Facturado acum.",`${fmt(totAcum)} kg`,`${pctAcum}% del fcst`)}
        {fila("Fcst S+1",`${fmt(fcstS2Total)} kg`)}
      </>)}

      {/* PEDIDO */}
      {grupo("Pedido","#7c3aed",<>
        {fila("Plan S",`${fmt(totProdS)} kg`,null,true)}
        {barra(pctProdAcum,"#7c3aed")}
        {fila("Ped. acum. S",`${fmt(totProdAcum)} kg`,`${pctProdAcum}% del plan`)}
        {fila("Pedido sugerido S+1",`${fmt(totProdOptS2)} kg`)}
      </>)}

      {/* ALERTAS DE STOCK */}
      {grupo("Alertas de stock","#dc2626",<>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:4}}>Semana S</div>
          {chips(alertasS)}
        </div>
        <div>
          <div style={{fontSize:9,color:C.muted,marginBottom:4}}>Semana S+1</div>
          {chips(alertasS2)}
        </div>
      </>,220)}
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

  const vu       = art.vidaUtil;
  const tme      = art.tme || 0;
  const leadTime = art.leadTime || 3;
  const ss       = art.segDias || 0;
  const ter      = art.ter || (art.reventa ? 15 : 7);

  // Umbrales en días
  const diasMin  = leadTime + ss;              // punto de pedido = leadtime + SS
  const diasObj  = ter + ss;                   // stock objetivo = TER + SS
  const diasMax  = tme > 0 ? tme : null; // stock máximo = TME × demanda (límite duro)
  const pctObj   = vu > 0 ? diasObj / vu : 0.20;

  // Alerta: stock objetivo supera TME → parámetros mal configurados
  const alertaTME = tme > 0 && diasObj > tme;

  // ── STOCK ACTUAL ──
  const stkActual    = stockActual[art.sku] || 0;
  const fcst         = fcstS[art.sku] || 0;
  const diasActual   = calcDias(stkActual, fcst);
  const estadoActual = getEstado(diasActual, vu, fcst, diasMin, diasObj, diasMax);

  // ── VENTA S ──
  const factAcum  = ventaAcum[art.sku] || 0;
  const pedidos   = pedidosPend[art.sku] || 0;
  const fcstPend  = fcst - factAcum - pedidos;
  const ventaTotalS = factAcum + pedidos + Math.max(0, fcstPend);

  // ── PEDIDO S ──
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
  const estadoS  = getEstado(diasS, vu, fcstS2v, diasMin, diasObj, diasMax);

  // ── PEDIDO SUGERIDO S+1 ──
  const fcstS3v   = fcstS3[art.sku] || 0;
  const demDiaria = fcstS2v / 7;

  // Umbrales en kg
  const stkMinKg = demDiaria * diasMin;
  const stkObjKg = demDiaria * diasObj;
  const stkMaxKg = diasMax != null ? demDiaria * diasMax : null;

  // Stock disponible al inicio de S+1 = stock cierre S
  const stkCierreSPos = Math.max(0, stkCierreS);

  // Pedido sugerido = stock objetivo - stock disponible, redondeado al batch mínimo
  // Limitado por stock máximo (TME - SS)
  const kgBatchMin = art.kgBatchMin || 500;
  const necesidad = Math.max(0, fcstS2v + stkObjKg - stkCierreSPos);
  let prodOptS2 = 0;
  if (necesidad > 0) {
    const kgBatch = art.kgBatch || kgBatchMin;
    // 1. Redondear al batch completo hacia arriba
    prodOptS2 = Math.ceil(necesidad / kgBatch) * kgBatch;
    // 2. Si supera stock máximo → redondear batch completo hacia abajo
    if (stkMaxKg != null && (stkCierreSPos + prodOptS2) > stkMaxKg) {
      prodOptS2 = Math.floor((stkMaxKg - stkCierreSPos) / kgBatch) * kgBatch;
      // 3. Si queda por debajo del stock mínimo → usar batch mínimo
      if (prodOptS2 < stkMinKg && kgBatchMin > 0) {
        prodOptS2 = kgBatchMin;
      }
      prodOptS2 = Math.max(0, prodOptS2);
    }
  }

  // Alerta batch: si stkDisponible + batch mínimo supera el stock máximo (TME - SS)
  const alertaMax = stkMaxKg != null && (stkCierreSPos + kgBatchMin) > stkMaxKg;

  const prodS2val = (prodS2[art.sku] !== undefined && prodS2[art.sku] !== null)
    ? (prodS2[art.sku] || 0)
    : prodOptS2;

  // ── STOCK CIERRE S+1 ──
  const stkCierreS2 = Math.max(0, stkCierreS) - fcstS2v + prodS2val;
  // Días medidos contra fcst S+2
  const diasS2      = calcDias(Math.max(0, stkCierreS2), fcstS3v);
  const estadoS2    = getEstado(diasS2, vu, fcstS3v, diasMin, diasObj, diasMax);

  return {
    stkActual, diasActual, estadoActual,
    fcst, factAcum, pedidos, fcstPend, ventaTotalS,
    pAcum, pPend, prodTotalS,
    stkCierreS, diasS, estadoS,
    fcstS3v,
    fcstS2v, arrastre,
    prodOptS2, prodS2val,
    stkCierreS2, diasS2, estadoS2,
    diasMin, diasObj, diasMax, stkMinKg, stkObjKg, stkMaxKg,
    tme, alertaTME, alertaMax, pctObj, demDiaria,
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

function CargaCSV({ titulo, descripcion, color="#2563eb", onCargar, ultimaCarga, plantillaNombre, plantillaContenido, maestro=[], children }) {
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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:"#92400e"}}>
              {noEncontrados.length} SKUs no encontrados en el maestro — no se cargaron
            </div>
            <button onClick={()=>descargarCSV("skus_no_encontrados.csv","SKU\n"+noEncontrados.join("\n"))}
              style={{background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",
                padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontWeight:600}}>
              ↓ Descargar CSV
            </button>
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
      <CargaCSV titulo="Planificación de abastecimiento"
        descripcion="CSV con 3 columnas: SKU · Prod pendiente S · Prod S+1. Separador: punto y coma."
        color={C.gProd} onCargar={cargarProd} ultimaCarga={ultimaCarga}
        plantillaNombre="produccion.csv" plantillaContenido={plantillaContenidoProd}/>

      {/* 4 tarjetas */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {/* Prod acum */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Ped. acum. S</div>
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
              <Th right>Ped. acum.</Th><Th right>Ped. pend.</Th>
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
            <Th right>Ped. acum.</Th>
            <Th right>Ped. pend.</Th>
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
function FiltroDropdown({ label, opciones, filtro, setter }) {
  const [abierto, setAbierto] = useState(false);
  const activos = filtro.size;
  return (
    <div style={{position:"relative",flexShrink:0}}>
      {abierto&&<div onClick={()=>setAbierto(false)} style={{position:"fixed",inset:0,zIndex:99}}/>}
      <button onClick={()=>setAbierto(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
          background:activos>0?C.accentDim:C.surface,
          border:`1px solid ${activos>0?C.accent:C.border}`,
          color:activos>0?C.accent:C.textDim,
          borderRadius:6,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>
        {label}{activos>0?` (${activos})`:""} {abierto?"▲":"▼"}
      </button>
      {abierto&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:200,
          background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:180,padding:"6px 0"}}>
          {activos>0&&(
            <div onClick={()=>{setter(new Set());}}
              style={{padding:"6px 14px",fontSize:11,color:C.accent,cursor:"pointer",
                borderBottom:`1px solid ${C.hairline}`,marginBottom:4}}>
              ✕ Limpiar selección
            </div>
          )}
          {opciones.map(({val,label:lbl,color,bg,border})=>{
            const activo = filtro.has(val);
            const col = color||C.text;
            return (
              <div key={val} onClick={()=>{
                setter(prev=>{const n=new Set(prev);n.has(val)?n.delete(val):n.add(val);return n;});
              }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",
                cursor:"pointer",background:activo?(bg||col+"11"):"transparent",
                transition:"background 0.1s"}}>
                <div style={{width:14,height:14,borderRadius:3,flexShrink:0,
                  border:`2px solid ${activo?col:C.border}`,
                  background:activo?col:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {activo&&<span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:activo?col:C.text}}>{lbl||val}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelPlan({ maestro, fcstActual, setFcstActual, fcstS2, setFcstS2, fcstS3,
  stockActual, setStockActual, ventaAcum, setVentaAcum,
  pedidosPend, setPedidosPend, prodAcum, setProdAcum,
  prodPend, setProdPend, prodS2, setProdS2 }) {

  const [filtroSector,   setFiltroSector]   = useState(new Set());
  const [filtroEstado,   setFiltroEstado]   = useState(new Set());
  const [filtroReventa,  setFiltroReventa]  = useState(new Set());
  const [filtroVacio,    setFiltroVacio]    = useState(new Set());
  const [filtroTipoPlan, setFiltroTipoPlan] = useState(new Set());

  function toggleFiltro(setter, valor) {
    setter(prev => {
      const next = new Set(prev);
      next.has(valor) ? next.delete(valor) : next.add(valor);
      return next;
    });
  }
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
    const sOk = filtroSector.size===0   || filtroSector.has(r.art.sector);
    const eOk = filtroEstado.size===0   || filtroEstado.has(r.estadoActual);
    const tOk = filtroTipoPlan.size===0 || filtroTipoPlan.has(r.art.tipoPlan||"Stock");
    const rOk = filtroReventa.size===0  || filtroReventa.has(r.art.reventa?"Reventa":"Propio");
    const vOk = filtroVacio.size===0    || filtroVacio.has(r.art.vacio?"Si":"No");
    const bOk = !buscar.trim() ||
      r.art.sku.toLowerCase().includes(buscar.toLowerCase()) ||
      r.art.desc.toLowerCase().includes(buscar.toLowerCase());
    return sOk&&eOk&&rOk&&vOk&&tOk&&bOk;
  }).sort((a,b)=>{
    const d = orden.dir==="asc" ? 1 : -1;
    if (orden.col==="sku")      return d * String(a.art.sku).localeCompare(String(b.art.sku), undefined, {numeric:true});
    if (orden.col==="desc")     return d * a.art.desc.localeCompare(b.art.desc);
    if (orden.col==="stkActual")return d * (a.stkActual - b.stkActual);
    if (orden.col==="diasAct")  return d * ((isNaN(a.diasActual)||a.diasActual===999?9999:a.diasActual) - (isNaN(b.diasActual)||b.diasActual===999?9999:b.diasActual));
    if (orden.col==="fcst")     return d * ((a.fcst||0) - (b.fcst||0));
    if (orden.col==="fcstPend") return d * (a.fcstPend - b.fcstPend);
    if (orden.col==="stkCierreS")return d * (a.stkCierreS - b.stkCierreS);
    if (orden.col==="diasS")    return d * ((isNaN(a.diasS)||a.diasS===999?9999:a.diasS) - (isNaN(b.diasS)||b.diasS===999?9999:b.diasS));
    if (orden.col==="prodS2val")return d * (a.prodS2val - b.prodS2val);
    if (orden.col==="stkCierreS2")return d * (a.stkCierreS2 - b.stkCierreS2);
    if (orden.col==="diasS2")   return d * ((isNaN(a.diasS2)||a.diasS2===999?9999:a.diasS2) - (isNaN(b.diasS2)||b.diasS2===999?9999:b.diasS2));
    if (orden.col==="estado") {
      const ord = ["faltante","substockAlerta","sinForecast","ok","sobrestockAlerta","sobrestockRiesgo"];
      return d * ((ord.indexOf(a.estadoActual)===-1?3:ord.indexOf(a.estadoActual)) - (ord.indexOf(b.estadoActual)===-1?3:ord.indexOf(b.estadoActual)));
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
  const totFcst        = rowsFilt.reduce((a,r)=>a+r.fcst,0);
  const totAcum        = rowsFilt.reduce((a,r)=>a+r.factAcum,0);
  const totProdS       = rowsFilt.reduce((a,r)=>a+r.prodTotalS,0);
  const totProdAcum    = rowsFilt.reduce((a,r)=>a+r.pAcum,0);
  const totProdOptS2   = rowsFilt.reduce((a,r)=>a+r.prodOptS2,0);
  const fcstS2Total    = rowsFilt.reduce((a,r)=>a+r.fcstS2v,0);
  const totStkActual   = rowsFilt.reduce((a,r)=>a+r.stkActual,0);
  const totStkCierreS  = rowsFilt.reduce((a,r)=>a+Math.max(0,r.stkCierreS),0);
  const totStkCierreS2 = rowsFilt.reduce((a,r)=>a+Math.max(0,r.stkCierreS2),0);

  // Conteo de alertas por estado — sobre rowsFilt
  const cuentaAlertas = (campo) => {
    const c={};
    Object.keys(POLITICA_DEFAULT).forEach(k=>{ c[k]=rowsFilt.filter(r=>r[campo]===k).length; });
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
        alertasS={alertasS} alertasS2={alertasS2}
        totStkActual={totStkActual} totStkCierreS={totStkCierreS} totStkCierreS2={totStkCierreS2}/>

      {/* Controles */}
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Buscar por código o descripción..." value={buscar}
          onChange={e=>setBuscar(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
            padding:"7px 12px",borderRadius:6,fontSize:12,outline:"none",width:220,flexShrink:0}}/>
        {/* ── Dropdowns multi-selección ── */}
        <FiltroDropdown label="Sector" filtro={filtroSector} setter={setFiltroSector}
          opciones={sectores.slice(1).map(s=>({val:s, color:(SECTOR_COLOR[s]||{color:"#64748b"}).color, bg:(SECTOR_COLOR[s]||{bg:"#f8fafc"}).bg}))}/>
        <FiltroDropdown label="Estado" filtro={filtroEstado} setter={setFiltroEstado}
          opciones={Object.entries(POLITICA_DEFAULT).map(([k,v])=>({val:k,label:v.label,color:v.color,bg:v.bg,border:v.border}))}/>
        <FiltroDropdown label="Tipo plan" filtro={filtroTipoPlan} setter={setFiltroTipoPlan}
          opciones={[...new Set(maestro.map(a=>a.tipoPlan||"Stock"))].sort().map(t=>({
            val:t,
            color:t==="Frescos"?"#15803d":t==="Contra pedido"?"#92400e":t==="Feteados"?"#0891b2":"#475569"
          }))}/>
        <FiltroDropdown label="Origen" filtro={filtroReventa} setter={setFiltroReventa}
          opciones={[{val:"Propio",color:"#475569"},{val:"Reventa",color:"#1d4ed8"}]}/>
        <FiltroDropdown label="Vacío" filtro={filtroVacio} setter={setFiltroVacio}
          opciones={[{val:"Si",label:"Al vacío",color:"#0891b2"},{val:"No",label:"Sin vacío",color:"#475569"}]}/>
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
            Acumula demanda no atendida en S+1
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
        {mostrarS2&&(
          <button onClick={()=>{
            if(window.confirm("¿Resetear la producción S+1 de todos los artículos al valor automático calculado?")) {
              setProdS2(p => {
                const nuevo = {...p};
                maestro.forEach(a => { delete nuevo[a.sku]; });
                return nuevo;
              });
            }
          }}
            style={{background:"#f0fdf4",border:`1px solid #bbf7d0`,color:"#15803d",
              padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>
            ↺ Reset todos a automático
          </button>
        )}
        <div style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>{rowsFilt.length} artículos</div>
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
                width:260,minWidth:260,cursor:"pointer",userSelect:"none",
                borderRight:`2px solid ${C.border}`}}>
                Descripción{sortIcon("desc")}
              </th>
              <GrpTh label="Stock actual" cols={3} color="#475569"/>
              <GrpTh label="Venta S" cols={4} color="#2563eb" sep/>
              <GrpTh label="Pedido S" cols={2} color="#7c3aed"/>
              <GrpTh label="Stock cierre S" cols={3} color="#0f766e"/>
              {mostrarS2&&<>
                <GrpTh label="Venta S+1" cols={1} color="#1d4ed8" sep/>
                <GrpTh label="Pedido S+1" cols={2} color="#6d28d9"/>
                <GrpTh label="Stock cierre S+1" cols={3} color="#0d9488"/>
                <GrpTh label="Venta S+2" cols={1} color="#1d4ed8" sep/>
              </>}
            </tr>
            <tr style={{position:"sticky",top:28,zIndex:3,background:"#f8fafc",
              borderBottom:`2px solid ${C.hairline}`}}>
              {/* Stock actual */}
              {[["kg","stkActual"],["Días","diasAct"],["Estado","estado"]].map(([lbl,col])=>(
                <Th key={col} right={lbl!=="Estado"} style={{cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}
                  onClick={()=>toggleOrden(col)}>
                  {lbl}{sortIcon(col)}
                </Th>
              ))}
              {/* Venta S */}
              {[["Fcst S","fcst"],["Fact. acum.",null],["Ped. pend.",null],["Fcst pend.","fcstPend"]].map(([lbl,col])=>(
                <Th key={lbl} right style={{cursor:col?"pointer":"default",userSelect:"none",whiteSpace:"nowrap"}}
                  onClick={col?()=>toggleOrden(col):undefined}>
                  {lbl}{col?sortIcon(col):""}
                </Th>
              ))}
              {/* Pedido S */}
              <Th right>Ped. acum.</Th><Th right>Ped. pend.</Th>
              {/* Stock cierre S */}
              {[["kg","stkCierreS"],["Días","diasS"],["Estado","estadoS"]].map(([lbl,col])=>(
                <Th key={col+"S"} right={lbl!=="Estado"} style={{cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}
                  onClick={()=>toggleOrden(col)}>
                  {lbl}{sortIcon(col)}
                </Th>
              ))}
              {mostrarS2&&<>
                <Th right>Fcst S+1</Th>
                {[["Ped. S+1","prodS2val"],["Pedido sugerido",null]].map(([lbl,col])=>(
                  <Th key={lbl} right style={{cursor:col?"pointer":"default",userSelect:"none"}}
                    onClick={col?()=>toggleOrden(col):undefined}>
                    {lbl}{col?sortIcon(col):""}
                  </Th>
                ))}
                {[["kg","stkCierreS2"],["Días","diasS2"],["Estado","estadoS2"]].map(([lbl,col])=>(
                  <Th key={col+"S2"} right={lbl!=="Estado"} style={{cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}
                    onClick={()=>toggleOrden(col)}>
                    {lbl}{sortIcon(col)}
                  </Th>
                ))}
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
              stkCierreS2,diasS2,estadoS2,
              diasMin,diasObj,diasMax,stkMinKg,stkObjKg,stkMaxKg,alertaTME,alertaMax,pctObj,demDiaria})=>{

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
                    width:260,minWidth:260}}>
                    <div style={{fontWeight:500,color:C.text,fontSize:12,
                      width:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {art.desc}
                    </div>
                    <div style={{fontSize:9,color:C.muted,marginTop:1}}>
                      VU {art.vidaUtil}d · obj {diasObj}d{diasMax!=null?` · máx ${diasMax}d`:""}
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
                  <Tv right dim>
                    {(()=>{
                      const pctAv = fcst>0 ? Math.round(factAcum/fcst*100) : null;
                      const colAv = pctAv==null ? C.muted
                        : pctAv>120 ? "#1d4ed8"
                        : pctAv>=80 ? "#15803d"
                        : pctAv>=60 ? "#d97706"
                        : pctAv>=40 ? "#ea580c"
                        : "#b91c1c";
                      return <>
                        <div style={{textAlign:"center",fontSize:12,color:C.text}}>{fmt(factAcum)}</div>
                        {pctAv!=null&&<div style={{fontSize:9,color:colAv,fontWeight:600,textAlign:"center"}}>{pctAv}%</div>}
                      </>;
                    })()}
                  </Tv>
                  <Tv right dim><Val v={pedidos}/></Tv>
                  <Tv right>
                    {(()=>{
                      const pctAv = fcst>0 ? Math.round(factAcum/fcst*100) : null;
                      const esSubventa = pctAv!=null && pctAv<40 && fcstPend>=0;
                      return <>
                        <span style={{color:fcstPend<0&&pctAv>120?"#1d4ed8":esSubventa?"#b91c1c":fcstPend===0?C.muted:C.text,
                          fontSize:12,fontWeight:fcstPend!==0?500:400}}>
                          {fmt(Math.max(0,fcstPend))}
                        </span>
                        {fcstPend<0&&pctAv>120&&<div style={{fontSize:9,color:"#1d4ed8",fontWeight:600}}>sobreventa</div>}
                        {esSubventa&&<div style={{fontSize:9,color:"#b91c1c",fontWeight:600}}>subventa</div>}
                      </>;
                    })()}
                  </Tv>

                  {/* PEDIDO S — acum solo lectura, pend editable */}
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

                    {/* Prod S+1 — editable, por defecto = pedido sugerido calculado */}
                    <Ti right>
                      <Inp value={Math.round(prodS2val)} width={75}
                        onChange={v=>setProdS2(p=>({...p,[art.sku]:v}))}/>
                      {alertaMax&&<div style={{fontSize:9,color:"#b91c1c",fontWeight:700,textAlign:"center",marginTop:1}}
                        title="Batch mínimo supera stock máximo (TME)">⚠ sup. máx.</div>}
                      {!alertaMax&&(prodS2[art.sku]===undefined||prodS2[art.sku]===null)
                        ? <div style={{fontSize:9,color:C.accent,textAlign:"center",marginTop:1}}>auto</div>
                        : !alertaMax&&<div style={{fontSize:9,color:C.muted,textAlign:"center",marginTop:1,cursor:"pointer"}}
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
    const header = "SKU;Descripción;Pasta;Fcst S+1 (kg);Stk cierre S (kg);Stk inicio S+1 (sem);Pedido sugerido S+1 (kg);Batch ref.\n";
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
    const header = "Grupo;SKU;Descripción;Pasta;Fcst S+1 (kg);Stk cierre S (kg);Stk inicio S+1 (sem);Pedido sugerido S+1 (kg);Batch ref.\n";
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
                  <Th right>Pedido sugerido S+1</Th><Th right>Batch ref.</Th>
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
                        {r.alertaMax&&<div style={{fontSize:9,color:"#b91c1c",fontWeight:700}}>⚠ sup. TME</div>}
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
  const [ordenM, setOrdenM] = useState({col:"sku", dir:"asc"});
  const inputMaestroRef = useRef();

  function toggleOrdenM(col) {
    setOrdenM(o => o.col===col ? {col, dir:o.dir==="asc"?"desc":"asc"} : {col, dir:"asc"});
  }
  const sortIconM = col => ordenM.col===col ? (ordenM.dir==="asc"?" ↑":" ↓") : " ↕";

  const arts = maestro.filter(a=>
    a.desc.toLowerCase().includes(buscar.toLowerCase())||
    a.sku.toLowerCase().includes(buscar.toLowerCase())||
    (a.pasta||"").toLowerCase().includes(buscar.toLowerCase())
  ).sort((a,b)=>{
    const d = ordenM.dir==="asc" ? 1 : -1;
    if (ordenM.col==="sku")    return d * String(a.sku).localeCompare(String(b.sku), undefined, {numeric:true});
    if (ordenM.col==="desc")   return d * a.desc.localeCompare(b.desc);
    if (ordenM.col==="sector") return d * (a.sector||"").localeCompare(b.sector||"");
    if (ordenM.col==="familia")return d * (a.familia||"").localeCompare(b.familia||"");
    if (ordenM.col==="vu")     return d * ((a.vidaUtil||0) - (b.vidaUtil||0));
    if (ordenM.col==="tme")    return d * ((a.tme||0) - (b.tme||0));
    if (ordenM.col==="ter")    return d * ((a.ter||7) - (b.ter||7));
    if (ordenM.col==="seg")    return d * ((a.segDias||0) - (b.segDias||0));
    if (ordenM.col==="lead")   return d * ((a.leadTime||0) - (b.leadTime||0));
    if (ordenM.col==="tipo")   return d * (a.tipoPlan||"Stock").localeCompare(b.tipoPlan||"Stock");
    return 0;
  });

  // Exportar maestro actual como CSV
  function exportarMaestro() {
    const header = "SKU;Descripcion;Pasta;Familia;Subfamilia;Sector;VidaUtil;TME;TER;SegDias;KgBatch;KgBatchMin;LeadTime;PesoUnitario;UnBatera;PermiteArrastre;Reventa;Vacio;TipoPlan\n";
    const body = maestro.map(a=>
      [a.sku, a.desc, a.pasta||"", a.familia||"", a.subfamilia||"", a.sector,
       a.vidaUtil, a.tme||"",
       a.ter||(a.reventa?15:7),
       a.segDias||0,
       a.kgBatch, a.kgBatchMin, a.leadTime,
       a.pesoUnitario||"", a.unBatera||"",
       a.permiteArrastre===false?"No":"Si",
       a.reventa?"Si":"No",
       a.vacio?"Si":"No",
       a.tipoPlan||"Stock",
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
              ter:           pn(r[8]) || 0,
              segDias:       pn(r[9]) || 0,
              kgBatch:       pn(r[10]) || 500,
              kgBatchMin:    pn(r[11]) || 500,
              leadTime:      pn(r[12]) || 3,
              pesoUnitario:  pn(r[13]) || 0,
              unBatera:      pn(r[14]) || 0,
              permiteArrastre: (r[15]?.trim().toLowerCase()||"si")!=="no",
              reventa:       (r[16]?.trim().toLowerCase()||"no")==="si",
              vacio:         (r[17]?.trim().toLowerCase()||"no")==="si",
              tipoPlan:      r[18]?.trim()||"Stock",
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

  function seleccionarTodos() {
    const indices = new Set(arts.map(a=>maestro.indexOf(a)));
    setSeleccionados(indices);
  }

  function deseleccionarTodos() {
    setSeleccionados(new Set());
  }



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
            {/* ── Campos SAP — solo lectura ── */}
            <div style={{gridColumn:"1/-1",fontSize:10,fontWeight:700,color:C.muted,
              borderBottom:`1px solid ${C.hairline}`,paddingBottom:4,marginBottom:2}}>
              Datos de SAP — solo lectura
            </div>
            {[["SKU","sku","text"],["Descripción","desc","text"],
              ["Sector","sector","text"],["Pasta","pasta","text"],
              ["Familia","familia","text"],["Subfamilia","subfamilia","text"],
              ["Vida útil (días)","vidaUtil","number"],
              ["TME (días)","tme","number"],
              ["Lead time (días)","leadTime","number"],
              ["Kg/Batch","kgBatch","number"],["Kg/Batch mín.","kgBatchMin","number"],
              ["Peso unitario (kg)","pesoUnitario","number"],["Un/batera","unBatera","number"],
            ].map(([label,key,type])=>(
              <label key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                <span style={{fontSize:10,color:C.muted}}>{label}</span>
                <input type={type} value={form[key]||""} disabled
                  style={{background:"#f9fafb",border:`1px solid ${C.border}`,
                    color:C.textDim,padding:"6px 10px",borderRadius:5,fontSize:12,
                    outline:"none",cursor:"not-allowed"}}/>
              </label>
            ))}
            {/* ── Parámetros de planificación — editables ── */}
            <div style={{gridColumn:"1/-1",fontSize:10,fontWeight:700,color:C.accent,
              borderBottom:`1px solid ${C.hairline}`,paddingBottom:4,marginBottom:2,marginTop:8}}>
              Parámetros de planificación — configurables
            </div>
            {[["TER — Tiempo entre reposiciones (días)","ter","number"],
              ["Stock de seguridad (días)","segDias","number"],
            ].map(([label,key,type])=>(
              <label key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                <span style={{fontSize:10,color:C.muted}}>{label}</span>
                <input type={type} value={form[key]??""} 
                  onChange={e=>setForm({...form,[key]:e.target.value})}
                  style={{background:C.surface,border:`1px solid ${C.accent}`,
                    color:C.text,padding:"6px 10px",borderRadius:5,fontSize:12,outline:"none"}}/>
              </label>
            ))}
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Tipo de planificación</span>
              <select value={form.tipoPlan||"Stock"}
                onChange={e=>setForm({...form,tipoPlan:e.target.value})}
                style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
                  padding:"6px 10px",borderRadius:5,fontSize:12,outline:"none"}}>
                <option value="Stock">Stock</option>
                <option value="Frescos">Frescos</option>
                <option value="Feteados">Feteados</option>
                <option value="Contra pedido">Contra pedido</option>
              </select>
            </label>
            <label style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Acumula demanda 🔐</span>
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
            {rol==="admin"&&<th style={{padding:"6px 8px",width:32,background:"#f8fafc",position:"sticky",top:0,zIndex:3}}>
              <input type="checkbox"
                checked={arts.length>0 && arts.every(a=>seleccionados.has(maestro.indexOf(a)))}
                onChange={e=>e.target.checked ? seleccionarTodos() : deseleccionarTodos()}
                style={{cursor:"pointer"}}
                title="Seleccionar todos"/>
            </th>}
            {[
              ["SKU","sku",false],["Descripción","desc",false],["Sector","sector",false],
              ["Reventa",null,false],["Subfamilia",null,false],["Pasta",null,false],
              ["Tipo plan","tipo",false],["Vacío",null,false],
              ["VU (d) 🔐","vu",true],["TME (d) 🔐","tme",true],
              ["TER (d)","ter",true],["SS (d)","seg",true],
              ["TER+SS vs TME (%)",null,true],
              ["Stk mín (d)",null,true],["Stk máx (d)",null,true],
              ["Batch (kg) 🔐",null,true],["Batch mín (kg) 🔐",null,true],
              ["Leadtime (d) 🔐","lead",true],["Peso/un (kg)",null,true],["Batch (un)",null,true],
            ].map(([lbl,col,right])=>(
              <Th key={lbl} right={right} style={{cursor:col?"pointer":"default",userSelect:"none",whiteSpace:"nowrap"}}
                onClick={col?()=>toggleOrdenM(col):undefined}>
                {lbl}{col?sortIconM(col):""}
              </Th>
            ))}
            <Th>Acum. demanda 🔐</Th><Th/>
          </tr></thead>
          <tbody>
            {arts.map((art,i)=>{
              const realIdx = maestro.indexOf(art);
              const pctObj  = (art.pctVUObj != null && art.pctVUObj > 0) ? art.pctVUObj : 0.20;
              const diasObj = (art.vidaUtil * pctObj).toFixed(1);
              const sc  = SECTOR_COLOR[art.sector]||{bg:"#f8fafc",color:"#64748b"};
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
                  {/* DESCRIPCIÓN */}
                  <Tv><span style={{color:C.text}}>{art.desc}</span></Tv>
                  {/* SECTOR */}
                  <Tv><span style={{background:sc.bg,color:sc.color,padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:600}}>{art.sector}</span></Tv>
                  {/* REVENTA */}
                  <Tv>{art.reventa?<span style={{background:"#eff6ff",color:"#1d4ed8",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:600}}>Reventa</span>:<span style={{color:C.muted,fontSize:10}}>Propio</span>}</Tv>
                  {/* SUBFAMILIA */}
                  <Tv dim><span style={{fontSize:10}}>{art.subfamilia||"—"}</span></Tv>
                  {/* PASTA */}
                  <Tv><span style={{color:C.accent,fontFamily:"monospace",fontSize:10}}>{art.pasta||"—"}</span></Tv>
                  {/* TIPO PLAN */}
                  <Tv>
                    {rol==="admin"?(
                      <select value={art.tipoPlan||"Stock"} onChange={e=>{const c=[...maestro];c[realIdx]={...c[realIdx],tipoPlan:e.target.value};setMaestro(c);}}
                        style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,padding:"2px 6px",borderRadius:4,fontSize:11,outline:"none"}}>
                        <option value="Stock">Stock</option><option value="Frescos">Frescos</option><option value="Feteados">Feteados</option><option value="Contra pedido">Contra pedido</option>
                      </select>
                    ):<span style={{
                      background:art.tipoPlan==="Frescos"?"#f0fdf4":art.tipoPlan==="Contra pedido"?"#fef3c7":art.tipoPlan==="Feteados"?"#f0f9ff":"#f8fafc",
                      color:art.tipoPlan==="Frescos"?"#15803d":art.tipoPlan==="Contra pedido"?"#92400e":art.tipoPlan==="Feteados"?"#0369a1":"#64748b",
                      padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:600}}>{art.tipoPlan||"Stock"}</span>}
                  </Tv>
                  {/* VACÍO */}
                  <Tv>{art.vacio?<span style={{color:C.ok.color,fontSize:10,fontWeight:600}}>Sí</span>:<span style={{color:C.muted,fontSize:10}}>No</span>}</Tv>
                  {/* VU — solo lectura SAP */}
                  <Tv right><span style={{color:C.textDim,fontSize:11}}>{art.vidaUtil}</span></Tv>
                  {/* TME — alerta si OBJ+SS > TME */}
                  {(()=>{
                    const objTotal=(art.objDias||Math.round(art.vidaUtil*0.20))+(art.segDias||0);
                    const alerta=art.tme>0&&objTotal>art.tme;
                    return <Tv right><span style={{color:alerta?"#b91c1c":C.textDim,fontWeight:alerta?700:400}}>{art.tme||"—"}{alerta?" ⚠":""}</span></Tv>;
                  })()}
                  {/* TER — editable */}
                  <Tv right>
                    {rol==="admin"
                      ?<Inp value={art.ter!=null?art.ter:(art.reventa?15:7)} width={48} onChange={v=>{const c=[...maestro];c[realIdx]={...c[realIdx],ter:Math.max(1,+v)};setMaestro(c);}}/>
                      :<span style={{color:C.textDim}}>{art.ter||(art.reventa?15:7)}</span>}
                  </Tv>
                  {/* SS — editable */}
                  <Tv right>
                    {rol==="admin"
                      ?<InpDec value={art.segDias||0} width={48} onChange={v=>{const c=[...maestro];c[realIdx]={...c[realIdx],segDias:Math.max(0,+v)};setMaestro(c);}}/>
                      :<span style={{color:C.textDim}}>{art.segDias||0}</span>}
                  </Tv>
                  {/* TER+SS vs TME (%) */}
                  {(()=>{
                    const ter=art.ter||(art.reventa?15:7);
                    const ss=art.segDias||0;
                    const total=ter+ss;
                    const pct=art.tme>0?Math.round(total/art.tme*100):null;
                    return <Tv right>{pct!=null?<span style={{color:pct>100?"#b91c1c":pct>80?"#d97706":C.ok.color,fontWeight:pct>100?700:400}}>{pct}%{pct>100?" ⚠":""}</span>:<span style={{color:C.muted}}>—</span>}</Tv>;
                  })()}
                  {/* Stk mín (leadtime + SS) */}
                  {(()=>{
                    const sMin=(art.leadTime||3)+(art.segDias||0);
                    return <Tv right dim><span style={{fontSize:11}}>{sMin}</span></Tv>;
                  })()}
                  {/* Stk máx (TME - SS) */}
                  {(()=>{
                    const ss=art.segDias||0;
                    const sMax=art.tme>0 ? art.tme : null;
                    const ter=art.ter||(art.reventa?15:7);
                    const sObj=ter+ss;
                    const alerta=art.tme>0&&sObj>art.tme;
                    return <Tv right>
                      {sMax!=null
                        ?<span style={{color:alerta?"#b91c1c":C.textDim}}>{sMax}{alerta?" ⚠":""}</span>
                        :<span style={{color:C.muted}}>—</span>}
                    </Tv>;
                  })()}
                  {/* BATCH, BATCH MIN, LEADTIME, PESO/UN, BATCH UN */}
                  <Tv right dim>{art.kgBatch.toLocaleString("es-UY")}</Tv>
                  <Tv right dim>{art.kgBatchMin.toLocaleString("es-UY")}</Tv>
                  <Tv right dim>{art.leadTime}</Tv>
                  <Tv right dim>{art.pesoUnitario||"—"}</Tv>
                  <Tv right dim>{art.unBatera||"—"}</Tv>
                  {/* ACUMULA DEMANDA */}
                  <Tv>{art.permiteArrastre===false?<span style={{color:C.muted,fontSize:10}}>No</span>:<span style={{color:C.ok.color,fontSize:10,fontWeight:600}}>Sí</span>}</Tv>
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
          <H2>Flujo del proceso de abastecimiento</H2>
          <P>El proceso tiene una cadencia semanal con dos reuniones de alineación fijas y un cierre de pedidos el lunes.</P>

          <H3>Jueves 13hs — Reunión Planificación + Planta</H3>
          <Tabla headers={["Quién","Qué"]} rows={[
            ["Planta","Informa producción elaborada pero no cerrada en SAP, producción en proceso y plan hasta fin de semana"],
            ["Planificación","Carga esa información en la herramienta (pedido pendiente S)"],
            ["Ambos","Revisan el borrador del plan S+1 y anticipan posibles ajustes"],
          ]}/>

          <H3>Viernes 8am — Cálculo y envío del pedido</H3>
          <Tabla headers={["Fuente","Dato","Cómo llega"]} rows={[
            ["SAP","Stock actual del CD","Manual (futuro: automático)"],
            ["SAP","Venta facturada acumulada","Manual (futuro: automático)"],
            ["SAP","Pedidos pendientes sin facturar","Manual (futuro: automático)"],
            ["SAP","Órdenes de compra abiertas (reventa)","Manual (futuro: automático)"],
            ["Comercial","Forecast S, S+1 y S+2","CSV importado en la herramienta"],
            ["Planificación","Genera el Pedido a Planta / Pedido de compra con cantidades sugeridas S+1","Exportado desde pestaña Pedido a Planta"],
          ]}/>

          <H3>Viernes 13hs — Reunión Planificación + Planta</H3>
          <Tabla headers={["Quién","Qué"]} rows={[
            ["Planificación","Presenta el pedido generado y el estado de stock proyectado S+1"],
            ["Planta","Confirma o ajusta el plan S+1 según capacidad, batches y lead times"],
            ["Planificación","Carga el plan confirmado en la herramienta (genera solicitud de traslado en SAP)"],
          ]}/>

          <H3>Lunes — Ajuste final de pedidos</H3>
          <Tabla headers={["Hora","Quién","Qué"]} rows={[
            ["Durante el día","Planificación / Planta","Ajustes finales si hay variaciones de último momento"],
            ["Fin del día","Planificación","Generación de solicitudes de traslado adicionales en SAP"],
          ]}/>

          <H3>Diario — Ajuste operativo</H3>
          <Tabla headers={["Momento","Quién","Qué"]} rows={[
            ["8:00hs","Planta","Corte para chorizos frescos (VU ≤ 12d). Se confirma o ajusta producción del día."],
            ["13:00hs","Planta","Corte para especiales y feteados (contra pedido)."],
          ]}/>
        </>}

        {false&&<>
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
          <Formula>Fcst pendiente = Fcst S − Venta facturada acum. − Pedidos pendientes</Formula>
          <P>→ Avance {">"} 120%: <Tag color="#1d4ed8" bg="#eff6ff">SOBREVENTA</Tag> &nbsp; → Avance {"<"} 40%: <Tag color="#b91c1c" bg="#fef2f2">SUBVENTA</Tag></P>
          <Formula>Venta total S = Fact. acum. + Pedidos pend. + max(0, Fcst pendiente)</Formula>

          <H3>Semana S — Pedido</H3>
          <Formula>Pedido total S = Pedido acumulado (SAP) + Pedido pendiente</Formula>

          <H3>Stock cierre S</H3>
          <Formula>Stock cierre S = Stock actual − max(0, Fcst pendiente) + Pedido pendiente S</Formula>

          <H3>Parámetros de abastecimiento (configurables en Maestro)</H3>
          <Formula>TER = Tiempo entre reposiciones (días)</Formula>
          <P>Default: 7 días producción propia / 15 días reventa</P>
          <Formula>SS = Stock de seguridad (días)</Formula>
          <P>Configurable por artículo. Acepta decimales (ej: 0,5 días).</P>
          <Formula>Demanda diaria = Fcst S+1 / 7</Formula>

          <H3>Umbrales de stock (en días y en kg)</H3>
          <Formula>
            Stock mínimo  = (Leadtime + SS) × demanda diaria  → punto de disparo de pedido{"\n"}
            Stock objetivo = (TER + SS) × demanda diaria       → nivel deseado al cierre de S+1{"\n"}
            Stock máximo  = TME × demanda diaria               → límite duro (no superar)
          </Formula>

          <H3>Pedido sugerido S+1</H3>
          <Formula>
            Necesidad = Fcst S+1 + Stock objetivo − Stock cierre S{"\n\n"}
            1. Redondear al batch completo hacia ARRIBA{"\n"}
            2. Si supera stock máximo → redondear batch completo hacia ABAJO{"\n"}
            {"   "}→ Si el resultado es menor al stock mínimo → usar batch mínimo{"\n\n"}
            ⚠ Alerta batch: si stock cierre S + batch mínimo {">"} stock máximo
          </Formula>
          <P>El pedido sugerido es la <strong>referencia calculada</strong>. El planner puede ajustarlo manualmente en la tabla.</P>

          <H3>Alertas de parámetros (en Maestro)</H3>
          <Formula>
            OBJ+SS vs TME (%) = (TER + SS) / TME × 100{"\n"}
            {"  "}→ {">"} 100%: los parámetros están mal configurados (TER o SS demasiado alto para el TME)
          </Formula>

          <H3>Stock cierre S+1</H3>
          <Formula>
            Stock cierre S+1 = max(0, Stock cierre S) − Fcst S+1 + Pedido S+1
          </Formula>

          <H3>Días de stock</H3>
          <Formula>
            Días de stock = (kg en stock / Fcst semanal) × 7{"\n"}
            {"  "}→ Si Fcst = 0: "Sin forecast"{"\n"}
            {"  "}→ Si stock {">"} 0 y Fcst = 0: "∞"
          </Formula>

          <H3>Acumula demanda S → S+1 (opcional)</H3>
          <Formula>
            Si el toggle está activo y el artículo tiene "Acumula demanda = Sí":{"\n"}
            Fcst S+1 efectivo = Fcst S+1 + max(0, Fcst pendiente S − max(0, Stock cierre S))
          </Formula>
        </>}

        {seccion==="politica"&&<>
          <H2>Alertas de stock</H2>
          <P>Los estados se calculan comparando los días de stock contra los parámetros de abastecimiento configurados en el Maestro (TER, SS, Leadtime, TME). Para Centenario, el TME equivale a la VU ya que el CD exige el 100% de VU restante al momento de la entrega.</P>
          <Tabla headers={["Estado","Color","Condición","Acción sugerida"]} rows={[
            [<Tag color="#6d28d9" bg="#f5f3ff">Riesgo Vto.</Tag>,"🟣 Violeta","Días de stock > Stock máximo (TME)","Frenar producción. Evaluar acciones comerciales."],
            [<Tag color="#1d4ed8" bg="#eff6ff">Sobrestock</Tag>,"🔵 Azul","Stock objetivo < días ≤ Stock máximo","Reducir o eliminar producción esta semana."],
            [<Tag color="#15803d" bg="#f0fdf4">OK</Tag>,"🟢 Verde","Stock mínimo ≤ días ≤ Stock objetivo","Pedido normal según sugerido."],
            [<Tag color="#ca8a04" bg="#fefce8">Substock</Tag>,"🟡 Amarillo","0 < días < Stock mínimo","Priorizar pedido. Revisar plan S+1."],
            [<Tag color="#b91c1c" bg="#fef2f2">Faltante</Tag>,"🔴 Rojo","Días de stock = 0","Pedido urgente. Alertar a Comercial."],
            [<Tag color="#94a3b8" bg="#f8fafc">Sin forecast</Tag>,"⚪ Gris","Fcst = 0","Verificar con Comercial si el artículo sigue activo."],
          ]}/>
          <Formula>
            Stock mínimo  = (Leadtime + SS) × demanda diaria{"\n"}
            Stock objetivo = (TER + SS) × demanda diaria{"\n"}
            Stock máximo  = TME × demanda diaria
          </Formula>
          <P>Los umbrales de la política se configuran en <strong>Maestro → Alertas de stock</strong> (solo Admin).</P>
        </>}

        {seccion==="cargas"&&<>
          <H2>Carga de datos</H2>
          <P>Todos los archivos usan <strong>punto y coma (;)</strong> como separador. La primera fila es el encabezado. Los números usan coma decimal.</P>

          <Tabla headers={["Fuente","Formato CSV","Notas"]} rows={[
            ["Stock","SKU;Stock_kg","Stock disponible en CD"],
            ["Venta acumulada","SKU;Venta_acum_kg","Facturado acumulado a la fecha"],
            ["Pedidos pendientes","SKU;Pedidos_pend_kg","Confirmados sin facturar"],
            ["Producción propia","SKU;Prod_pend_S;Prod_S+1","Pedido pendiente S y confirmado S+1"],
            ["Órdenes de compra","SKU;Cantidad_pendiente","Solo artículos de reventa"],
            ["Forecast","SKU;S_actual;S+1;S+2","Tres semanas en un archivo"],
          ]}/>

          <H3>SKUs no encontrados</H3>
          <P>Si un SKU del archivo no está en el Maestro, sus datos no se cargan y aparece en la lista de "no encontrados". Podés descargar esa lista en CSV para gestionarla.</P>

          <H3>Sesión</H3>
          <P>Usá <strong>💾 Guardar sesión</strong> antes de cerrar la app para guardar todos los datos cargados (maestro, datos operativos, configuración) en un archivo JSON. Al volver, usá <strong>📂 Cargar sesión</strong> para restaurar todo el estado.</P>
        </>}

        {seccion==="maestro"&&<>
          <H2>Maestro de artículos</H2>
          <Tabla headers={["Rol","Puede hacer"]} rows={[
            ["🔐 Admin","Ver todo, editar TER/SS/Tipo plan, agregar y eliminar artículos, modificar alertas de stock"],
            ["👤 User","Ver todos los datos y exportar CSV. No puede modificar parámetros."],
          ]}/>

          <H3>Campos de SAP — solo lectura</H3>
          <Tabla headers={["Campo","Descripción"]} rows={[
            ["SKU","Código del artículo en SAP"],
            ["Descripción / Sector / Pasta / Familia / Subfamilia","Datos descriptivos"],
            ["Vida útil (días)","VU total desde elaboración — define umbrales de alerta"],
            ["TME (días)","Tiempo mínimo de entrega exigido por el cliente — define stock máximo"],
            ["Leadtime (días)","Días entre pedido y disponibilidad — define stock mínimo"],
            ["Batch (kg) / Batch mín (kg)","Tamaños de lote de producción — definen el redondeo del pedido sugerido"],
            ["Peso/un (kg) / Batch (un)","Datos informativos de presentación"],
            ["Vacío","Si el producto se envasa al vacío"],
            ["Reventa","Si el producto es de terceros (no producción propia)"],
          ]}/>

          <H3>Parámetros configurables en la app</H3>
          <Tabla headers={["Campo","Descripción","Default"]} rows={[
            ["TER (días)","Tiempo entre reposiciones — define stock objetivo","7d producción / 15d reventa"],
            ["SS (días)","Stock de seguridad — acepta decimales (ej: 0,5)","0d producción / 7d reventa"],
            ["Tipo de plan","Stock / Frescos / Feteados / Contra pedido — define el tipo de planificación","Stock"],
          ]}/>

          <H3>Alertas en el Maestro</H3>
          <P><strong>OBJ+SS vs TME (%)</strong> = (TER + SS) / TME × 100. Si supera el 100% significa que los parámetros TER y/o SS son demasiado altos para el TME configurado — hay que bajarlos o revisar el TME con SAP.</P>
          <P><strong>Stk mín</strong> = leadtime + SS días. <strong>Stk máx</strong> = TME días. Ambos se muestran en la tabla como referencia.</P>
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
      onCargar: mkCargar(setStockActual,"stock"),
      onLimpiar: ()=>{ setStockActual({}); registrarLog("stock",{ok:0,noMatch:0,err:0,skusNoMatch:[]}); } },
    { id:"ventaAcum",   label:"Venta acumulada",   icono:"💰", color:"#0891b2",
      desc:"SKU · kg facturados acumulados a la fecha",
      plantilla:"SKU;Venta_acum_kg\n"+maestro.map(a=>`${a.sku};0`).join("\n"),
      onCargar: mkCargar(setVentaAcum,"ventaAcum"),
      onLimpiar: ()=>{ setVentaAcum({}); registrarLog("ventaAcum",{ok:0,noMatch:0,err:0,skusNoMatch:[]}); } },
    { id:"pedidosPend", label:"Pedidos pendientes", icono:"📋", color:"#0369a1",
      desc:"SKU · kg en pedidos confirmados sin facturar",
      plantilla:"SKU;Pedidos_pend_kg\n"+maestro.map(a=>`${a.sku};0`).join("\n"),
      onCargar: mkCargar(setPedidosPend,"pedidosPend"),
      onLimpiar: ()=>{ setPedidosPend({}); registrarLog("pedidosPend",{ok:0,noMatch:0,err:0,skusNoMatch:[]}); } },
    { id:"produccion",  label:"Producción (propia)",  icono:"🏭", color:"#7c3aed",
      desc:"SKU · Prod acum · Prod pendiente S — artículos de producción propia",
      plantilla:"SKU;Prod_pend_S;Prod_S+1\n"+maestro.filter(a=>!a.reventa).map(a=>`${a.sku};0;0`).join("\n"),
      onCargar: cargarProd,
      onLimpiar: ()=>{ setProdAcum({}); setProdPend({}); registrarLog("produccion",{ok:0,noMatch:0,err:0,skusNoMatch:[]}); } },
    { id:"ordenes",     label:"Órdenes de compra abiertas", icono:"🛒", color:"#0891b2",
      desc:"SKU · Cantidad pendiente — artículos de reventa con OC abierta",
      plantilla:"SKU;Cantidad_pendiente\n"+maestro.filter(a=>a.reventa).map(a=>`${a.sku};0`).join("\n"),
      onCargar: (rows)=>{
        let ok=0, noMatch=0; const skusNoMatch=[];
        const pend={};
        rows.forEach(r=>{
          if (r.length<2) return;
          const sku=r[0]?.trim();
          if (!sku||sku.toLowerCase()==="sku") return;
          pend[sku]=parseKg(r[1]);
          if (skuSet.has(sku)) ok++; else { noMatch++; skusNoMatch.push(sku); }
        });
        setProdPend(p=>({...p,...pend}));
        const res={ok,noMatch,err:0,skusNoMatch};
        registrarLog("ordenes",res);
        return res;
      },
      onLimpiar: ()=>{ 
        // Solo limpia SKUs de reventa
        setProdPend(prev=>{
          const next={...prev};
          maestro.filter(a=>a.reventa).forEach(a=>delete next[a.sku]);
          return next;
        });
        registrarLog("ordenes",{ok:0,noMatch:0,err:0,skusNoMatch:[]});
      }},
    { id:"forecast",    label:"Forecast",           icono:"📊", color:"#2563eb",
      desc:"SKU · Fcst S · Fcst S+1 · Fcst S+2",
      plantilla:"SKU;S_actual;S+1;S+2\n"+maestro.map(a=>`${a.sku};0;0;0`).join("\n"),
      onCargar: cargarFcst,
      onLimpiar: ()=>{ setFcstActual({}); setFcstS2({}); setFcstS3({}); registrarLog("forecast",{ok:0,noMatch:0,err:0,skusNoMatch:[]}); } },
  ];

  function limpiarTodo() {
    if (!window.confirm("¿Limpiar todos los datos cargados? Esto no afecta el maestro de artículos.")) return;
    setStockActual({}); setVentaAcum({}); setPedidosPend({});
    setProdAcum({}); setProdPend({});
    setFcstActual({}); setFcstS2({}); setFcstS3({});
    FUENTES.forEach(f=>registrarLog(f.id,{ok:0,noMatch:0,err:0,skusNoMatch:[]}));
  }

  return (
    <div>
      {/* ── ESTADO DE CARGAS ── */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
        padding:"16px 20px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          Estado de cargas
          <button onClick={limpiarTodo}
            style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#b91c1c",
              padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
            🗑 Limpiar todo
          </button>
        </div>
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
                  {log&&(
                    <button onClick={()=>{
                      if(window.confirm(`¿Limpiar datos de ${f.label}?`)) f.onLimpiar();
                    }}
                      style={{background:"none",border:"1px solid #fecaca",color:"#b91c1c",
                        padding:"2px 8px",borderRadius:4,cursor:"pointer",fontSize:10}}>
                      🗑
                    </button>
                  )}
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
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>descargarCSV(
                  `skus_no_encontrados_${verDetalle}.csv`,
                  "SKU\n"+logs[verDetalle].skusNoMatch.join("\n"))}
                  style={{background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",
                    padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontWeight:600}}>
                  ↓ Descargar lista
                </button>
                <button onClick={()=>setVerDetalle(null)}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>×</button>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10,maxHeight:120,overflowY:"auto"}}>
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
  const LOG_INI = { stock:null, ventaAcum:null, pedidosPend:null, produccion:null, ordenes:null, forecast:null };
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
      version: 2,
      fecha: new Date().toISOString(),
      maestro, politica, logs,
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
        if (s.logs)        setLogs(s.logs);
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
            Planificación de Abastecimiento
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>
            {maestro.length} artículos · {(() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 1);
              const wk = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
              return `Semana S${wk}/${now.getFullYear()}`;
            })()}
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

// energy-ring-card: Räume als Kreisdiagramme, Geräte im Kreis, Mitte = Netz oder Raumsumme.
// Keine Abhängigkeiten. Ablage: /config/www/energy-ring-card.js
// Ressource: Einstellungen -> Dashboards -> Ressourcen -> /local/energy-ring-card.js (Typ: Modul)

const SVG_NS = "http://www.w3.org/2000/svg";
const VB = 400;          // Breite einer Raum-Zelle
const C = VB / 2;        // Mittelpunkt in X
const TITLE_H = 28;      // Höhe für den Raumtitel
const CELL_H = VB + TITLE_H;
const RING = 130;        // Radius der Geräte-Kreise
const NODE_R = 32;       // Radius der Geräte-Kreise
const CENTER_R = 52;     // Radius des Mittelkreises
const FLOW_MIN_W = 5;    // darunter keine Animation
let flowSeq = 0;         // eindeutige IDs für die Linienpfade

function el(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

// Leistungswert mit Einheit. W/kW werden auf W umgerechnet, andere Einheiten (z. B. m³) bleiben wie sie sind.
function readPower(hass, entityId) {
  const s = hass.states[entityId];
  if (!s || s.state === "unavailable" || s.state === "unknown") return null;
  const v = parseFloat(s.state);
  if (Number.isNaN(v)) return null;
  const raw = s.attributes.unit_of_measurement || "";
  const lu = raw.toLowerCase();
  if (lu === "kw") return { v: v * 1000, unit: "W" };
  if (lu === "w" || lu === "") return { v, unit: "W" };
  return { v, unit: raw };
}

const ICON_PATHS = {
 "mdi:car-electric": "M18.92 2C18.72 1.42 18.16 1 17.5 1H6.5C5.84 1 5.29 1.42 5.08 2L3 8V16C3 16.55 3.45 17 4 17H5C5.55 17 6 16.55 6 16V15H18V16C18 16.55 18.45 17 19 17H20C20.55 17 21 16.55 21 16V8L18.92 2M6.5 12C5.67 12 5 11.33 5 10.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12M17.5 12C16.67 12 16 11.33 16 10.5S16.67 9 17.5 9 19 9.67 19 10.5 18.33 12 17.5 12M5 7L6.5 2.5H17.5L19 7H5M7 20H11V18L17 21H13V23L7 20Z",
 "mdi:flash": "M7,2V13H10V22L17,10H13L17,2H7Z",
 "mdi:sofa": "M12.5 7C12.5 5.89 13.39 5 14.5 5H18C19.1 5 20 5.9 20 7V9.16C18.84 9.57 18 10.67 18 11.97V14H12.5V7M6 11.96V14H11.5V7C11.5 5.89 10.61 5 9.5 5H6C4.9 5 4 5.9 4 7V9.15C5.16 9.56 6 10.67 6 11.96M20.66 10.03C19.68 10.19 19 11.12 19 12.12V15H5V12C5 10.9 4.11 10 3 10S1 10.9 1 12V17C1 18.1 1.9 19 3 19V21H5V19H19V21H21V19C22.1 19 23 18.1 23 17V12C23 10.79 21.91 9.82 20.66 10.03Z",
 "mdi:ceiling-light": "M8,9H11V4H13V9H16L20,17H4L8,9M14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18H14Z",
 "mdi:chef-hat": "M12.5,1.5C10.73,1.5 9.17,2.67 8.67,4.37C8.14,4.13 7.58,4 7,4A4,4 0 0,0 3,8C3,9.82 4.24,11.41 6,11.87V19H19V11.87C20.76,11.41 22,9.82 22,8A4,4 0 0,0 18,4C17.42,4 16.86,4.13 16.33,4.37C15.83,2.67 14.27,1.5 12.5,1.5M12,10.5H13V17.5H12V10.5M9,12.5H10V17.5H9V12.5M15,12.5H16V17.5H15V12.5M6,20V21A1,1 0 0,0 7,22H18A1,1 0 0,0 19,21V20H6Z",
 "mdi:tumble-dryer": "M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8M8.11,10.5H10C9.76,11.88 10,12.67 10.58,13.29C11.68,14.36 12.16,15.71 11.89,17.5H10C10.24,16.12 10,15.33 9.42,14.71C8.32,13.64 7.85,12.29 8.11,10.5M12.11,10.5H14C13.76,11.88 14,12.67 14.58,13.29C15.68,14.36 16.16,15.71 15.89,17.5H14C14.24,16.12 14,15.33 13.42,14.71C12.32,13.64 11.85,12.29 12.11,10.5Z",
 "mdi:water-pump": "M19,14.5C19,14.5 21,16.67 21,18A2,2 0 0,1 19,20A2,2 0 0,1 17,18C17,16.67 19,14.5 19,14.5M5,18V9A2,2 0 0,1 3,7A2,2 0 0,1 5,5V4A2,2 0 0,1 7,2H9A2,2 0 0,1 11,4V5H19A2,2 0 0,1 21,7V9L21,11A1,1 0 0,1 22,12A1,1 0 0,1 21,13H17A1,1 0 0,1 16,12A1,1 0 0,1 17,11V9H11V18H12A2,2 0 0,1 14,20V22H2V20A2,2 0 0,1 4,18H5Z",
 "mdi:fire": "M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z",
 "mdi:human-child": "M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2M11,22H8V16H6V9H18V16H16V22H13V18H11V22Z",
 "mdi:teddy-bear": "M15.75 19.13C14.92 19.13 14.25 18.29 14.25 17.25C14.25 16.22 14.92 15.38 15.75 15.38C16.58 15.38 17.25 16.22 17.25 17.25C17.25 18.29 16.58 19.13 15.75 19.13M12 11.25C10.76 11.25 9.75 10.41 9.75 9.38C9.75 8.34 10.76 7.5 12 7.5C13.24 7.5 14.25 8.34 14.25 9.38C14.25 10.41 13.24 11.25 12 11.25M8.25 19.13C7.42 19.13 6.75 18.29 6.75 17.25C6.75 16.22 7.42 15.38 8.25 15.38C9.08 15.38 9.75 16.22 9.75 17.25C9.75 18.29 9.08 19.13 8.25 19.13M12 8.25C12.41 8.25 12.75 8.59 12.75 9C12.75 9.41 12.41 9.75 12 9.75C11.59 9.75 11.25 9.41 11.25 9C11.25 8.59 11.59 8.25 12 8.25M18.75 12C18.43 12 18.12 12.07 17.84 12.2C17.36 11.59 16.71 11.07 15.93 10.67C16.5 9.87 16.84 8.9 16.84 7.85C16.84 7.83 16.84 7.81 16.84 7.79C17.93 7.56 18.75 6.59 18.75 5.42C18.75 4.09 17.66 3 16.33 3C15.64 3 15 3.29 14.58 3.75C13.83 3.28 12.95 3 12 3C11.05 3 10.16 3.28 9.42 3.75C9 3.29 8.36 3 7.67 3C6.34 3 5.25 4.09 5.25 5.42C5.25 6.58 6.07 7.55 7.15 7.79C7.15 7.81 7.15 7.83 7.15 7.85C7.15 8.9 7.5 9.88 8.06 10.67C7.29 11.07 6.64 11.59 6.16 12.2C5.88 12.07 5.57 12 5.25 12C4 12 3 13 3 14.25C3 15.5 4 16.5 5.25 16.5C5.27 16.5 5.29 16.5 5.31 16.5C5.27 16.74 5.25 17 5.25 17.25C5.25 19.32 6.59 21 8.25 21C9.26 21 10.15 20.37 10.7 19.41C11.12 19.47 11.55 19.5 12 19.5C12.45 19.5 12.88 19.47 13.3 19.41C13.85 20.37 14.74 21 15.75 21C17.41 21 18.75 19.32 18.75 17.25C18.75 17 18.73 16.74 18.69 16.5C18.71 16.5 18.73 16.5 18.75 16.5C20 16.5 21 15.5 21 14.25C21 13 20 12 18.75 12",
 "mdi:string-lights": "M22.56 11.39C22.36 10.59 21.82 9.85 21.05 9.44L20.63 7.74C21.11 7.58 21.57 7.41 22 7.23V5C20 6.07 16.53 7.03 12 7.03S4 6.07 2 5V7.23C2.43 7.41 2.89 7.58 3.37 7.74L2.95 9.44C2.18 9.85 1.64 10.59 1.44 11.39C.905 13.57 .385 17.31 2.92 17.93C4 18.2 6 17.89 7.27 12.82C7.46 12 7.33 11.12 6.84 10.39L7.26 8.67C8.14 8.81 9.05 8.9 10 8.96V10.74C9.35 11.33 9 12.17 9 13C9 15.24 9.39 19 12 19C13.12 19 15 18.22 15 13C15 12.17 14.65 11.33 14 10.74V8.96C14.95 8.9 15.86 8.81 16.74 8.67L17.16 10.39C16.67 11.12 16.54 12 16.73 12.82C18 17.89 20 18.2 21.08 17.93C23.61 17.31 23.09 13.57 22.56 11.39M5.81 12.47C5.81 12.47 4.74 16.84 3.28 16.5C1.82 16.12 2.9 11.75 2.9 11.75S3.26 10.29 4.71 10.65 5.81 12.47 5.81 12.47M12 17.5C10.5 17.5 10.5 13 10.5 13S10.5 11.5 12 11.5 13.5 13 13.5 13 13.5 17.5 12 17.5M20.72 16.5C19.27 16.84 18.19 12.47 18.19 12.47S17.83 11 19.29 10.65 21.1 11.75 21.1 11.75 22.18 16.12 20.72 16.5Z",
 "mdi:lightbulb": "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
 "mdi:cup-water": "M18.32,8H5.67L5.23,4H18.77M12,19A3,3 0 0,1 9,16C9,14 12,10.6 12,10.6C12,10.6 15,14 15,16A3,3 0 0,1 12,19M3,2L5,20.23C5.13,21.23 5.97,22 7,22H17C18,22 18.87,21.23 19,20.23L21,2H3Z",
 "mdi:power-plug": "M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z",
 "mdi:fridge": "M7,2H17A2,2 0 0,1 19,4V9H5V4A2,2 0 0,1 7,2M19,19A2,2 0 0,1 17,21V22H15V21H9V22H7V21A2,2 0 0,1 5,19V10H19V19M8,5V7H10V5H8M8,12V15H10V12H8Z",
 "mdi:washing-machine": "M14.83,11.17C16.39,12.73 16.39,15.27 14.83,16.83C13.27,18.39 10.73,18.39 9.17,16.83L14.83,11.17M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8Z",
 "mdi:dishwasher": "M18,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V4A2,2 0 0,0 18,2M10,4A1,1 0 0,1 11,5A1,1 0 0,1 10,6A1,1 0 0,1 9,5A1,1 0 0,1 10,4M7,4A1,1 0 0,1 8,5A1,1 0 0,1 7,6A1,1 0 0,1 6,5A1,1 0 0,1 7,4M18,20H6V8H18V20M14.67,15.33C14.69,16.03 14.41,16.71 13.91,17.21C12.86,18.26 11.15,18.27 10.09,17.21C9.59,16.71 9.31,16.03 9.33,15.33C9.4,14.62 9.63,13.94 10,13.33C10.37,12.5 10.81,11.73 11.33,11L12,10C13.79,12.59 14.67,14.36 14.67,15.33",
 "mdi:stove": "M6,14H8L11,17H9L6,14M4,4H5V3A1,1 0 0,1 6,2H10A1,1 0 0,1 11,3V4H13V3A1,1 0 0,1 14,2H18A1,1 0 0,1 19,3V4H20A2,2 0 0,1 22,6V19A2,2 0 0,1 20,21V22H17V21H7V22H4V21A2,2 0 0,1 2,19V6A2,2 0 0,1 4,4M18,7A1,1 0 0,1 19,8A1,1 0 0,1 18,9A1,1 0 0,1 17,8A1,1 0 0,1 18,7M14,7A1,1 0 0,1 15,8A1,1 0 0,1 14,9A1,1 0 0,1 13,8A1,1 0 0,1 14,7M20,6H4V10H20V6M4,19H20V12H4V19M6,7A1,1 0 0,1 7,8A1,1 0 0,1 6,9A1,1 0 0,1 5,8A1,1 0 0,1 6,7M13,14H15L18,17H16L13,14Z",
 "mdi:television": "M21,17H3V5H21M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5A2,2 0 0,0 21,3Z",
 "mdi:lamp": "M8,2H16L20,14H4L8,2M11,15H13V20H18V22H6V20H11V15Z",
 "mdi:floor-lamp": "M15,2L17,9H7L9,2M11,10H13V20H16V22H8V20H11V10Z",
 "mdi:bed": "M19,7H11V14H3V5H1V20H3V17H21V20H23V11A4,4 0 0,0 19,7M7,13A3,3 0 0,0 10,10A3,3 0 0,0 7,7A3,3 0 0,0 4,10A3,3 0 0,0 7,13Z",
 "mdi:toilet": "M9,22H17V19.5C19.41,17.87 21,15.12 21,12V4A2,2 0 0,0 19,2H15C13.89,2 13,2.9 13,4V12H3C3,15.09 5,18 9,19.5V22M5.29,14H18.71C18.14,15.91 16.77,17.5 15,18.33V20H11V18.33C9,18 5.86,15.91 5.29,14M15,4H19V12H15V4M16,5V8H18V5H16Z",
 "mdi:shower": "M21,14V15C21,16.91 19.93,18.57 18.35,19.41L19,22H17L16.5,20C16.33,20 16.17,20 16,20H8C7.83,20 7.67,20 7.5,20L7,22H5L5.65,19.41C4.07,18.57 3,16.91 3,15V14H2V12H20V5A1,1 0 0,0 19,4C18.5,4 18.12,4.34 18,4.79C18.63,5.33 19,6.13 19,7H13A3,3 0 0,1 16,4C16.06,4 16.11,4 16.17,4C16.58,2.84 17.69,2 19,2A3,3 0 0,1 22,5V14H21V14M19,14H5V15A3,3 0 0,0 8,18H16A3,3 0 0,0 19,15V14Z",
 "mdi:bathtub": "M7 5C8.11 5 9 5.9 9 7S8.11 9 7 9 5 8.11 5 7 5.9 5 7 5M20 13V4.83C20 3.27 18.73 2 17.17 2C16.42 2 15.7 2.3 15.17 2.83L13.92 4.08C13.76 4.03 13.59 4 13.41 4C13 4 12.64 4.12 12.33 4.32L15.09 7.08C15.29 6.77 15.41 6.4 15.41 6C15.41 5.82 15.38 5.66 15.34 5.5L16.59 4.24C16.74 4.09 16.95 4 17.17 4C17.63 4 18 4.37 18 4.83V13H11.15C10.85 12.79 10.58 12.55 10.33 12.28L8.93 10.73C8.74 10.5 8.5 10.35 8.24 10.23C7.93 10.08 7.59 10 7.24 10C6 10 5 11 5 12.25V13H2V19C2 20.1 2.9 21 4 21C4 21.55 4.45 22 5 22H19C19.55 22 20 21.55 20 21C21.1 21 22 20.1 22 19V13H20Z",
 "mdi:thermometer": "M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",
 "mdi:car": "M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",
 "mdi:garage": "M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z",
 "mdi:kettle": "M12.5,3C7.81,3 4,5.69 4,9V9C4,10.19 4.5,11.34 5.44,12.33C4.53,13.5 4,14.96 4,16.5C4,17.64 4,18.83 4,20C4,21.11 4.89,22 6,22H19C20.11,22 21,21.11 21,20C21,18.85 21,17.61 21,16.5C21,15.28 20.66,14.07 20,13L22,11L19,8L16.9,10.1C15.58,9.38 14.05,9 12.5,9C10.65,9 8.95,9.53 7.55,10.41C7.19,9.97 7,9.5 7,9C7,7.21 9.46,5.75 12.5,5.75V5.75C13.93,5.75 15.3,6.08 16.33,6.67L18.35,4.65C16.77,3.59 14.68,3 12.5,3M12.5,11C12.84,11 13.17,11.04 13.5,11.09C10.39,11.57 8,14.25 8,17.5V20H6V17.5A6.5,6.5 0 0,1 12.5,11Z",
 "mdi:desk-lamp": "M10.85,2L9.18,4.5L10.32,5.25L7.14,10C7.1,10 7.05,10 7,10A2,2 0 0,0 5,12C5,12.94 5.66,13.75 6.58,13.95L10.62,20H7V22H17V20H13L8.53,13.28C8.83,12.92 9,12.47 9,12C9,11.7 8.93,11.4 8.8,11.13L12,6.37C11.78,8.05 12.75,9.89 14.45,11L18.89,4.37C17.2,3.24 15.12,3.04 13.65,3.87L10.85,2M18.33,7L16.67,9.5C17.35,9.95 18.29,9.77 18.75,9.08C19.21,8.39 19,7.46 18.33,7Z",
 "mdi:light-recessed": "M12 7C6.5 7 2 9.46 2 12.5S6.5 18 12 18 22 15.54 22 12.5 17.5 7 12 7M16.5 10C16.5 10.4 14.9 11.54 12 11.54S7.5 10.4 7.5 10C7.5 9.91 7.65 9.74 7.9 9.55C9.06 9.21 10.44 9 12 9S14.94 9.21 16.1 9.55C16.35 9.74 16.5 9.91 16.5 10M12 16C7.12 16 4 13.93 4 12.5C4 11.81 4.73 11 6.03 10.29C6.3 11.83 8.87 13.04 12 13.04C15.13 13.04 17.7 11.83 17.97 10.29C19.27 11 20 11.81 20 12.5C20 13.93 16.88 16 12 16Z",
 "mdi:led-strip": "M2.81,8.46L14.83,20.5L15.54,19.78L16.95,21.19L18.36,19.78L16.95,18.36L18.36,16.95L19.78,18.36L21.19,16.95L19.78,15.54L20.5,14.83L8.46,2.81L2.81,8.46M5.64,8.46L8.46,5.64L17.66,14.83L14.83,17.66L5.64,8.46M7.05,8.46L8.46,9.88L9.88,8.46L8.46,7.05L7.05,8.46M9.17,10.59L10.59,12L12,10.59L10.59,9.17L9.17,10.59M11.29,12.71L12.71,14.12L14.12,12.71L12.71,11.29L11.29,12.71M13.41,14.83L14.83,16.24L16.24,14.83L14.83,13.41L13.41,14.83Z",
 "mdi:home-lightning-bolt": "M12 3L2 12H5V20H19V12H22L12 3M11.5 18V14H9L12.5 7V11H15L11.5 18Z",
 "mdi:coffee-maker": "M18 6V4H20V2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H20V20H15.97C17.2 19.09 18 17.64 18 16V11H8V16C8 17.64 8.81 19.09 10.03 20H6V4H8V6C8 6.55 8.45 7 9 7H17C17.55 7 18 6.55 18 6M13 8C13.55 8 14 8.45 14 9S13.55 10 13 10 12 9.55 12 9 12.45 8 13 8Z",
 "mdi:monitor": "M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z",
 "mdi:laptop": "M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z",
 "mdi:printer": "M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z",
 "mdi:flower": "M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",
 "mdi:pool": "M2,15C3.67,14.25 5.33,13.5 7,13.17V5A3,3 0 0,1 10,2C11.31,2 12.42,2.83 12.83,4H10A1,1 0 0,0 9,5V6H14V5A3,3 0 0,1 17,2C18.31,2 19.42,2.83 19.83,4H17A1,1 0 0,0 16,5V14.94C18,14.62 20,13 22,13V15C19.78,15 17.56,17 15.33,17C13.11,17 10.89,15 8.67,15C6.44,15 4.22,16 2,17V15M14,8H9V10H14V8M14,12H9V13C10.67,13.16 12.33,14.31 14,14.79V12M2,19C4.22,18 6.44,17 8.67,17C10.89,17 13.11,19 15.33,19C17.56,19 19.78,17 22,17V19C19.78,19 17.56,21 15.33,21C13.11,21 10.89,19 8.67,19C6.44,19 4.22,20 2,21V19Z",
 "mdi:air-conditioner": "M6.59,0.66C8.93,-1.15 11.47,1.06 12.04,4.5C12.47,4.5 12.89,4.62 13.27,4.84C13.79,4.24 14.25,3.42 14.07,2.5C13.65,0.35 16.06,-1.39 18.35,1.58C20.16,3.92 17.95,6.46 14.5,7.03C14.5,7.46 14.39,7.89 14.16,8.27C14.76,8.78 15.58,9.24 16.5,9.06C18.63,8.64 20.38,11.04 17.41,13.34C15.07,15.15 12.53,12.94 11.96,9.5C11.53,9.5 11.11,9.37 10.74,9.15C10.22,9.75 9.75,10.58 9.93,11.5C10.35,13.64 7.94,15.39 5.65,12.42C3.83,10.07 6.05,7.53 9.5,6.97C9.5,6.54 9.63,6.12 9.85,5.74C9.25,5.23 8.43,4.76 7.5,4.94C5.37,5.36 3.62,2.96 6.59,0.66M5,16H7A2,2 0 0,1 9,18V24H7V22H5V24H3V18A2,2 0 0,1 5,16M5,18V20H7V18H5M12.93,16H15L12.07,24H10L12.93,16M18,16H21V18H18V22H21V24H18A2,2 0 0,1 16,22V18A2,2 0 0,1 18,16Z",
 "mdi:thermostat": "M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",
 "mdi:sun-wireless": "M11 6C13.76 6 16 8.24 16 11S13.76 16 11 16 6 13.76 6 11 8.24 6 11 6M11 1L13.39 4.42C12.65 4.15 11.84 4 11 4S9.35 4.15 8.61 4.42L11 1M2.34 6L6.5 5.65C5.9 6.16 5.36 6.78 4.94 7.5C4.5 8.24 4.25 9 4.11 9.79L2.34 6M2.36 16L4.12 12.23C4.26 13 4.53 13.78 4.95 14.5C5.37 15.24 5.91 15.86 6.5 16.37L2.36 16M19.65 6L17.88 9.79C17.74 9 17.47 8.23 17.05 7.5C16.63 6.78 16.1 6.15 15.5 5.64L19.65 6M23 13H21C21 15.05 20.22 17.1 18.66 18.66C17.09 20.23 15.05 21 13 21V23C15.56 23 18.12 22 20.07 20.07S23 15.56 23 13M19 13H17C17 14 16.61 15.05 15.83 15.83C15.05 16.61 14 17 13 17V19C14.54 19 16.08 18.41 17.25 17.24C18.41 16.08 19 14.54 19 13",
 "mdi:solar-panel": "M4,2H20A2,2 0 0,1 22,4V14A2,2 0 0,1 20,16H15V20H18V22H13V16H11V22H6V20H9V16H4A2,2 0 0,1 2,14V4A2,2 0 0,1 4,2M4,4V8H11V4H4M4,14H11V10H4V14M20,14V10H13V14H20M20,4H13V8H20V4Z",
 "mdi:battery": "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
 "mdi:ev-station": "M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z",
 "mdi:dresser": "M4 3C2.9 3 2 3.9 2 5V8H22V5C22 3.9 21.11 3 20 3H4M10 5H14V6H10V5M2 9V14H22V9H2M10 11H14V12H10V11M2 15V18C2 19.11 2.9 20 4 20V21H6V20H18V21H20V20C21.11 20 22 19.11 22 18V15H2M10 17H14V18H10V17Z",
 "mdi:hanger": "M12 4A3.5 3.5 0 0 0 8.5 7.5H10.5A1.5 1.5 0 0 1 12 6A1.5 1.5 0 0 1 13.5 7.5A1.5 1.5 0 0 1 12 9C11.45 9 11 9.45 11 10V11.75L2.4 18.2A1 1 0 0 0 3 20H21A1 1 0 0 0 21.6 18.2L13 11.75V10.85A3.5 3.5 0 0 0 15.5 7.5A3.5 3.5 0 0 0 12 4M12 13.5L18 18H6Z",
 "mdi:door": "M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
 "mdi:window-closed": "M6,11H10V9H14V11H18V4H6V11M18,13H6V20H18V13M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",
 "mdi:cctv": "M6.03 12.03L8.03 15.5L5.5 18.68L2 12.62L6.03 12.03M17 18V15.29C17.88 14.9 18.5 14.03 18.5 13C18.5 12.43 18.3 11.9 17.97 11.5L19.94 10.35C20.95 9.76 21.3 8.47 20.71 7.46L19.33 5.06C18.74 4.05 17.45 3.7 16.44 4.28L8.31 9C7.36 9.53 7.03 10.75 7.58 11.71L9.08 14.31C9.63 15.26 10.86 15.59 11.81 15.04L13.69 13.96C13.94 14.55 14.41 15.03 15 15.29V18C15 19.1 15.9 20 17 20H22V18H17Z",
 "mdi:robot-vacuum": "M12,2C14.65,2 17.19,3.06 19.07,4.93L17.65,6.35C16.15,4.85 14.12,4 12,4C9.88,4 7.84,4.84 6.35,6.35L4.93,4.93C6.81,3.06 9.35,2 12,2M3.66,6.5L5.11,7.94C4.39,9.17 4,10.57 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,10.57 19.61,9.17 18.88,7.94L20.34,6.5C21.42,8.12 22,10.04 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12C2,10.04 2.58,8.12 3.66,6.5M12,6A6,6 0 0,1 18,12C18,13.59 17.37,15.12 16.24,16.24L14.83,14.83C14.08,15.58 13.06,16 12,16C10.94,16 9.92,15.58 9.17,14.83L7.76,16.24C6.63,15.12 6,13.59 6,12A6,6 0 0,1 12,6M12,8A1,1 0 0,0 11,9A1,1 0 0,0 12,10A1,1 0 0,0 13,9A1,1 0 0,0 12,8Z",
 "mdi:fan": "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
 "mdi:heat-pump": "M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M12.75 7.08C13.57 7.2 14.32 7.5 14.95 8L12.75 10.19V7.08M11.25 7.08V10.19L9.05 8C9.68 7.5 10.43 7.2 11.25 7.08M8 9.05L10.19 11.25H7.08C7.2 10.43 7.5 9.68 8 9.05M7.08 12.75H10.19L8 14.95C7.5 14.32 7.2 13.57 7.08 12.75M11.25 16.92C10.43 16.8 9.68 16.5 9.05 16L11.25 13.81V16.92M12 13C11.45 13 11 12.55 11 12S11.45 11 12 11 13 11.45 13 12 12.55 13 12 13M12.75 16.92V13.81L14.95 16C14.32 16.5 13.57 16.8 12.75 16.92M16 14.95L13.81 12.75H16.92C16.8 13.57 16.5 14.32 16 14.95M13.81 11.25L16 9.05C16.5 9.69 16.8 10.44 16.92 11.25H13.81Z"
};

// MDI-Icon als SVG-Pfad (Tabelle unten). Unbekannte Icons werden weggelassen.
function iconEl(x, y, size, icon, color) {
  const d = icon ? ICON_PATHS[icon] : null;
  if (!d) return null;
  const g = el("g", { transform: `translate(${x - size / 2}, ${y - size / 2}) scale(${size / 24})` });
  g.append(el("path", { d, style: `fill: ${color};` }));
  return g;
}

// Blitz als SVG-Pfad (24er-Raster), Mitte bei (x, y), ca. 14 px hoch, schwarz (Theme-Textfarbe)
const BOLT_D = "M13 2 L3 14 H11 L10 22 L21 10 H13 Z";
function boltEl(x, y) {
  const g = el("g", { transform: `translate(${x - 7.2}, ${y - 7.2}) scale(0.6)` });
  g.append(el("path", {
    d: BOLT_D,
    style: "fill: var(--primary-text-color, #000);",
  }));
  return g;
}
// Für Gas (m³) statt des Blitzes: Flamme aus der Icon-Tabelle
const FIRE_D = ICON_PATHS["mdi:fire"];

function wText(w) {
  if (w === null) return "–";
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
}

// Anzeige eines Leistungswerts mit seiner Einheit (W/kW oder z. B. m³)
function fmtPower(v, unit) {
  if (unit === "W") return wText(v);
  return `${v.toFixed(2)} ${unit}`;
}

function kwhText(value, label) {
  if (value === null) return "";
  return `${value.toFixed(2)} ${label}`;
}

// Farbpalette für zufällige Zuweisung (Räume und Geräte)
const PALETTE = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6",
  "#9acd32", "#469990", "#9a6324", "#800000", "#808000", "#000075", "#e6beff",
];
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Geräte eines Raums so verteilen, dass sich die Kreise nicht berühren.
// Polarkoordinaten relativ zum Raum: r (Abstand), t (Winkel gegen die Richtung a vom Haus aus).
function layoutRoomDevices(rx, ry, a, nd, maxT) {
  const MIN = 2 * RAD.DEV_R + 30;
  const pts = [];
  for (let j = 0; j < nd; j++) {
    const t = nd === 1 ? 0 : -maxT * 0.6 + maxT * 1.2 * (j / (nd - 1));
    pts.push({ r: RAD.DEV_DIST, t });
  }
  const xy = (p) => ({ x: rx + p.r * Math.cos(a + p.t), y: ry + p.r * Math.sin(a + p.t) });
  const polar = (q) => {
    const r = Math.hypot(q.x - rx, q.y - ry);
    const t = Math.atan2(q.y - ry, q.x - rx) - a;
    return { r, t: Math.atan2(Math.sin(t), Math.cos(t)) };
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  for (let it = 0; it < 150; it++) {
    for (let i = 0; i < nd; i++) {
      for (let k = i + 1; k < nd; k++) {
        const A = xy(pts[i]);
        const B = xy(pts[k]);
        let dx = B.x - A.x;
        let dy = B.y - A.y;
        let d = Math.hypot(dx, dy);
        if (d >= MIN) continue;
        if (d < 1e-6) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (MIN - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        pts[i] = polar({ x: A.x - ux * push, y: A.y - uy * push });
        pts[k] = polar({ x: B.x + ux * push, y: B.y + uy * push });
      }
    }
    for (const p of pts) {
      p.r = clamp(p.r, RAD.DEV_DIST, RAD.DEV_DIST + 150);
      p.t = clamp(p.t, -maxT, maxT);
    }
  }
  return pts;
}

// Gerätenamen umbrechen: max. ~11 Zeichen je Zeile, lange Wörter mit Bindestrich trennen, max. 3 Zeilen
function wrapLabel(text, max = 13) {
  const lines = [];
  let cur = "";
  for (let w of text.split(" ")) {
    while (w.length > max) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(w.slice(0, max - 1) + "-");
      w = w.slice(max - 1);
    }
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length <= max) {
      cur = cand;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// Mehrzeiliger Text: Zeilen untereinander, erste Zeile bei y0
function multiText(lines, x, y0, lh, anchor, cls) {
  const t = el("text", { x, "text-anchor": anchor, class: cls });
  lines.forEach((ln, i) => t.append(el("tspan", { x, y: y0 + i * lh }, ln)));
  return t;
}

// Radiale Ansicht (Haus -> Räume -> Geräte)
const RAD = { V: 1200, C: 600, HOUSE_R: 84, ROOM_DIST: 300, ROOM_R: 64, DEV_DIST: 124, DEV_R: 30 };

// Zwei Blasen, die entlang eines Pfads (id) laufen
function makeBubbles(pid, color) {
  const group = el("g", { style: "display:none" });
  const motions = [0, 1].map((k) => {
    const c = el("circle", { r: 3.5, fill: color });
    const m = el("animateMotion", { dur: "2.5s", repeatCount: "indefinite", begin: `${-k * 1.25}s` });
    m.append(el("mpath", { href: `#${pid}` }));
    c.append(m);
    group.append(c);
    return m;
  });
  return { group, motions };
}

class EnergyRingCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._stats = null;
    this._statsAt = 0;
    this._fetching = false;
  }

  setConfig(config) {
    // Entweder `rooms: [...]` oder die Einzelraum-Form mit `devices` (wie bisher)
    let rooms = config.rooms
      ? config.rooms
      : [{ title: config.title, center: config.center, devices: config.devices }];
    rooms = rooms.filter((r) => r && Array.isArray(r.devices) && r.devices.length > 0);
    if (rooms.length === 0) {
      throw new Error("energy-ring-card: rooms bzw. devices fehlt");
    }
    this._config = {
      animate: true,
      kwh_label: "kWh",
      flow_min_w: 1,
      kwh_window: "today",
      columns: Math.min(3, rooms.length),
      ...config,
      rooms: rooms.map((r) => ({ center: {}, ...r })),
    };
    this._built = false;
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    const cols = Math.max(1, this._config?.columns || 1);
    return Math.ceil((this._config?.rooms.length || 1) / cols) * 4;
  }

  // Sections-Ansicht: Karte meldet ihre gewünschte Breite (12 = volle Breite)
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  // Alle Zähler aller Räume für die Statistik-Abfrage
  _allKwhIds() {
    const ids = [];
    for (const room of this._config.rooms) {
      for (const dev of room.devices) if (dev.kwh_entity) ids.push(dev.kwh_entity);
    }
    if (this._config.house?.kwh_entity) ids.push(this._config.house.kwh_entity);
    return [...new Set(ids)];
  }

  async _fetchStats() {
    if (this._fetching || !this._hass) return;
    const cfg = this._config;
    const ids = this._allKwhIds();
    if (ids.length === 0) return;

    const now = new Date();
    const rolling = cfg.kwh_window === "24h";
    // „heute“ = ab lokalem Mitternacht, sonst die letzten 24 Stunden
    const start = rolling
      ? new Date(now.getTime() - 24 * 3600 * 1000)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    this._fetching = true;
    try {
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: ids,
        period: rolling ? "hour" : "day",
        types: ["change"],
      });
      const stats = {};
      for (const id of ids) {
        const rows = res[id] || [];
        stats[id] = rows.reduce((acc, r) => acc + (r.change || 0), 0);
      }
      this._stats = stats;
      this._statsAt = now.getTime();
    } catch (err) {
      console.warn("energy-ring-card: Statistik nicht abrufbar", err);
    } finally {
      this._fetching = false;
    }
  }

  // Verbrauch im Zeitraum in der Einheit des Zählers (Wh -> kWh, sonst unverändert)
  _periodKwh(hass, entityId) {
    if (!entityId || !this._stats || !(entityId in this._stats)) return null;
    const s = hass.states[entityId];
    const unit = s ? (s.attributes.unit_of_measurement || "").toLowerCase() : "";
    const v = this._stats[entityId];
    return unit === "wh" ? v / 1000 : v;
  }

  _kwhUnit(hass, entityId) {
    const s = hass.states[entityId];
    const raw = s ? s.attributes.unit_of_measurement || "" : "";
    const lu = raw.toLowerCase();
    if (lu === "wh" || lu === "kwh" || raw === "") return "kWh";
    return raw;
  }

  _buildRadial() {
    const cfg = this._config;
    const rooms = cfg.rooms;
    const n = rooms.length;
    const HC = RAD.C;

    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      ha-card { padding: 12px; }
      .title { font-size: 1.1em; font-weight: 500; margin-bottom: 4px; }
      svg { width: 100%; height: auto; }
      .label { font: 14px sans-serif; fill: var(--primary-text-color, #222); }
      .value { font: bold 15px sans-serif; fill: var(--primary-text-color, #222); }
      .room-value { font: bold 16px sans-serif; fill: var(--primary-text-color, #222); }
      .sub { font: 12px sans-serif; fill: var(--secondary-text-color, #666); }
      .center-value { font: bold 20px sans-serif; fill: var(--primary-text-color, #222); }
      .line { stroke-linecap: round; fill: none; }
    `;

    const card = document.createElement("ha-card");
    if (cfg.title) {
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = cfg.title;
      card.append(t);
    }
    const svg = el("svg", { viewBox: `0 0 ${RAD.V} ${RAD.V}` });
    const lines = el("g");
    const nodes = el("g");
    svg.append(lines, nodes);

    // Haus in der Mitte: Summe aller W-Geräte und Tageszähler
    const houseVal = el("text", { x: HC, y: HC + 6, "text-anchor": "middle", class: "center-value" }, "–");
    const houseKwh = el("text", { x: HC, y: HC + 26, "text-anchor": "middle", class: "sub" }, "");
    nodes.append(
      el("circle", { cx: HC, cy: HC, r: RAD.HOUSE_R, fill: "none", stroke: "#888", "stroke-width": 4 }),
      el("text", { x: HC, y: HC - 24, "text-anchor": "middle", class: "label" }, cfg.house.name || "Haus"),
      houseVal,
      houseKwh,
    );

    const roomPal = shuffled(PALETTE);
    const radialRooms = rooms.map((room, i) => {
      const roomColor = room.color || roomPal[i % roomPal.length];
      const a = -Math.PI / 2 + ((2 * Math.PI) / n) * i;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rx = HC + RAD.ROOM_DIST * ca;
      const ry = HC + RAD.ROOM_DIST * sa;

      // Raum -> Haus: Blasen laufen zur Hausmitte
      const rpid = `flow-${++flowSeq}`;
      const rline = el("path", {
        id: rpid,
        d: `M ${rx - ca * RAD.ROOM_R} ${ry - sa * RAD.ROOM_R} L ${HC + ca * RAD.HOUSE_R} ${HC + sa * RAD.HOUSE_R}`,
        stroke: roomColor,
        "stroke-width": 2,
        class: "line",
        opacity: 0.35,
      });
      const rB = makeBubbles(rpid, roomColor);
      lines.append(rline, rB.group);

      // Raum-Kreis: Icon, Name, Summe W, Summe kWh
      const roomIcon = iconEl(rx, ry - 30, 18, room.icon, roomColor);
      const roomVal = el("text", { x: rx, y: ry + 8, "text-anchor": "middle", class: "room-value" }, "–");
      const roomKwh = el("text", { x: rx, y: ry + 26, "text-anchor": "middle", class: "sub" }, "");
      nodes.append(
        el("circle", { cx: rx, cy: ry, r: RAD.ROOM_R, fill: "none", stroke: roomColor, "stroke-width": 3 }),
        ...(roomIcon ? [roomIcon] : []),
        el("text", { x: rx, y: ry - 10, "text-anchor": "middle", class: "label" }, room.title || "Raum"),
        roomVal,
        roomKwh,
      );

      // Geräte in einem Bogen um den Raum, nach außen gerichtet (Haus-Seite frei lassen)
      const nd = room.devices.length;
      const devPal = shuffled(PALETTE);
      const maxT = Math.min(Math.PI * 0.85, (Math.PI / n) * 2.2);
      const layout = layoutRoomDevices(rx, ry, a, nd, maxT);
      const devices = room.devices.map((dev, j) => {
        const ad = a + layout[j].t;
        const cd = Math.cos(ad);
        const sd = Math.sin(ad);
        const dx = rx + layout[j].r * cd;
        const dy = ry + layout[j].r * sd;
        const color = dev.color || devPal[j % devPal.length];

        const dpid = `flow-${++flowSeq}`;
        const dline = el("path", {
          id: dpid,
          d: `M ${dx - cd * RAD.DEV_R} ${dy - sd * RAD.DEV_R} L ${rx + cd * RAD.ROOM_R} ${ry + sd * RAD.ROOM_R}`,
          stroke: color,
          "stroke-width": 2,
          class: "line",
          opacity: 0.35,
        });
        const dB = makeBubbles(dpid, color);
        lines.append(dline, dB.group);

        const dIcon = iconEl(dx, dy - 10, 16, dev.icon, color);
        const val = el("text", { x: dx, y: dy + 10, "text-anchor": "middle", class: "value" }, "–");
        // Name und kWh außen; Reihenfolge abhängig von der Richtung (oben: Name oben, unten: Name nahe am Kreis)
        // Beschriftung: seitlich (|cos| >= 0.5) links/rechts am Kreisrand, sonst mittig oben/unten
        const side = Math.abs(cd) >= 0.5;
        const anchor = side ? (cd > 0 ? "start" : "end") : "middle";
        const px = side ? dx + Math.sign(cd) * (RAD.DEV_R + 23) : dx;
        let nameBase;
        let kwhY;
        const nameLines = wrapLabel(dev.name || dev.entity);
        const LH = 14;
        const L = nameLines.length;
        if (side) {
          nameBase = dy - 2 - (L - 1) * LH;
          kwhY = dy + 14;
        } else if (sd < 0) {
          kwhY = dy - RAD.DEV_R - 6;
          nameBase = dy - RAD.DEV_R - 22 - (L - 1) * LH;
        } else {
          nameBase = dy + RAD.DEV_R + 16;
          kwhY = nameBase + (L - 1) * LH + 16;
        }
        const nameX = side ? (cd > 0 ? px - 19 : px) : dx;
        const kwhX = side ? px : dx + 9;
        const name = multiText(nameLines, nameX, nameBase, LH, anchor, "label");
        const kwh = el("text", { x: kwhX, y: kwhY, "text-anchor": anchor, class: "sub" }, "");
        const bolt = boltEl(0, 0);
        nodes.append(
          el("circle", { cx: dx, cy: dy, r: RAD.DEV_R, fill: "none", stroke: color, "stroke-width": 3 }),
          ...(dIcon ? [dIcon] : []),
          val,
          name,
          kwh,
          bolt,
        );
        return { cfg: dev, dline, dB, val, kwh, bolt, boltPath: bolt.firstChild, anchor, kx: kwhX, ky: kwhY };
      });

      return { room, rline, rB, roomVal, roomKwh, devices };
    });

    this._radial = { houseVal, houseKwh, rooms: radialRooms };
    card.append(svg);
    this.shadowRoot.replaceChildren(style, card);
    this._built = true;
    this._updateRadial();
  }

  _updateRadial() {
    if (!this._radial || !this._hass) return;
    const hass = this._hass;
    const cfg = this._config;
    const R = this._radial;
    let houseW = 0;

    for (const r of R.rooms) {
      let roomW = 0;
      let roomWCount = 0;
      let roomOther = null;
      let roomOtherUnit = "";
      let roomK = null;
      let roomKOther = null;
      let roomKUnit = "";
      for (const ref of r.devices) {
        const p = readPower(hass, ref.cfg.entity);
        const w = p ? p.v : null;
        const isW = !p || p.unit === "W";
        ref.val.textContent = p ? fmtPower(p.v, p.unit) : "–";
        if (isW && w !== null) {
          roomW += w;
          houseW += w;
          roomWCount += 1;
        } else if (!isW && w !== null) {
          roomOther = (roomOther ?? 0) + w;
          roomOtherUnit = p.unit;
        }

        // Tagesverbrauch nur in kWh zur Raumsumme zählen (Gas bleibt außen vor)
        const kv = this._periodKwh(hass, ref.cfg.kwh_entity);
        const ku = this._kwhUnit(hass, ref.cfg.kwh_entity);
        ref.kwh.textContent = kwhText(kv, ku);
        if (kv !== null && ku === "kWh") roomK = (roomK ?? 0) + kv;
        else if (kv !== null) {
          roomKOther = (roomKOther ?? 0) + kv;
          roomKUnit = ku;
        }

        // Symbol vor der Tageszeile: Blitz für Strom, Flamme für Gas
        ref.boltPath.setAttribute("d", isW ? BOLT_D : FIRE_D);
        const hasKwh = ref.kwh.textContent !== "";
        ref.bolt.style.display = hasKwh ? "" : "none";
        if (hasKwh) {
          const tw = ref.kwh.getComputedTextLength();
          const bx = ref.anchor === "start" ? ref.kx - 12 : ref.anchor === "end" ? ref.kx - tw - 12 : ref.kx - tw / 2 - 12;
          ref.bolt.setAttribute("transform", `translate(${bx - 7.2}, ${ref.ky - 4 - 7.2}) scale(0.6)`);
        }

        const threshold = isW ? cfg.flow_min_w : (ref.cfg.flow_min ?? 0.001);
        const active = cfg.animate && w !== null && Math.abs(w) >= threshold;
        ref.dB.group.style.display = active ? "" : "none";
        if (active) {
          const dur = Math.max(1.2, Math.min(4, 4 - Math.abs(w) / 500));
          for (const m of ref.dB.motions) m.setAttribute("dur", `${dur}s`);
        }
        ref.dline.setAttribute("stroke-width", w === null ? 2 : Math.min(8, 2 + Math.abs(w) / 300));
        ref.dline.setAttribute("opacity", active ? 0.9 : 0.35);
      }

      // Raumsumme: W-Geräte als W; reine Gasräume zeigen die Einheit des Geräts (z. B. m³)
      if (roomWCount > 0 || roomOther === null) {
        r.roomVal.textContent = roomWCount > 0 ? wText(roomW) : "–";
      } else {
        r.roomVal.textContent = fmtPower(roomOther, roomOtherUnit);
      }
      if (roomK !== null) r.roomKwh.textContent = kwhText(roomK, "kWh");
      else if (roomKOther !== null) r.roomKwh.textContent = kwhText(roomKOther, roomKUnit);
      else r.roomKwh.textContent = "";
      const rActive = cfg.animate && Math.abs(roomW) >= cfg.flow_min_w;
      r.rB.group.style.display = rActive ? "" : "none";
      if (rActive) {
        const dur = Math.max(1.2, Math.min(4, 4 - Math.abs(roomW) / 500));
        for (const m of r.rB.motions) m.setAttribute("dur", `${dur}s`);
      }
      r.rline.setAttribute("opacity", rActive ? 0.9 : 0.35);
    }

    R.houseVal.textContent = wText(houseW);
    R.houseKwh.textContent = kwhText(this._periodKwh(hass, cfg.house.kwh_entity), this._kwhUnit(hass, cfg.house.kwh_entity));
  }

  _build() {
    if (!this._config) return;
    if (this._config.house) {
      this._buildRadial();
      return;
    }
    const cfg = this._config;
    const rooms = cfg.rooms;
    const cols = Math.max(1, Math.min(cfg.columns, rooms.length));
    const rows = Math.ceil(rooms.length / cols);

    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      ha-card { padding: 12px; }
      .title { font-size: 1.1em; font-weight: 500; margin-bottom: 4px; }
      svg { width: 100%; height: auto; }
      .room-title { font: bold 16px sans-serif; fill: var(--primary-text-color, #222); }
      .label { font: 12px sans-serif; fill: var(--primary-text-color, #222); }
      .value { font: bold 13px sans-serif; fill: var(--primary-text-color, #222); }
      .sub { font: 11px sans-serif; fill: var(--secondary-text-color, #666); }
      .center-value { font: bold 17px sans-serif; fill: var(--primary-text-color, #222); }
      .line { stroke-linecap: round; fill: none; }
      .flow { stroke-dasharray: 6 10; animation: flow 1.2s linear infinite; }
      @keyframes flow { to { stroke-dashoffset: -16; } }
    `;

    const card = document.createElement("ha-card");
    if (cfg.title) {
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = cfg.title;
      card.append(t);
    }
    const svg = el("svg", { viewBox: `0 0 ${cols * VB} ${rows * CELL_H}` });

    this._rooms = rooms.map((room, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const g = el("g", { transform: `translate(${col * VB}, ${row * CELL_H})` });
      const lines = el("g");
      const nodes = el("g");
      const cy = TITLE_H + C;

      g.append(el("text", { x: C, y: 20, "text-anchor": "middle", class: "room-title" }, room.title || ""));
      g.append(lines, nodes);

      const n = room.devices.length;
      const devices = room.devices.map((dev, i) => {
        const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
        const x = C + RING * Math.cos(angle);
        const y = cy + RING * Math.sin(angle);
        const color = dev.color || "#4a90d9";

        // Linie nur zwischen den Kreisrändern: Start am Geräte-Kreis, Ende am Mittelkreis
        const len = Math.hypot(x - C, y - cy) || 1;
        const ux = (x - C) / len;
        const uy = (y - cy) / len;
        const sx = x - ux * NODE_R;
        const sy = y - uy * NODE_R;
        const ex = C + ux * CENTER_R;
        const ey = cy + uy * CENTER_R;

        // Linie vom Gerät zur Raummitte (Blasen laufen in Pfadrichtung zum Raum)
        const pid = `flow-${++flowSeq}`;
        const line = el("path", {
          id: pid,
          d: `M ${sx} ${sy} L ${ex} ${ey}`,
          stroke: color,
          "stroke-width": 2,
          class: "line",
          opacity: 0.35,
        });
        lines.append(line);

        // Blasen laufen entlang der Linie; zwei Blasen versetzt
        const bubbles = el("g", { style: "display:none" });
        const motions = [0, 1].map((k) => {
          const c = el("circle", { r: 3.5, fill: color });
          const m = el("animateMotion", { dur: "2.5s", repeatCount: "indefinite", begin: `${-k * 1.25}s` });
          m.append(el("mpath", { href: `#${pid}` }));
          c.append(m);
          bubbles.append(c);
          return m;
        });
        lines.append(bubbles);

        const circle = el("circle", { cx: x, cy: y, r: NODE_R, fill: "none", stroke: color, "stroke-width": 3 });
        const icon = iconEl(x, y - 9, 18, dev.icon, "var(--primary-text-color, #000)");
        const val = el("text", { x, y: y + 13, "text-anchor": "middle", class: "value" }, "–");
        // Oben: Name und kWh über dem Kreis; unten: darunter
        const up = Math.sin(angle) < 0;
        const nameY = up ? y - NODE_R - 24 : y + NODE_R + 16;
        const kwhY = up ? y - NODE_R - 10 : y + NODE_R + 30;
        const name = el("text", { x, y: nameY, "text-anchor": "middle", class: "label" }, dev.name || dev.entity);
        const kwh = el("text", { x, y: kwhY, "text-anchor": "middle", class: "sub" }, "");
        // Blitz vor der kWh-Zeile; Position wird in _update anhand der Textbreite gesetzt
        const bolt = boltEl(x, kwhY - 4);
        nodes.append(circle, ...(icon ? [icon] : []), val, name, kwh, bolt);
        return { cfg: dev, line, val, kwh, bolt, boltPath: bolt.firstChild, x, kwhY, bubbles, motions };
      });

      const centerCircle = el("circle", { cx: C, cy, r: CENTER_R, fill: "none", stroke: "#888", "stroke-width": 3 });
      const roomIcon = iconEl(C, cy - 39, 18, room.icon, "var(--primary-text-color, #000)");
      const centerName = el("text", { x: C, y: cy - 16, "text-anchor": "middle", class: "label" }, room.center.name || room.title || "Raum");
      const centerVal = el("text", { x: C, y: cy + 8, "text-anchor": "middle", class: "center-value" }, "–");
      nodes.append(centerCircle, ...(roomIcon ? [roomIcon] : []), centerName, centerVal);

      svg.append(g);
      return { room, centerName, centerVal, devices };
    });

    card.append(svg);
    this.shadowRoot.replaceChildren(style, card);
    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;
    const hass = this._hass;
    const cfg = this._config;

    // Statistik höchstens einmal pro Minute neu abfragen
    if (!this._statsAt || Date.now() - this._statsAt > 60000) this._fetchStats();
    if (cfg.house) {
      this._updateRadial();
      return;
    }

    for (const r of this._rooms) {
      // Mitte: Netzsensor, falls gesetzt – sonst Summe der W-Geräte im Raum (Gas bleibt außen vor)
      const sumW = r.devices.reduce((acc, ref) => {
        const p = readPower(hass, ref.cfg.entity);
        return p && p.unit === "W" ? acc + p.v : acc;
      }, 0);
      const gridP = r.room.center.entity ? readPower(hass, r.room.center.entity) : null;
      const grid = r.room.center.entity ? (gridP ? gridP.v : null) : sumW;
      r.centerVal.textContent = wText(grid);
      if (grid !== null && grid < 0) r.centerName.textContent = "Einspeisung";
      else r.centerName.textContent = r.room.center.name || r.room.title || "Raum";

      for (const ref of r.devices) {
        const p = readPower(hass, ref.cfg.entity);
        const w = p ? p.v : null;
        const isW = !p || p.unit === "W";
        ref.val.textContent = p ? fmtPower(p.v, p.unit) : "–";

        // Verbrauch im Zeitraum mit Einheit (kWh bzw. z. B. m³)
        ref.kwh.textContent = kwhText(this._periodKwh(hass, ref.cfg.kwh_entity), this._kwhUnit(hass, ref.cfg.kwh_entity));
        // Symbol vor der Tageszeile: Blitz für Strom, Flamme für Gas
        ref.boltPath.setAttribute("d", isW ? BOLT_D : FIRE_D);
        const hasKwh = ref.kwh.textContent !== "";
        ref.bolt.style.display = hasKwh ? "" : "none";
        if (hasKwh) {
          const tw = ref.kwh.getComputedTextLength();
          const bx = ref.x - tw / 2 - 12;
          ref.bolt.setAttribute("transform", `translate(${bx - 7.2}, ${ref.kwhY - 4 - 7.2}) scale(0.6)`);
        }

        // Schwelle: W-Geräte ab cfg.flow_min_w, andere Einheiten ab Gerätewert flow_min (Standard 0.001)
        const threshold = isW ? cfg.flow_min_w : (ref.cfg.flow_min ?? 0.001);
        const active = cfg.animate && w !== null && Math.abs(w) >= threshold;
        // Blasen nur oberhalb der Schwelle; schneller bei mehr Leistung
        ref.bubbles.style.display = active ? "" : "none";
        if (active) {
          const dur = Math.max(1.2, Math.min(4, 4 - Math.abs(w) / 500));
          for (const m of ref.motions) m.setAttribute("dur", `${dur}s`);
        }
        ref.line.setAttribute("class", "line");
        ref.line.setAttribute("stroke-width", w === null ? 2 : Math.min(8, 2 + Math.abs(w) / 300));
        ref.line.setAttribute("opacity", active ? 0.9 : 0.35);
      }
    }
  }
}

customElements.define("energy-ring-card", EnergyRingCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-ring-card",
  name: "Energy Ring Card",
  description: "Räume als Kreisdiagramme mit Leistung und Tagesverbrauch",
});

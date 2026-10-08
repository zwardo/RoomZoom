import { seq, type FloorSpec } from "../draw";

const N = [25, 57, 89, 122, 154];
const S = [308, 341, 373, 406, 438];
const LAB = ["LAB", "LAB", "LAB", "LAB"];

export default {
  building: "Building 2",
  floor: "2",
  source: "B2F2.jpg (1024x471, de-skewed)",
  fit: [
    [[12, 7], [15.5, 16]],
    [[1011, 7], [4670.5, 16]],
    [[12, 455], [15.5, 2059.5]],
  ],
  deskPrefix: "2-",

  rooms: [
    // North
    { rect: [[468, 28], [557, 145]], label: ["Socrates", "240"], book: { key: "socrates", door: [473, 145] } },
    { rect: [[573, 52], [599, 89]], label: ["Phone", "241"] },
    { rect: [[573, 89], [599, 125]], label: ["Phone", "240"] },

    // Middle band, west to east
    { rect: [[59, 176], [110, 231]], label: ["Beauvoir", "220"], book: { key: "beauvoir", door: [103, 176] } },
    { rect: [[59, 231], [110, 287]], label: ["Confucius", "221"], book: { key: "confucius", door: [103, 287] } },
    { rect: [[110, 176], [160, 287]] },
    { rect: [[113, 268], [158, 287]], kind: "service", label: ["Electrical", "222"] },
    { rect: [[162, 200], [200, 257]], kind: "service", label: ["IDF", "224"] },
    { rect: [[162, 257], [200, 287]], kind: "service", label: ["Storage", "223"] },
    { rect: [[200, 176], [230, 200]] },
    { rect: [[232, 176], [271, 287]], label: ["Copy /", "Break", "225"] },
    { rect: [[271, 176], [337, 230]], label: ["Camus", "226"], book: { key: "camus", door: [330, 176] } },
    { rect: [[271, 230], [337, 287]], label: ["Dewey", "227"], book: { key: "dewey", door: [330, 287] } },
    { rect: [[337, 176], [400, 287]], label: ["Aristotle", "228"], book: { key: "aristotle", door: [390, 287] } },
    { rect: [[400, 176], [433, 232]], kind: "service", label: ["Antenna", "230"] },
    { rect: [[400, 232], [433, 287]], label: ["Quiet", "Room", "229"] },
    { rect: [[433, 168], [467, 293]] },
    { rect: [[493, 182], [537, 287]], label: ["Open to", "below"] },
    { rect: [[580, 176], [685, 287]], kind: "service" },
    { rect: [[603, 176], [685, 230]], kind: "service", label: ["Women"] },
    { rect: [[603, 233], [685, 287]], kind: "service", label: ["Men"] },
    { rect: [[685, 176], [763, 232]], label: ["Descartes", "232"], book: { key: "descartes", door: [750, 176] } },
    { rect: [[685, 232], [763, 287]], label: ["Hobbes", "231"], book: { key: "hobbes", door: [692, 287] } },
    { rect: [[763, 176], [800, 287]], label: ["Copy /", "Break", "233"] },
    { rect: [[800, 176], [833, 200]], kind: "service", label: ["Stor.", "235"] },
    { rect: [[833, 200], [867, 287]], kind: "service", label: ["Storage", "234"] },
    { rect: [[867, 268], [912, 287]], kind: "service", label: ["Electrical", "236"] },
    { rect: [[915, 176], [965, 232]], label: ["Voltaire", "238"], book: { key: "voltaire", door: [922, 176] } },
    { rect: [[915, 232], [965, 287]], label: ["Schweitzer", "237"], book: { key: "schweitzer", door: [922, 287] } },

    // South
    { rect: [[86, 342], [129, 374]] },
    { rect: [[425, 338], [452, 365]], label: ["Phone", "244"] },
    { rect: [[425, 365], [452, 392]], label: ["Phone", "243"] },
    { rect: [[425, 392], [452, 418]], label: ["Phone", "242"] },
    { rect: [[468, 317], [557, 435]], label: ["Plato", "239"], book: { key: "plato", door: [548, 317] } },
  ],

  walls: [
    { points: [[467, 170], [562, 170]] },
    { points: [[467, 293], [562, 293]] },
    { points: [[559, 168], [559, 293]], width: 6 },
  ],

  stairs: [
    { from: [113, 179], to: [158, 268], treads: 12, label: "West stair" },
    { from: [537, 182], to: [557, 280], treads: 12 },
    { from: [867, 176], to: [915, 268], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [200, 200], to: [230, 287] },
    { from: [437, 180], to: [463, 232] },
    { from: [437, 232], to: [463, 283] },
    { from: [800, 200], to: [833, 287] },
  ],
  labels: [{ at: [480, 176], text: ["Elev."] }],

  pods: [
    { spine: 58, ticks: N, left: seq(2000, 2003), right: seq(2007, 2004) },
    { spine: 130, ticks: N, left: LAB, right: seq(2008, 2011) },
    { spine: 203, ticks: N, left: seq(2015, 2012), right: seq(2016, 2019) },
    { spine: 277, ticks: N, left: seq(2023, 2020), right: seq(2024, 2027) },
    { spine: 350, ticks: N, left: seq(2031, 2028), right: seq(2032, 2035) },
    { spine: 423, ticks: [48, 80, 113, 145], left: seq(2038, 2036), right: seq(2039, 2041) },
    { spine: 599, ticks: [26, 58, 91, 123], left: [], right: seq(2044, 2042) },
    { spine: 676, ticks: N, left: seq(2045, 2048), right: seq(2052, 2049) },
    { spine: 750, ticks: N, left: seq(2053, 2056), right: seq(2060, 2057) },
    { spine: 823, ticks: N, left: seq(2061, 2064), right: seq(2068, 2065) },
    { spine: 896, ticks: N, left: seq(2069, 2072), right: seq(2076, 2073) },
    { spine: 968, ticks: N, left: seq(2077, 2080), right: seq(2084, 2081) },

    { spine: 57, ticks: S, left: seq(2169, 2166), right: seq(2162, 2165) },
    { spine: 129, ticks: S, left: LAB, right: seq(2161, 2158) },
    { spine: 202, ticks: S, left: seq(2154, 2157), right: seq(2153, 2150) },
    { spine: 277, ticks: S, left: seq(2146, 2149), right: seq(2145, 2142) },
    { spine: 349, ticks: S, left: seq(2138, 2141), right: seq(2137, 2134) },
    { spine: 425, ticks: [338, 371, 405, 438], left: seq(2131, 2133), right: [] },
    { spine: 603, ticks: [318, 351, 383, 416], left: seq(2130, 2128), right: seq(2125, 2127) },
    { spine: 676, ticks: S, left: seq(2124, 2121), right: seq(2117, 2120) },
    { spine: 749, ticks: S, left: seq(2116, 2113), right: seq(2109, 2112) },
    { spine: 823, ticks: S, left: seq(2108, 2105), right: seq(2101, 2104) },
    { spine: 895, ticks: S, left: seq(2100, 2097), right: seq(2093, 2096) },
    { spine: 968, ticks: S, left: seq(2092, 2089), right: seq(2085, 2088) },
  ],

  halls: [
    [[22, 163], [1000, 163]],
    [[22, 300], [1000, 300]],
    ...[42, 480, 571, 980].map((x): [number, number][] => [[x, 163], [x, 300]]),
    ...[22, 94, 167, 240, 313, 386, 456, 638, 713, 786, 859, 931, 1000].map((x): [number, number][] => [[x, 163], [x, 30]]),
    ...[22, 82, 166, 238, 313, 387, 570, 639, 713, 786, 859, 931, 1000].map((x): [number, number][] => [[x, 300], [x, 440]]),
  ],
} satisfies FloorSpec;

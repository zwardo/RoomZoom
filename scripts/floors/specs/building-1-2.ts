import { seq, type FloorSpec } from "../draw";

const N = [49, 79, 109, 139, 169];
const S = [310, 340, 370, 400, 430];

export default {
  building: "Building 1",
  floor: "2",
  source: "B1F2.jpg (1024x477, de-skewed)",
  fit: [
    [[21, 25], [15.5, 84]],
    [[1013, 25], [4670.5, 84]],
    [[21, 453], [15.5, 2062.5]],
  ],
  deskPrefix: "1-",

  rooms: [
    // North
    { rect: [[21, 25], [65, 108]], label: ["CEO"] },
    { rect: [[21, 108], [65, 148]], label: ["Executive", "Assistant"] },
    { rect: [[21, 148], [65, 195]], label: ["CFO"] },
    { rect: [[497, 68], [570, 112]], label: ["Adam's Peak", "234"], book: { key: "adams-peak", door: [497, 75] } },
    { rect: [[497, 112], [570, 155]], label: ["Mt. Fuji", "206"], book: { key: "mt-fuji", door: [562, 155] } },

    // Middle band, west to east
    { rect: [[36, 195], [63, 282]], label: ["Kamet", "218"], book: { key: "kamet", door: [63, 240] } },
    { rect: [[100, 193], [133, 225]], label: ["Phone", "240"] },
    { rect: [[100, 225], [133, 257]], label: ["Phone", "239"] },
    { rect: [[100, 257], [133, 287]], label: ["Phone", "238"] },
    { rect: [[133, 193], [178, 287]] },
    { rect: [[178, 215], [203, 287]], kind: "service" },
    { rect: [[203, 193], [245, 215]], kind: "service", label: ["Elec", "213"] },
    { rect: [[203, 215], [245, 287]], kind: "service", label: ["Storage", "214"] },
    { rect: [[245, 193], [283, 287]], label: ["Copy /", "Break", "212"] },
    { rect: [[283, 193], [318, 240]], label: ["Mt.", "Tasman", "211"], book: { key: "mt-tasman", door: [310, 193] } },
    { rect: [[318, 193], [350, 240]], label: ["Leila", "Peak", "210"], book: { key: "leila-peak", door: [325, 193] } },
    { rect: [[283, 240], [350, 287]], label: ["Jade Mtn", "215"], book: { key: "jade-mtn", door: [290, 287] } },
    { rect: [[350, 193], [400, 287]], label: ["Everest", "209"], book: { key: "everest", door: [395, 193] } },
    { rect: [[402, 193], [436, 237]], kind: "service", label: ["Antenna"] },
    { rect: [[402, 237], [436, 267]], label: ["Quiet", "Rm", "216"] },
    { rect: [[402, 267], [436, 287]], kind: "service" },
    { rect: [[436, 193], [468, 297]] },
    { rect: [[500, 298], [570, 325]], label: ["Vestibule 200"] },
    { rect: [[570, 193], [682, 290]], kind: "service" },
    { rect: [[580, 193], [625, 285]], kind: "service", label: ["Men", "202"] },
    { rect: [[625, 193], [680, 285]], kind: "service", label: ["Women", "201"] },
    { rect: [[682, 193], [715, 255]], kind: "service", label: ["IDF", "229"] },
    { rect: [[682, 255], [715, 290]], kind: "service", label: ["Janitor", "223"] },
    { rect: [[715, 193], [752, 255]], kind: "service", label: ["Storage", "228"] },
    { rect: [[715, 255], [752, 290]], kind: "service", label: ["Server", "Room", "224"] },
    { rect: [[752, 193], [783, 290]], label: ["Copy /", "Break", "225"] },
    { rect: [[783, 193], [830, 215]], kind: "service", label: ["Elec", "227"] },
    { rect: [[783, 215], [830, 290]], kind: "service", label: ["Storage", "226"] },
    { rect: [[830, 215], [858, 290]], kind: "service" },
    { rect: [[858, 193], [903, 290]] },
    { rect: [[903, 193], [935, 225]], label: ["Phone", "237"] },
    { rect: [[903, 225], [935, 257]], label: ["Phone", "236"] },
    { rect: [[903, 257], [935, 290]], label: ["Phone", "235"] },
    { rect: [[953, 197], [997, 240]], label: ["Pumori", "231"], book: { key: "pumori", door: [953, 208] } },
    { rect: [[953, 240], [997, 280]], label: ["Haramosh", "230"], book: { key: "haramosh", door: [953, 268] } },

    // South
    { rect: [[21, 290], [58, 323]] },
    { rect: [[972, 290], [1013, 322]] },
    { rect: [[467, 350], [518, 435]], label: ["K2", "220"], book: { key: "k2", door: [475, 350] } },
    { rect: [[518, 350], [570, 435]], label: ["Chembra Peak", "221"], book: { key: "chembra-peak", door: [562, 350] } },
  ],

  labels: [{ at: [520, 240], text: ["Open to", "below"] }],

  stairs: [
    { from: [136, 197], to: [175, 283], treads: 12, label: "West stair" },
    { from: [550, 215], to: [570, 298], treads: 14 },
    { from: [861, 197], to: [900, 286], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [442, 198], to: [462, 230] },
    { from: [442, 230], to: [462, 262] },
    { from: [442, 262], to: [462, 292] },
  ],

  looseDesks: [
    { n: 2173, at: [38, 312] },
    { n: 2087, at: [988, 310] },
  ],
  pods: [
    { spine: 117, ticks: N, left: [], right: seq(2007, 2010), half: 21 },
    { spine: 191, ticks: N, left: seq(2014, 2011), right: seq(2015, 2018) },
    { spine: 267, ticks: N, left: seq(2022, 2019), right: seq(2023, 2026) },
    { spine: 343, ticks: N, left: seq(2030, 2027), right: seq(2031, 2034) },
    { spine: 419, ticks: N, left: seq(2038, 2035), right: seq(2039, 2042) },
    { spine: 588, ticks: N, left: [], right: seq(2043, 2046), half: 21 },
    { spine: 663, ticks: N, left: seq(2050, 2047), right: seq(2051, 2054) },
    { spine: 738, ticks: N, left: seq(2058, 2055), right: seq(2059, 2062) },
    { spine: 815, ticks: N, left: seq(2066, 2063), right: seq(2067, 2070) },
    { spine: 890, ticks: N, left: seq(2074, 2071), right: seq(2075, 2078) },
    { spine: 965, ticks: N, left: seq(2082, 2079), right: seq(2083, 2086) },

    { spine: 71, ticks: S, left: [], right: seq(2169, 2166) },
    { spine: 71, ticks: S.slice(1), left: seq(2170, 2172), right: [] },
    { spine: 145, ticks: S, left: seq(2162, 2165), right: seq(2161, 2158) },
    { spine: 220, ticks: S, left: seq(2154, 2157), right: seq(2153, 2150) },
    { spine: 297, ticks: S, left: seq(2146, 2149), right: seq(2145, 2142) },
    { spine: 373, ticks: S, left: seq(2138, 2141), right: seq(2137, 2134) },
    { spine: 448, ticks: S.slice(1), left: seq(2131, 2133), right: [], half: 21 },
    { spine: 590, ticks: S.slice(1), left: [], right: seq(2128, 2130), half: 21 },
    { spine: 665, ticks: S, left: [], right: seq(2119, 2122) },
    { spine: 665, ticks: S.slice(1), left: seq(2125, 2123), right: [] },
    { spine: 741, ticks: S, left: seq(2118, 2115), right: seq(2111, 2114) },
    { spine: 815, ticks: S, left: seq(2110, 2107), right: seq(2103, 2106) },
    { spine: 890, ticks: S, left: seq(2102, 2099), right: seq(2095, 2098) },
    { spine: 963, ticks: S, left: seq(2094, 2091), right: [] },
    { spine: 963, ticks: S.slice(1), left: [], right: seq(2088, 2090) },
  ],

  halls: [
    [[70, 182], [1000, 182]],
    [[35, 300], [1000, 300]],
    ...[82, 480, 944].map((x): [number, number][] => [[x, 182], [x, 300]]),
    ...[90, 152, 229, 305, 381, 470, 579, 625, 700, 777, 852, 928, 1000].map((x): [number, number][] => [
      [x, 182],
      [x, 35],
    ]),
    ...[35, 108, 183, 259, 335, 411, 580, 628, 703, 778, 852, 927, 1000].map((x): [number, number][] => [
      [x, 300],
      [x, 440],
    ]),
  ],
} satisfies FloorSpec;

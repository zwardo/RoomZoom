import { seq, type FloorSpec } from "../draw";

const N4 = [33, 65, 98, 129, 162];
const N5 = [33, 57, 80, 104, 128, 151];
const S4 = [311, 343, 376, 408, 439];
const SE4 = [328, 357, 385, 413, 442];
const S5 = [324, 348, 372, 396, 419, 442];

export default {
  building: "Building 2",
  floor: "3",
  source: "B2F3.jpg (1024x479, de-skewed)",
  fit: [
    [[19, 15], [15.5, 16]],
    [[1014, 15], [4670.5, 16]],
    [[19, 455], [15.5, 2059.5]],
  ],
  deskPrefix: "2-",

  rooms: [
    // North
    { rect: [[472, 36], [560, 150]], label: ["Bach", "340"], book: { key: "bach", door: [478, 150] } },
    { rect: [[577, 58], [602, 95]], label: ["Phone", "341"] },
    { rect: [[577, 105], [602, 130]], label: ["Phone", "342"] },

    // Middle band, west to east
    { rect: [[64, 182], [115, 237]], label: ["Vaughn", "320"], book: { key: "vaughn", door: [108, 182] } },
    { rect: [[64, 237], [115, 290]], label: ["Parker", "321"], book: { key: "parker", door: [108, 290] } },
    { rect: [[115, 182], [166, 290]] },
    { rect: [[118, 275], [163, 290]], kind: "service", label: ["Electrical", "322"] },
    { rect: [[167, 205], [202, 260]], kind: "service", label: ["IDF", "324"] },
    { rect: [[167, 260], [202, 290]], kind: "service", label: ["Storage", "323"] },
    { rect: [[202, 182], [235, 205]], kind: "service", label: ["Stor."] },
    { rect: [[237, 182], [272, 290]], label: ["Copy /", "Break", "325"] },
    { rect: [[275, 182], [342, 236]], label: ["Coltrane", "326"], book: { key: "coltrane", door: [335, 182] } },
    { rect: [[275, 236], [342, 290]], label: ["Davis", "327"], book: { key: "davis", door: [335, 290] } },
    { rect: [[342, 182], [405, 290]], label: ["Bizet", "328"], book: { key: "bizet", door: [395, 290] } },
    { rect: [[405, 182], [438, 236]], kind: "service", label: ["Antenna", "330"] },
    { rect: [[405, 236], [438, 290]], label: ["Quiet", "Room", "329"] },
    { rect: [[438, 175], [472, 297]] },
    { rect: [[497, 185], [540, 287]], label: ["Open to", "below"] },
    { rect: [[583, 182], [688, 292]], kind: "service" },
    { rect: [[607, 182], [688, 237]], kind: "service", label: ["Women"] },
    { rect: [[607, 245], [688, 292]], kind: "service", label: ["Men"] },
    { rect: [[688, 182], [763, 235]], label: ["Lennon", "332"], book: { key: "lennon", door: [757, 182] } },
    { rect: [[688, 235], [763, 290]], label: ["Dylan", "331"], book: { key: "dylan", door: [698, 290] } },
    { rect: [[763, 182], [795, 290]], label: ["Copy /", "Break", "333"] },
    { rect: [[795, 182], [837, 198]], kind: "service", label: ["Storage 335"] },
    { rect: [[837, 205], [868, 290]], kind: "service", label: ["Storage", "334"] },
    { rect: [[870, 275], [915, 290]], kind: "service", label: ["Electrical", "336"] },
    { rect: [[918, 182], [968, 236]], label: ["Martin", "338"], book: { key: "martin", door: [925, 182] } },
    { rect: [[918, 236], [968, 290]], label: ["Sinatra", "337"], book: { key: "sinatra", door: [925, 290] } },

    // South
    { rect: [[430, 343], [455, 368]], label: ["Phone"] },
    { rect: [[430, 368], [455, 395]], label: ["Phone"] },
    { rect: [[430, 395], [455, 420]], label: ["Phone"] },
    { rect: [[472, 323], [562, 435]], label: ["Caruso", "339"], book: { key: "caruso", door: [555, 323] } },
  ],

  walls: [
    { points: [[602, 33], [602, 130], [627, 130]] },
    { points: [[472, 177], [565, 177]] },
    { points: [[472, 295], [565, 295]] },
    { points: [[563, 175], [563, 297]], width: 6 },
  ],
  labels: [{ at: [665, 75], text: ["Robotics", "Lab"] }],

  stairs: [
    { from: [118, 186], to: [163, 273], treads: 12, label: "West stair" },
    { from: [541, 188], to: [561, 287], treads: 12 },
    { from: [868, 182], to: [918, 268], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [205, 205], to: [233, 287] },
    { from: [442, 186], to: [467, 236] },
    { from: [442, 236], to: [467, 287] },
    { from: [800, 202], to: [833, 287] },
  ],

  looseDesks: [{ n: 3032, at: [356, 26] }],
  pods: [
    { spine: 63, ticks: N4, left: seq(3000, 3003), right: seq(3007, 3004) },
    { spine: 135, ticks: N4, left: seq(3008, 3011), right: seq(3015, 3012) },
    { spine: 208, ticks: N4, left: seq(3016, 3019), right: seq(3023, 3020) },
    { spine: 282, ticks: N4, left: seq(3024, 3027), right: seq(3031, 3028) },
    { spine: 356, ticks: [36, 68, 99, 120, 141, 162], left: seq(3033, 3037), right: seq(3042, 3038) },
    { spine: 428, ticks: [56, 87, 110, 128, 151], left: seq(3043, 3046), right: [] },
    { spine: 428, ticks: [56, 87, 119, 151], left: [], right: seq(3049, 3047) },
    { spine: 747, ticks: N5, left: seq(3064, 3060), right: seq(3065, 3069) },
    { spine: 821, ticks: N5, left: seq(3074, 3070), right: seq(3075, 3079) },
    { spine: 895, ticks: N5, left: seq(3084, 3080), right: seq(3085, 3089) },
    { spine: 967, ticks: N5, left: seq(3094, 3090), right: seq(3095, 3099) },

    { spine: 64, ticks: S4, left: seq(3193, 3196), right: seq(3192, 3189) },
    { spine: 136, ticks: S4, left: seq(3185, 3188), right: seq(3184, 3181) },
    { spine: 209, ticks: S4, left: seq(3177, 3180), right: seq(3176, 3173) },
    { spine: 283, ticks: S4, left: seq(3169, 3172), right: seq(3168, 3165) },
    { spine: 357, ticks: S4, left: seq(3161, 3164), right: seq(3160, 3157) },
    { spine: 430, ticks: [343, 376, 408, 440], left: seq(3154, 3156), right: [] },
    { spine: 608, ticks: SE4, left: seq(3153, 3150), right: seq(3146, 3149) },
    { spine: 680, ticks: SE4, left: seq(3145, 3142), right: seq(3138, 3141) },
    { spine: 752, ticks: SE4, left: seq(3137, 3134), right: seq(3130, 3133) },
    { spine: 822, ticks: S5, left: seq(3129, 3125), right: seq(3120, 3124) },
    { spine: 896, ticks: S5, left: seq(3119, 3115), right: seq(3110, 3114) },
    { spine: 968, ticks: S5, left: seq(3109, 3105), right: seq(3100, 3104) },
  ],

  halls: [
    [[27, 169], [1003, 169]],
    [[27, 304], [1003, 304]],
    ...[50, 485, 573, 983].map((x): [number, number][] => [[x, 169], [x, 304]]),
    ...[27, 99, 171, 244, 318, 391, 461, 650, 712, 784, 857, 931, 1003].map((x): [number, number][] => [[x, 169], [x, 30]]),
    ...[27, 100, 172, 246, 320, 393, 573, 644, 715, 788, 860, 932, 1003].map((x): [number, number][] => [[x, 304], [x, 445]]),
  ],
} satisfies FloorSpec;

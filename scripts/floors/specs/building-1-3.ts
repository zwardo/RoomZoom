import { seq, type FloorSpec } from "../draw";

const N = [38, 69, 99, 130, 161];
const S = [303, 334, 364, 395, 425];

export default {
  building: "Building 1",
  floor: "3",
  source: "B1F3.jpg (1024x474, de-skewed)",
  fit: [
    [[13, 15], [15.5, 84]],
    [[1008, 15], [4670.5, 84]],
    [[13, 450], [15.5, 2062.5]],
  ],
  deskPrefix: "1-",

  rooms: [
    // North
    { rect: [[13, 148], [51, 190]] },
    { rect: [[972, 148], [1008, 190]] },
    {
      points: [[490, 35], [497, 3], [552, 3], [552, 35], [562, 35], [562, 80], [487, 80]],
      label: ["Mt. Sinai", "306"],
      labelAt: [524, 50],
      book: { key: "mt-sinai", door: [562, 70] },
    },
    {
      points: [[487, 80], [562, 80], [562, 128], [484, 128]],
      label: ["Mt. Kilimanjaro", "307"],
      book: { key: "mt-kilimanjaro", door: [562, 120] },
    },

    // Middle band, west to east
    { rect: [[28, 190], [73, 232]], label: ["Mt. Tyree", "321"], book: { key: "mt-tyree", door: [73, 205] } },
    { rect: [[28, 232], [73, 273]], label: ["Mt. Moroto", "322"], book: { key: "mt-moroto", door: [73, 262] } },
    { rect: [[93, 185], [125, 215]], label: ["Phone", "342"] },
    { rect: [[93, 215], [125, 247]], label: ["Phone", "341"] },
    { rect: [[93, 247], [125, 280]], label: ["Phone", "340"] },
    { rect: [[125, 185], [172, 280]] },
    { rect: [[172, 207], [200, 280]], kind: "service" },
    { rect: [[200, 185], [240, 207]], kind: "service", label: ["Elec", "318"] },
    { rect: [[200, 207], [240, 280]], kind: "service", label: ["Storage", "320"] },
    { rect: [[240, 185], [270, 280]], label: ["Copy /", "Break", "314"] },
    { rect: [[270, 185], [350, 232]], label: ["Mt. Cameroon", "313"], book: { key: "mt-cameroon", door: [285, 185] } },
    { rect: [[270, 232], [350, 280]], label: ["Mt. Elkins", "315"], book: { key: "mt-elkins", door: [285, 280] } },
    { rect: [[350, 185], [395, 232]], kind: "service", label: ["Storage", "311"] },
    { rect: [[350, 232], [395, 280]], kind: "service", label: ["Storage", "316"] },
    { rect: [[395, 185], [430, 222]], kind: "service", label: ["Antenna", "310"] },
    { rect: [[395, 222], [430, 262]], label: ["Quiet", "Room", "317"] },
    { rect: [[430, 183], [463, 290]] },
    { rect: [[512, 183], [562, 298]], label: ["Mt. Markham", "343"], book: { key: "mt-markham", door: [560, 190] } },
    { rect: [[562, 185], [675, 290]], kind: "service" },
    { rect: [[575, 185], [618, 285]], kind: "service", label: ["Men", "302"] },
    { rect: [[620, 185], [673, 285]], kind: "service", label: ["Women", "301"] },
    { rect: [[675, 185], [708, 255]], kind: "service", label: ["IDF", "333"] },
    { rect: [[675, 255], [708, 290]], kind: "service", label: ["Janitor", "327"] },
    {
      rect: [[708, 185], [748, 240]],
      label: ["Table", "Mountain", "332"],
      book: { key: "table-mountain", door: [712, 185] },
    },
    { rect: [[708, 240], [748, 290]], label: ["Quiet", "Room", "328"] },
    { rect: [[748, 185], [780, 290]], label: ["Copy /", "Break", "329"] },
    { rect: [[780, 185], [822, 210]], kind: "service", label: ["Elec", "331"] },
    { rect: [[780, 210], [822, 290]], kind: "service", label: ["Storage", "330"] },
    { rect: [[822, 185], [850, 290]], kind: "service" },
    { rect: [[850, 185], [897, 290]] },
    { rect: [[897, 185], [930, 215]], label: ["Phone", "339"] },
    { rect: [[897, 215], [930, 250]], label: ["Phone", "338"] },
    { rect: [[897, 250], [930, 290]], label: ["Phone", "337"] },
    { rect: [[948, 190], [995, 232]], label: ["Mt. Kenya", "335"], book: { key: "mt-kenya", door: [948, 205] } },
    { rect: [[948, 232], [995, 273]], label: ["Mt. Emin", "334"], book: { key: "mt-emin", door: [948, 262] } },

    // South
    { rect: [[972, 278], [1008, 313]] },
    { rect: [[460, 333], [512, 430]], label: ["Mt. Jackson", "324"], book: { key: "mt-jackson", door: [465, 340] } },
    { rect: [[512, 333], [562, 430]], label: ["Mt. Baker", "325"], book: { key: "mt-baker", door: [555, 340] } },
  ],

  stairs: [
    { from: [128, 190], to: [169, 276], treads: 12, label: "West stair" },
    { from: [488, 190], to: [510, 292], treads: 14 },
    { from: [853, 190], to: [894, 286], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [435, 190], to: [458, 222] },
    { from: [435, 225], to: [458, 257] },
    { from: [435, 260], to: [458, 285] },
  ],

  looseDesks: [
    { n: 3003, at: [30, 175] },
    { n: 3087, at: [988, 175] },
    { n: 3088, at: [988, 303] },
  ],
  pods: [
    { spine: 34, ticks: N.slice(0, 4), left: [], right: seq(3000, 3002), half: 21 },
    { spine: 110, ticks: N, left: seq(3004, 3007), right: seq(3011, 3008) },
    { spine: 185, ticks: N, left: seq(3012, 3015), right: seq(3019, 3016) },
    { spine: 260, ticks: N, left: seq(3020, 3023), right: seq(3027, 3024) },
    { spine: 337, ticks: N, left: seq(3028, 3031), right: seq(3035, 3032) },
    { spine: 413, ticks: N, left: seq(3036, 3039), right: seq(3043, 3040) },
    { spine: 583, ticks: N, left: [], right: seq(3044, 3047), half: 21 },
    { spine: 658, ticks: N, left: seq(3051, 3048), right: seq(3052, 3055) },
    { spine: 733, ticks: N, left: seq(3059, 3056), right: seq(3060, 3063) },
    { spine: 810, ticks: N, left: seq(3067, 3064), right: seq(3068, 3071) },
    { spine: 885, ticks: N, left: seq(3075, 3072), right: seq(3076, 3079) },
    { spine: 958, ticks: N, left: seq(3083, 3080), right: seq(3084, 3086) },

    { spine: 63, ticks: S, left: seq(3175, 3172), right: seq(3168, 3171) },
    { spine: 139, ticks: S, left: seq(3167, 3164), right: seq(3160, 3163) },
    { spine: 214, ticks: S, left: seq(3159, 3156), right: seq(3152, 3155) },
    { spine: 290, ticks: S, left: seq(3151, 3148), right: seq(3144, 3147) },
    { spine: 366, ticks: S, left: seq(3143, 3140), right: seq(3136, 3139) },
    { spine: 442, ticks: [306, 337, 368, 399, 430], left: seq(3135, 3132), right: [], half: 21 },
    { spine: 583, ticks: S.slice(1), left: [], right: seq(3129, 3131), half: 21 },
    { spine: 658, ticks: S, left: [], right: seq(3120, 3123) },
    { spine: 658, ticks: S.slice(1), left: seq(3126, 3124), right: [] },
    { spine: 733, ticks: S, left: seq(3119, 3116), right: seq(3112, 3115) },
    { spine: 808, ticks: S, left: seq(3111, 3108), right: seq(3104, 3107) },
    { spine: 883, ticks: S, left: seq(3103, 3100), right: seq(3096, 3099) },
    { spine: 958, ticks: S, left: seq(3095, 3092), right: [] },
    { spine: 958, ticks: S.slice(1), left: [], right: seq(3089, 3091) },
  ],

  halls: [
    [[25, 175], [988, 175]],
    [[28, 297], [988, 297]],
    ...[83, 475, 940].map((x): [number, number][] => [[x, 175], [x, 297]]),
    ...[72, 148, 222, 298, 375, 452, 620, 696, 771, 847, 921].map((x): [number, number][] => [[x, 175], [x, 30]]),
    [[921, 30], [995, 30], [995, 140]],
    ...[28, 101, 176, 252, 328, 404, 572, 620, 696, 771, 846, 921].map((x): [number, number][] => [[x, 297], [x, 440]]),
    [[921, 320], [995, 320], [995, 440]],
  ],
} satisfies FloorSpec;

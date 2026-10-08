import { seq, type FloorSpec } from "../draw";

const N = [44, 75, 106, 137, 167];
const S = [310, 340, 371, 402, 432];
const R436 = [332, 362, 393, 424, 455];

export default {
  building: "Building 1",
  floor: "4",
  source: "B1F4.jpg (1024x475, de-skewed)",
  fit: [
    [[7, 20], [15.5, 84]],
    [[1011, 20], [4670.5, 84]],
    [[7, 456], [15.5, 2062.5]],
  ],
  deskPrefix: "1-",

  rooms: [
    // North
    { rect: [[7, 153], [46, 197]] },
    { rect: [[975, 153], [1011, 197]] },
    { rect: [[302, 45], [439, 167]], label: ["Engineering", "Lab", "408"] },
    {
      points: [[460, 40], [492, 40], [497, 5], [552, 5], [552, 40], [560, 40], [560, 137], [460, 137]],
      label: ["Matterhorn", "Boardroom", "406"],
      labelAt: [510, 85],
      book: { key: "matterhorn", door: [460, 83] },
    },

    // Middle band, west to east
    { rect: [[23, 197], [68, 238]], label: ["Hekla", "417"], book: { key: "hekla", door: [68, 215] } },
    { rect: [[23, 238], [68, 278]], label: ["Cotopaxi", "418"], book: { key: "cotopaxi", door: [68, 262] } },
    { rect: [[88, 192], [120, 223]], label: ["Phone", "437"] },
    { rect: [[88, 223], [120, 255]], label: ["Phone", "438"] },
    { rect: [[88, 255], [120, 287]], label: ["Phone", "439"] },
    { rect: [[120, 192], [167, 287]] },
    { rect: [[167, 215], [192, 287]], kind: "service" },
    { rect: [[192, 192], [233, 215]], kind: "service", label: ["Elec", "415"] },
    { rect: [[192, 215], [233, 287]], kind: "service", label: ["Storage", "416"] },
    { rect: [[233, 192], [270, 287]], label: ["Copy /", "Break", "414"] },
    { rect: [[273, 192], [322, 287]], label: ["Dom", "413"], book: { key: "dom", door: [315, 192] } },
    {
      points: [[322, 192], [373, 192], [373, 230], [390, 230], [390, 287], [322, 287]],
      label: ["Illimani", "412"],
      labelAt: [352, 255],
      book: { key: "illimani", door: [328, 287] },
    },
    { rect: [[373, 192], [427, 230]], kind: "service", label: ["Antenna", "411"] },
    { rect: [[390, 230], [427, 263]], kind: "service", label: ["Elev.", "Control", "410"] },
    { rect: [[427, 190], [458, 297]] },
    { rect: [[560, 192], [673, 297]], kind: "service" },
    { rect: [[565, 192], [615, 280]], kind: "service", label: ["Men", "402"] },
    { rect: [[615, 192], [673, 280]], kind: "service", label: ["Women", "401"] },
    { rect: [[673, 192], [707, 253]], kind: "service", label: ["IDF", "424"] },
    { rect: [[673, 253], [707, 287]], kind: "service", label: ["Janitor", "423"] },
    { rect: [[707, 192], [748, 238]], kind: "service", label: ["Storage", "425"] },
    { rect: [[707, 238], [748, 287]], kind: "service", label: ["Storage", "426"] },
    { rect: [[748, 192], [783, 287]], label: ["Copy /", "Break", "427"] },
    { rect: [[783, 192], [825, 215]], kind: "service", label: ["Elec", "429"] },
    { rect: [[783, 215], [825, 287]], kind: "service", label: ["Storage", "428"] },
    { rect: [[825, 192], [852, 287]], kind: "service" },
    { rect: [[852, 192], [898, 287]] },
    { rect: [[898, 192], [932, 223]], label: ["Phone", "433"] },
    { rect: [[898, 223], [932, 255]], label: ["Phone", "434"] },
    { rect: [[898, 255], [932, 287]], label: ["Phone", "435"] },
    { rect: [[952, 197], [996, 238]], label: ["Nadelhorn", "431"], book: { key: "nadelhorn", door: [952, 215] } },
    { rect: [[952, 238], [996, 278]], label: ["Brocken", "430"], book: { key: "brocken", door: [952, 262] } },

    // South
    { rect: [[458, 360], [509, 437]], label: ["Olympus", "420"], book: { key: "olympus", door: [465, 360] } },
    { rect: [[509, 360], [562, 437]], label: ["Mt. Blanc", "421"], book: { key: "mt-blanc", door: [555, 360] } },
    { rect: [[907, 315], [1003, 456]], label: ["436"], labelAt: [957, 322] },
  ],

  labels: [
    { at: [520, 168], text: ["Open to below"] },
    { at: [535, 240], text: ["Mt. Etna", "Open Conf.", "400A"] },
  ],

  stairs: [
    { from: [123, 197], to: [164, 282], treads: 12, label: "West stair" },
    { from: [486, 200], to: [507, 295], treads: 14 },
    { from: [855, 197], to: [895, 282], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [430, 195], to: [455, 228] },
    { from: [430, 228], to: [455, 260] },
    { from: [430, 262], to: [455, 292] },
  ],

  looseDesks: [
    { n: 4003, at: [25, 178] },
    { n: 4071, at: [992, 178] },
  ],
  pods: [
    { spine: 28, ticks: N.slice(0, 4), left: [], right: seq(4000, 4002), half: 21 },
    { spine: 104, ticks: N, left: seq(4007, 4004), right: seq(4008, 4011) },
    { spine: 179, ticks: N, left: seq(4015, 4012), right: seq(4016, 4019) },
    { spine: 257, ticks: N, left: seq(4023, 4020), right: seq(4024, 4027) },
    { spine: 580, ticks: N, left: [], right: seq(4028, 4031), half: 21 },
    { spine: 655, ticks: N, left: seq(4035, 4032), right: seq(4036, 4039) },
    { spine: 732, ticks: N, left: seq(4043, 4040), right: seq(4044, 4047) },
    { spine: 810, ticks: N, left: seq(4051, 4048), right: seq(4052, 4055) },
    { spine: 886, ticks: N, left: seq(4059, 4056), right: seq(4060, 4063) },
    { spine: 961, ticks: N, left: seq(4067, 4064), right: seq(4068, 4070) },

    { spine: 59, ticks: S, left: seq(4152, 4155), right: seq(4151, 4148) },
    { spine: 134, ticks: S, left: seq(4144, 4147), right: seq(4143, 4140) },
    { spine: 209, ticks: S, left: seq(4136, 4139), right: seq(4135, 4132) },
    { spine: 286, ticks: S, left: seq(4128, 4131), right: seq(4127, 4124) },
    { spine: 363, ticks: S, left: seq(4120, 4123), right: seq(4119, 4116) },
    { spine: 439, ticks: [313, 343, 375, 406, 437], left: seq(4112, 4115), right: [], half: 21 },
    { spine: 616, ticks: [339, 371, 402, 433], left: seq(4110, 4108), right: seq(4105, 4107) },
    { spine: 692, ticks: S, left: seq(4103, 4100), right: seq(4096, 4099) },
    { spine: 767, ticks: S, left: seq(4095, 4092), right: seq(4088, 4091) },
    { spine: 845, ticks: S, left: seq(4087, 4084), right: seq(4080, 4083) },
    { spine: 933, ticks: R436, left: [], right: seq(4079, 4076), half: 22 },
    { spine: 1002, ticks: R436, left: seq(4072, 4075), right: [], half: 22 },
  ],

  halls: [
    [[25, 180], [992, 180]],
    [[22, 302], [996, 302]],
    ...[78, 470, 535, 942].map((x): [number, number][] => [[x, 180], [x, 302]]),
    ...[66, 141, 218, 290, 450, 617, 694, 771, 848, 923].map((x): [number, number][] => [[x, 180], [x, 35]]),
    [[923, 35], [996, 35], [996, 150]],
    ...[22, 96, 171, 248, 325, 401, 578, 653, 729, 806, 886].map((x): [number, number][] => [[x, 302], [x, 445]]),
    [[886, 318], [967, 318], [967, 450]],
  ],
} satisfies FloorSpec;

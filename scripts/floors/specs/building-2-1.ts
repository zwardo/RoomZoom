import { seq, type FloorSpec } from "../draw";

const NE = [280, 312, 344, 376, 408];
const SE = [560, 593, 625, 658, 691];
const SW = [563, 595, 628, 661, 693];

export default {
  building: "Building 2",
  floor: "1",
  source: "B2F1.jpg (1024x729, de-skewed)",
  fit: [
    [[20, 258], [15.5, 16]],
    [[1003, 259], [4670.5, 16]],
    [[20, 707], [15.5, 2059.5]],
  ],
  offsetY: 1200,
  deskPrefix: "2-",

  // Pavilion and the connector to Building 1, north of the shared outline.
  extraShell: [
    [[41, -4], [115, 135], [25, 135], [25, 152], [37, 152], [37, 236], [20, 236], [20, 258]],
    [[87, -4], [124, 69], [397, 69], [448, 232], [448, 262]],
  ],
  openings: [[[389, 255], [440, 265]]],

  rooms: [
    // Pavilion
    { rect: [[28, 0], [39, 7]] },
    { rect: [[85, 0], [99, 7]] },
    { rect: [[45, 22], [60, 39]] },
    { rect: [[94, 21], [112, 39]] },
    { rect: [[25, 135], [129, 152]] },
    { rect: [[37, 207], [67, 234]], label: ["Vest."] },
    { rect: [[202, 186], [308, 232]], label: ["Kitchen", "153"] },
    { rect: [[328, 186], [385, 232]], kind: "service", label: ["Storage"] },

    // West block: training rooms
    { rect: [[20, 258], [117, 400]], label: ["Training", "Room D", "140"], labelAt: [68, 325], book: { key: "training-room-d", door: [95, 400] } },
    { points: [[117, 258], [233, 258], [233, 373], [161, 387], [161, 400], [117, 400]], label: ["Training", "Room E", "141"], labelAt: [175, 322], book: { key: "training-room-e", door: [205, 380] } },
    { points: [[233, 258], [331, 258], [331, 357], [233, 373]], label: ["Training", "Room F", "142"], labelAt: [282, 315], book: { key: "training-room-f", door: [315, 357] } },
    { rect: [[331, 260], [387, 343]], label: ["Lovelace", "143"], book: { key: "lovelace", door: [360, 343] } },

    // West block: middle band
    { rect: [[35, 430], [110, 472]], kind: "service", label: ["EMT Pass."] },
    { rect: [[35, 472], [88, 537]], label: ["Einstein", "120"], book: { key: "einstein", door: [60, 537] } },
    { rect: [[88, 472], [115, 537]], label: ["Corr."] },
    { rect: [[120, 520], [162, 537]], kind: "service", label: ["Electrical"] },
    { rect: [[165, 428], [242, 507]], kind: "service", label: ["MDF", "124"], labelAt: [185, 478] },
    { rect: [[203, 428], [242, 462]], kind: "service", label: ["UPS"] },
    { rect: [[165, 507], [242, 537]], label: ["Copy / Break"] },
    { rect: [[242, 428], [253, 537]], kind: "service" },
    { rect: [[253, 428], [293, 500]], label: ["Catering", "Kitchen"] },
    { rect: [[253, 500], [298, 537]], kind: "service", label: ["Storage", "127"] },
    { rect: [[298, 428], [348, 498]], kind: "service", label: ["Storage"] },
    { rect: [[348, 400], [400, 498]], label: ["Galileo", "130"], book: { key: "galileo", door: [375, 400] } },
    { rect: [[298, 500], [367, 537]], kind: "service", label: ["Storage", "129"] },
    { rect: [[367, 500], [400, 537]], label: ["Quiet", "Room"] },
    { rect: [[402, 400], [447, 427]], label: ["Newton", "134"], book: { key: "newton", door: [410, 400] } },
    { rect: [[402, 428], [435, 472]], kind: "service", label: ["Antenna"] },
    { rect: [[402, 472], [435, 510]], kind: "service", label: ["Elec.", "Waste"] },
    { points: [[468, 280], [557, 280], [557, 318], [478, 318]], label: ["Vestibule"] },

    // West block: south
    { rect: [[20, 563], [110, 707]], label: ["Photo-", "grammetry", "148"] },
    { rect: [[110, 563], [145, 645]], kind: "service", label: ["Storage", "147"] },
    { rect: [[110, 645], [145, 707]], kind: "service", label: ["Elec.", "145"] },
    { rect: [[145, 563], [233, 707]], label: ["Makerspace", "146"], labelAt: [180, 620] },
    { rect: [[200, 648], [233, 707]], kind: "service", label: ["Water", "Entry Rm", "144"] },
    { points: [[469, 647], [541, 647], [557, 687], [469, 687]], label: ["Vestibule"] },

    // East wing: core band
    { rect: [[578, 426], [752, 537]], kind: "service" },
    { rect: [[600, 426], [702, 479]], kind: "service", label: ["Women"] },
    { rect: [[600, 483], [702, 537]], kind: "service", label: ["Men"] },
    { rect: [[600, 475], [622, 492]], kind: "service" },
    { rect: [[702, 426], [752, 479]], kind: "service", label: ["W Shower"] },
    { rect: [[702, 483], [752, 537]], kind: "service", label: ["M Shower"] },
    { rect: [[752, 426], [790, 537]], label: ["Copy /", "Break"] },
    { rect: [[790, 427], [857, 538]], label: ["Media", "Room", "136"] },
    { rect: [[860, 520], [903, 538]], kind: "service", label: ["Electrical"] },
    { rect: [[947, 427], [987, 475]], kind: "service", label: ["Exit", "Passageway", "103A"] },
    { points: [[907, 460], [945, 460], [945, 475], [987, 475], [987, 538], [907, 538]], label: ["Curie", "139"], labelAt: [947, 506], book: { key: "curie", door: [925, 460] } },
    { points: [[577, 593], [618, 577], [646, 650], [615, 663]], label: ["Break"], labelAt: [648, 600] },
  ],

  walls: [
    { points: [[90, 232], [386, 232]], width: 6 },
    { points: [[20, 400], [161, 400], [161, 387], [331, 357]] },
    { points: [[331, 343], [387, 343]] },
    { points: [[433, 571], [469, 571], [469, 707]] },
    { points: [[557, 259], [557, 400], [593, 400]] },
    { points: [[557, 420], [557, 545]], width: 6 },
    { points: [[467, 420], [557, 420]] },
    { points: [[467, 538], [557, 538]] },
    { points: [[671, 552], [671, 703]] },
  ],

  labels: [
    { at: [73, 28], text: ["Connector", "151"] },
    { at: [250, 133], text: ["Pavilion", "150"] },
    { at: [193, 243], text: ["Ramp 155"] },
    { at: [451, 413], text: ["Elevator"] },
    { at: [505, 360], text: ["Lobby"] },
    { at: [513, 600], text: ["Lobby"] },
  ],

  stairs: [
    { from: [386, 188], to: [441, 230], treads: 9 },
    { from: [115, 428], to: [163, 520], treads: 12, label: "West stair" },
    { from: [510, 432], to: [555, 510], treads: 12, label: "Stair" },
    { from: [857, 427], to: [907, 518], treads: 12, label: "East stair" },
  ],
  shafts: [
    { from: [437, 430], to: [465, 482] },
    { from: [437, 482], to: [465, 533] },
  ],
  doors: [
    { hinge: [88, 400], toward: [1, 1] },
    { hinge: [195, 383], toward: [1, 1] },
    { hinge: [305, 361], toward: [1, 1] },
    { hinge: [402, 400], toward: [1, 1], radius: 52 },
    { hinge: [857, 538], toward: [-1, -1], radius: 52 },
  ],

  pods: [
    { spine: 607, ticks: NE.slice(0, 4), left: seq(1000, 1002), right: seq(1003, 1005) },
    { spine: 677, ticks: NE, left: seq(1009, 1006), right: seq(1010, 1013) },
    { spine: 748, ticks: NE, left: seq(1017, 1014), right: seq(1018, 1021) },
    { spine: 819, ticks: NE, left: seq(1025, 1022), right: seq(1026, 1029) },
    { spine: 890, ticks: NE, left: seq(1033, 1030), right: seq(1034, 1037) },
    { spine: 960, ticks: NE, left: seq(1041, 1038), right: seq(1042, 1045) },
    { spine: 671, ticks: SE, left: [], right: seq(1078, 1081) },
    { spine: 744, ticks: SE, left: seq(1077, 1074), right: seq(1070, 1073) },
    { spine: 816, ticks: SE, left: seq(1069, 1066), right: seq(1062, 1065) },
    { spine: 887, ticks: SE, left: seq(1061, 1058), right: seq(1054, 1057) },
    { spine: 959, ticks: SE, left: seq(1053, 1050), right: seq(1046, 1049) },
    { spine: 277, ticks: SW, left: seq(1100, 1103), right: seq(1099, 1096) },
    { spine: 350, ticks: SW, left: seq(1092, 1095), right: seq(1091, 1088) },
    { spine: 421, ticks: SW.slice(1), left: seq(1085, 1087), right: seq(1084, 1082) },
  ],

  halls: [
    [[25, 413], [338, 413], [338, 380], [492, 380]],
    [[492, 300], [492, 549]],
    [[492, 417], [993, 417]],
    [[25, 549], [993, 549]],
    [[102, 413], [102, 549]],
    [[492, 340], [420, 250], [260, 150]],
    [[505, 549], [505, 687]],
    [[925, 417], [925, 460]],
    ...[572, 642, 712, 784, 854, 925, 993].map((x): [number, number][] => [[x, 417], [x, 285]]),
    ...[708, 780, 852, 923, 993].map((x): [number, number][] => [[x, 549], [x, 690]]),
    ...[244, 313, 386, 456].map((x): [number, number][] => [[x, 549], [x, 693]]),
  ],
} satisfies FloorSpec;

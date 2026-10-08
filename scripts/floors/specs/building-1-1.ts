import { seq, type FloorSpec } from "../draw";

const N = [62, 91, 122, 152, 182];

export default {
  building: "Building 1",
  floor: "1",
  source: "B1F1.jpg (1024x498, de-skewed)",
  fit: [
    [[13, 37], [15.5, 84]],
    [[1007, 37], [4670.5, 84]],
    [[13, 467], [15.5, 2062.5]],
  ],
  deskPrefix: "1-",

  rooms: [
    // North
    {
      points: [[13, 38], [123, 38], [123, 178], [88, 177], [28, 198], [13, 198]],
      label: ["Training", "Room 1", "111A"],
      labelAt: [68, 100],
      book: { key: "training-room-1", door: [100, 177] },
    },
    {
      points: [[123, 38], [232, 38], [232, 165], [195, 178], [123, 178]],
      label: ["Training", "Room 2", "111B"],
      labelAt: [178, 100],
      book: { key: "training-room-2", door: [210, 172] },
    },
    {
      points: [[232, 38], [305, 38], [305, 150], [232, 165]],
      label: ["Training", "Room 3", "111C"],
      labelAt: [268, 100],
      book: { key: "training-room-3", door: [292, 152] },
    },
    { rect: [[305, 38], [355, 125]], label: ["Mt.", "Whitney", "110"], book: { key: "mt-whitney", door: [312, 125] } },
    { rect: [[355, 38], [405, 125]], label: ["Mt.", "McKinley", "109"], book: { key: "mt-mckinley", door: [362, 125] } },
    { rect: [[405, 38], [455, 125]], label: ["Mt. Blue Sky", "108"], book: { key: "mt-blue-sky", door: [412, 125] } },
    { rect: [[340, 165], [415, 200]], kind: "service", label: ["Training Rm", "Storage 112"] },
    { rect: [[415, 165], [455, 200]], label: ["Mt. Hood", "106"], book: { key: "mt-hood", door: [455, 175] } },
    { rect: [[560, 38], [600, 78]], kind: "service", label: ["Water", "Entry Rm", "136"] },
    { rect: [[560, 80], [605, 117]], label: ["Mt. Bear", "137"], book: { key: "mt-bear", door: [605, 88] } },
    { rect: [[560, 117], [605, 155]], kind: "service", label: ["Mail", "Services", "138"] },
    { rect: [[560, 155], [605, 190]], label: ["Security /", "Badging", "139"] },

    // Middle band, west to east
    { rect: [[28, 205], [122, 240]], label: ["Exit Corridor", "104A"] },
    { rect: [[122, 207], [167, 300]] },
    { rect: [[170, 205], [195, 235]], kind: "service", label: ["Elec", "114"] },
    { rect: [[195, 205], [222, 235]], kind: "service", label: ["Restroom"] },
    { rect: [[247, 207], [340, 235]], label: ["Catering", "113A"] },
    { rect: [[342, 207], [395, 235]], kind: "service", label: ["A/V", "113B"] },
    { rect: [[167, 235], [395, 305]], kind: "service", label: ["Storage Room", "123"] },
    { rect: [[395, 207], [425, 235]], kind: "service", label: ["Antenna", "124"] },
    { rect: [[395, 250], [425, 275]], kind: "service", label: ["Waste", "122"] },
    { rect: [[425, 205], [458, 310]] },
    { rect: [[558, 205], [672, 305]], kind: "service" },
    { rect: [[563, 205], [615, 300]], kind: "service", label: ["Men", "102"] },
    { rect: [[615, 205], [670, 300]], kind: "service", label: ["Women", "101"] },
    { rect: [[675, 205], [735, 290]], label: ["IS Help", "Desk", "134"] },
    { rect: [[735, 230], [770, 297]] },
    { rect: [[675, 290], [748, 330]], kind: "service", label: ["IS Closet", "133"] },
    { rect: [[635, 305], [672, 330]], kind: "service", label: ["Janitor", "132"] },
    { rect: [[770, 205], [850, 300]], kind: "service", label: ["MDF", "130"] },
    { rect: [[850, 205], [895, 300]] },
    { rect: [[895, 205], [995, 235]], label: ["Exit Corridor", "103A"] },
    { rect: [[895, 235], [945, 300]], kind: "service", label: ["Men's", "Locker", "128"] },
    { rect: [[945, 235], [995, 300]], kind: "service", label: ["Women's", "Locker", "127"] },
    { rect: [[860, 300], [895, 330]], kind: "service", label: ["Elec", "129"] },

    // South
    { rect: [[13, 335], [152, 467]], kind: "service", label: ["Storage Room", "116"] },
    { rect: [[152, 335], [232, 467]], label: ["Shipping /", "Receiving", "117"] },
    { rect: [[275, 335], [302, 398]], kind: "service", label: ["Stor.", "119"] },
    { rect: [[232, 425], [292, 467]], kind: "service", label: ["Main Elec", "118"] },
    { rect: [[340, 335], [400, 467]], kind: "service", label: ["Storage", "Room", "120"] },
    { rect: [[400, 335], [455, 467]], kind: "service", label: ["Technology", "Room", "121"] },
    { rect: [[455, 420], [560, 450]], label: ["Vestibule 100A"] },
    { rect: [[560, 355], [675, 467]], label: ["Break Room", "125A"] },
    { rect: [[675, 355], [710, 445]], label: ["Vending", "125B"] },
    { rect: [[710, 345], [1007, 467]], label: ["Fitness Room", "126"] },
  ],

  labels: [
    { at: [522, 28], text: ["Vestibule", "100B"] },
    { at: [510, 175], text: ["Reception /", "Lobby 100"], title: true },
    { at: [470, 318], text: ["Corridor 115"] },
    { at: [640, 345], text: ["Corridor 131"] },
    { at: [190, 458], text: ["Loading Dock"] },
  ],

  walls: [{ points: [[543, 335], [633, 352]] }],

  stairs: [
    { from: [125, 235], to: [164, 296], treads: 10, label: "West stair" },
    { from: [520, 205], to: [555, 300], treads: 14 },
    { from: [853, 235], to: [892, 296], treads: 10, label: "East stair" },
  ],
  shafts: [
    { from: [430, 210], to: [452, 240] },
    { from: [430, 240], to: [452, 275] },
    { from: [430, 275], to: [452, 305] },
  ],

  looseDesks: [
    { n: 1040, at: [752, 258] },
    { n: 1041, at: [175, 355] },
  ],
  pods: [
    { spine: 655, ticks: N, left: seq(1000, 1003), right: seq(1007, 1004) },
    { spine: 732, ticks: N, left: seq(1008, 1011), right: seq(1015, 1012) },
    { spine: 809, ticks: N, left: seq(1016, 1019), right: seq(1023, 1020) },
    { spine: 885, ticks: N, left: seq(1024, 1027), right: seq(1031, 1028) },
    { spine: 959, ticks: N, left: seq(1032, 1035), right: seq(1039, 1036) },
  ],

  halls: [
    [[500, 60], [500, 322]],
    [[90, 190], [100, 186], [210, 170], [300, 155], [310, 140], [500, 140]],
    [[28, 222], [118, 222]],
    [[90, 222], [90, 190]],
    [[500, 197], [995, 197]],
    ...[620, 695, 770, 847, 922, 995].map((x): [number, number][] => [[x, 197], [x, 50]]),
    [[910, 197], [910, 222], [990, 222]],
    [[720, 197], [720, 258], [752, 258]],
    [[115, 322], [500, 322]],
    [[175, 322], [175, 355]],
    [[500, 322], [600, 340], [720, 345], [870, 345]],
  ],
} satisfies FloorSpec;

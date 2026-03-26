// ═══════════════════════════════════════
//  Global state
// ═══════════════════════════════════════
let lat = 60.6065, lon = 15.6355;
let locationLabel = 'Falun, Dalarna';
let allSeries = [];
let currentIdx = 0;
let activeParam = 't';

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
const NEARBY_CITIES_COUNT = 12;
const ROUTE_SAMPLE_KM     = 10;
const FORECAST_HOURS      = 24;
const SEARCH_DEBOUNCE_MS  = 400;
const RESIZE_DEBOUNCE_MS  = 150;
const AUTO_REFRESH_MS     = 600_000;

const API = {
  smhi:      'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point',
  nominatim: 'https://nominatim.openstreetmap.org',
  osrm:      'https://router.project-osrm.org/route/v1',
};

const WIND_DIRS   = ['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSV','SV','VSV','V','VNV','NV','NNV'];
const PRECIP_NAMES = {0:'Ingen',1:'Snö',2:'Snö/regn',3:'Regn',4:'Duggregn',5:'Fr. regn',6:'Fr. dugg'};

// ═══════════════════════════════════════
//  Swedish cities database
// ═══════════════════════════════════════
const CITIES = [
  // Storstäder
  {n:'Stockholm',    lat:59.3293, lon:18.0686},
  {n:'Göteborg',     lat:57.7089, lon:11.9746},
  {n:'Malmö',        lat:55.6050, lon:13.0038},
  {n:'Uppsala',      lat:59.8586, lon:17.6389},
  {n:'Västerås',     lat:59.6162, lon:16.5528},
  {n:'Örebro',       lat:59.2741, lon:15.2066},
  {n:'Linköping',    lat:58.4108, lon:15.6214},
  {n:'Helsingborg',  lat:56.0465, lon:12.6945},
  {n:'Jönköping',    lat:57.7826, lon:14.1618},
  {n:'Norrköping',   lat:58.5942, lon:16.1826},
  {n:'Lund',         lat:55.7047, lon:13.1910},
  {n:'Umeå',         lat:63.8258, lon:20.2630},
  {n:'Gävle',        lat:60.6749, lon:17.1413},
  {n:'Borås',        lat:57.7210, lon:12.9401},
  {n:'Eskilstuna',   lat:59.3675, lon:16.5099},
  {n:'Halmstad',     lat:56.6745, lon:12.8578},
  {n:'Växjö',        lat:56.8777, lon:14.8091},
  {n:'Karlstad',     lat:59.4022, lon:13.5115},
  {n:'Sundsvall',    lat:62.3913, lon:17.3069},
  {n:'Östersund',    lat:63.1792, lon:14.6357},
  {n:'Trollhättan',  lat:58.2828, lon:12.2893},
  {n:'Luleå',        lat:65.5848, lon:22.1547},
  {n:'Borlänge',     lat:60.4858, lon:15.4366},
  {n:'Falun',        lat:60.6065, lon:15.6355},
  {n:'Kiruna',       lat:67.8557, lon:20.2253},
  {n:'Visby',        lat:57.6348, lon:18.2948},
  {n:'Kalmar',       lat:56.6634, lon:16.3566},
  {n:'Karlskrona',   lat:56.1612, lon:15.5869},
  {n:'Skellefteå',   lat:64.7508, lon:20.9528},
  {n:'Piteå',        lat:65.3172, lon:21.4795},
  // Dalarna
  {n:'Mora',         lat:61.0044, lon:14.5482},
  {n:'Ludvika',      lat:60.1498, lon:15.1875},
  {n:'Avesta',       lat:60.1451, lon:16.1680},
  {n:'Hedemora',     lat:60.2750, lon:15.9834},
  {n:'Rättvik',      lat:60.8881, lon:15.1175},
  {n:'Leksand',      lat:60.7281, lon:14.9981},
  {n:'Malung',       lat:60.6878, lon:13.7189},
  {n:'Säter',        lat:60.3535, lon:15.7484},
  {n:'Smedjebacken', lat:60.1389, lon:15.4125},
  {n:'Vansbro',      lat:60.4763, lon:14.2215},
  // Gävleborg
  {n:'Sandviken',    lat:60.6177, lon:16.7751},
  {n:'Hudiksvall',   lat:61.7283, lon:17.1058},
  {n:'Bollnäs',      lat:61.3481, lon:16.3940},
  {n:'Söderhamn',    lat:61.3027, lon:17.0665},
  {n:'Ljusdal',      lat:61.8306, lon:16.0869},
  {n:'Hofors',       lat:60.5481, lon:16.2861},
  // Uppsala & Stockholms omnejd
  {n:'Enköping',     lat:59.6369, lon:17.0785},
  {n:'Tierp',        lat:60.3435, lon:17.5157},
  {n:'Norrtälje',    lat:59.7578, lon:18.7058},
  {n:'Södertälje',   lat:59.1956, lon:17.6253},
  {n:'Nynäshamn',    lat:58.9031, lon:17.9478},
  {n:'Sigtuna',      lat:59.6178, lon:17.7226},
  {n:'Märsta',       lat:59.6231, lon:17.8536},
  {n:'Åkersberga',   lat:59.4817, lon:18.2977},
  // Västmanland
  {n:'Köping',       lat:59.5122, lon:15.9979},
  {n:'Sala',         lat:59.9197, lon:16.6085},
  {n:'Fagersta',     lat:60.0047, lon:15.7934},
  {n:'Arboga',       lat:59.3942, lon:15.8361},
  {n:'Kungsör',      lat:59.4219, lon:16.0947},
  {n:'Hallstahammar',lat:59.6139, lon:16.2269},
  // Södermanland
  {n:'Nyköping',     lat:58.7531, lon:17.0072},
  {n:'Katrineholm',  lat:58.9956, lon:16.2076},
  {n:'Strängnäs',    lat:59.3792, lon:17.0289},
  {n:'Flen',         lat:59.0578, lon:16.5856},
  {n:'Trosa',        lat:58.8983, lon:17.5492},
  {n:'Oxelösund',    lat:58.6719, lon:17.1053},
  // Östergötland
  {n:'Mjölby',       lat:58.3264, lon:15.1289},
  {n:'Motala',       lat:58.5378, lon:15.0361},
  {n:'Finspång',     lat:58.7072, lon:15.7678},
  {n:'Vadstena',     lat:58.4486, lon:14.8897},
  {n:'Åtvidaberg',   lat:58.2017, lon:16.0003},
  {n:'Kisa',         lat:57.9897, lon:15.6317},
  // Jönköping
  {n:'Vetlanda',     lat:57.4281, lon:15.0753},
  {n:'Nässjö',       lat:57.6542, lon:14.6942},
  {n:'Tranås',       lat:58.0375, lon:14.9797},
  {n:'Eksjö',        lat:57.6650, lon:14.9711},
  {n:'Vaggeryd',     lat:57.4967, lon:14.1508},
  // Kronoberg
  {n:'Ljungby',      lat:56.8331, lon:13.9411},
  {n:'Alvesta',      lat:56.8989, lon:14.5575},
  {n:'Tingsryd',     lat:56.5267, lon:14.9783},
  {n:'Markaryd',     lat:56.4625, lon:13.5978},
  // Kalmar
  {n:'Västervik',    lat:57.7578, lon:16.6358},
  {n:'Nybro',        lat:56.7442, lon:15.9078},
  {n:'Vimmerby',     lat:57.6650, lon:15.8550},
  {n:'Borgholm',     lat:56.8811, lon:16.6558},
  {n:'Hultsfred',    lat:57.4914, lon:15.8439},
  // Blekinge
  {n:'Ronneby',      lat:56.2108, lon:15.2758},
  {n:'Sölvesborg',   lat:56.0531, lon:14.5817},
  {n:'Olofström',    lat:56.2789, lon:14.5339},
  // Skåne
  {n:'Kristianstad', lat:56.0294, lon:14.1567},
  {n:'Hässleholm',   lat:56.1578, lon:13.7678},
  {n:'Trelleborg',   lat:55.3736, lon:13.1575},
  {n:'Ystad',        lat:55.4297, lon:13.8203},
  {n:'Simrishamn',   lat:55.5583, lon:14.3597},
  {n:'Ängelholm',    lat:56.2433, lon:12.8619},
  {n:'Eslöv',        lat:55.8381, lon:13.3036},
  {n:'Klippan',      lat:56.1331, lon:13.1311},
  {n:'Båstad',       lat:56.4275, lon:12.8508},
  {n:'Osby',         lat:56.3797, lon:13.9917},
  {n:'Perstorp',     lat:56.1381, lon:13.3967},
  // Halland
  {n:'Varberg',      lat:57.1057, lon:12.2501},
  {n:'Falkenberg',   lat:56.9058, lon:12.4919},
  {n:'Kungsbacka',   lat:57.4872, lon:12.0764},
  {n:'Laholm',       lat:56.5142, lon:13.0436},
  // Västra Götaland
  {n:'Uddevalla',    lat:58.3492, lon:11.9381},
  {n:'Mölndal',      lat:57.6547, lon:12.0136},
  {n:'Alingsås',     lat:57.9303, lon:12.5331},
  {n:'Lidköping',    lat:58.5055, lon:13.1571},
  {n:'Mariestad',    lat:58.7092, lon:13.8239},
  {n:'Skara',        lat:58.3856, lon:13.4375},
  {n:'Skövde',       lat:58.3893, lon:13.8449},
  {n:'Falköping',    lat:58.1736, lon:13.5514},
  {n:'Ulricehamn',   lat:57.7922, lon:13.4203},
  {n:'Vänersborg',   lat:58.3797, lon:12.3228},
  {n:'Lysekil',      lat:58.2744, lon:11.4358},
  {n:'Strömstad',    lat:58.9361, lon:11.1711},
  {n:'Åmål',         lat:59.0514, lon:12.7008},
  {n:'Kungälv',      lat:57.8706, lon:11.9764},
  {n:'Stenungsund',  lat:57.9858, lon:11.8181},
  {n:'Kinna',        lat:57.5050, lon:12.6958},
  // Värmland
  {n:'Arvika',       lat:59.6556, lon:12.5877},
  {n:'Kristinehamn', lat:59.3092, lon:14.1047},
  {n:'Karlskoga',    lat:59.3267, lon:14.5240},
  {n:'Säffle',       lat:59.1325, lon:12.9264},
  {n:'Hagfors',      lat:60.0278, lon:13.6508},
  {n:'Filipstad',    lat:59.7136, lon:14.1689},
  {n:'Torsby',       lat:60.1317, lon:12.9989},
  // Örebro
  {n:'Lindesberg',   lat:59.5906, lon:15.2289},
  {n:'Nora',         lat:59.5169, lon:15.0328},
  {n:'Kumla',        lat:59.1256, lon:15.1383},
  {n:'Hallsberg',    lat:59.0636, lon:15.1111},
  {n:'Askersund',    lat:58.8803, lon:14.9050},
  // Västernorrland
  {n:'Härnösand',    lat:62.6324, lon:17.9393},
  {n:'Örnsköldsvik', lat:63.2896, lon:18.7158},
  {n:'Kramfors',     lat:62.9286, lon:17.7883},
  {n:'Sollefteå',    lat:63.1653, lon:17.2736},
  {n:'Timrå',        lat:62.4883, lon:17.3267},
  // Jämtland
  {n:'Åre',          lat:63.3983, lon:13.0817},
  {n:'Strömsund',    lat:63.8519, lon:15.5528},
  {n:'Sveg',         lat:62.0364, lon:14.3542},
  // Västerbotten
  {n:'Lycksele',     lat:64.5956, lon:18.6728},
  {n:'Vilhelmina',   lat:64.6264, lon:16.6567},
  {n:'Storuman',     lat:65.0969, lon:17.1097},
  {n:'Åsele',        lat:64.1606, lon:17.3392},
  // Norrbotten
  {n:'Gällivare',    lat:67.1328, lon:20.6578},
  {n:'Haparanda',    lat:65.8369, lon:24.1367},
  {n:'Kalix',        lat:65.8528, lon:23.1456},
  {n:'Boden',        lat:65.8258, lon:21.6897},
  {n:'Arvidsjaur',   lat:65.5908, lon:19.1797},
  {n:'Arjeplog',     lat:66.0528, lon:17.8864},
  {n:'Jokkmokk',     lat:66.6044, lon:19.8261},
  {n:'Pajala',       lat:67.2111, lon:23.3644},
  // Stockholmsregionen
  {n:'Nacka',         lat:59.3117, lon:18.1633},
  {n:'Huddinge',      lat:59.2369, lon:17.9800},
  {n:'Botkyrka',      lat:59.2014, lon:17.8319},
  {n:'Tyresö',        lat:59.2428, lon:18.2294},
  {n:'Järfälla',      lat:59.4256, lon:17.8289},
  {n:'Sollentuna',    lat:59.4281, lon:17.9506},
  {n:'Täby',          lat:59.4436, lon:18.0689},
  {n:'Vallentuna',    lat:59.5358, lon:18.0814},
  {n:'Upplands Väsby',lat:59.5192, lon:17.9278},
  {n:'Lidingö',       lat:59.3667, lon:18.1667},
  {n:'Vaxholm',       lat:59.4033, lon:18.3297},
  {n:'Värmdö',        lat:59.3253, lon:18.5028},
  // Göteborgsregionen
  {n:'Partille',      lat:57.7392, lon:12.1072},
  {n:'Lerum',         lat:57.7703, lon:12.2683},
  {n:'Ale',           lat:57.9636, lon:12.0653},
  {n:'Härryda',       lat:57.6714, lon:12.2300},
  {n:'Mölnlycke',     lat:57.6583, lon:12.1178},
  {n:'Landvetter',    lat:57.6931, lon:12.2933},
  {n:'Tjörn',         lat:57.9911, lon:11.6333},
  {n:'Orust',         lat:58.1267, lon:11.6667},
  // Skåne (mindre orter)
  {n:'Vellinge',      lat:55.4722, lon:13.0186},
  {n:'Staffanstorp',  lat:55.6411, lon:13.2058},
  {n:'Kävlinge',      lat:55.7933, lon:13.1117},
  {n:'Höganäs',       lat:56.2031, lon:12.5647},
  {n:'Landskrona',    lat:55.8706, lon:12.8297},
  {n:'Svedala',       lat:55.5086, lon:13.2339},
  {n:'Åhus',          lat:55.9258, lon:14.3078},
  {n:'Tomelilla',     lat:55.5428, lon:13.9486},
  {n:'Sjöbo',         lat:55.6294, lon:13.7056},
  // Västsverige (mindre)
  {n:'Herrljunga',    lat:58.0819, lon:13.0194},
  {n:'Tidaholm',      lat:58.1797, lon:13.9533},
  {n:'Hjo',           lat:58.3056, lon:14.2839},
  {n:'Töreboda',      lat:58.7011, lon:14.1217},
  {n:'Grästorp',      lat:58.3228, lon:12.6700},
  {n:'Essunga',       lat:58.1772, lon:13.0308},
  // Småland / Östergötland (mindre)
  {n:'Sävsjö',        lat:57.4036, lon:14.6653},
  {n:'Gislaved',      lat:57.3022, lon:13.5417},
  {n:'Hyltebruk',     lat:56.9964, lon:13.2258},
  {n:'Värnamo',       lat:57.1842, lon:14.0397},
  {n:'Boxholm',       lat:58.1958, lon:15.0492},
  {n:'Ydre',          lat:57.9481, lon:15.2653},
  {n:'Kinda',         lat:57.9897, lon:15.6317},
  // Mellansverige (mindre)
  {n:'Skinnskatteberg',lat:59.8303, lon:15.6944},
  {n:'Norberg',       lat:60.0697, lon:15.9294},
  {n:'Surahammar',    lat:59.7186, lon:16.2142},
  {n:'Heby',          lat:59.9278, lon:16.8753},
  {n:'Älvkarleby',    lat:60.5683, lon:17.4514},
  {n:'Skutskär',      lat:60.6458, lon:17.3908},
  {n:'Öregrund',      lat:60.3358, lon:18.4536},
  {n:'Österbybruk',   lat:60.1978, lon:17.8861},
  // Norrland (mindre)
  {n:'Ånge',          lat:62.5300, lon:15.6525},
  {n:'Matfors',       lat:62.3489, lon:17.0167},
  {n:'Liden',         lat:62.6333, lon:16.8278},
  {n:'Bräcke',        lat:62.7500, lon:15.4333},
  {n:'Berg',          lat:62.8667, lon:14.3000},
  {n:'Krokom',        lat:63.3267, lon:14.4639},
  {n:'Ragunda',       lat:63.1000, lon:16.3833},
  {n:'Dorotea',       lat:64.2667, lon:16.4167},
  {n:'Sorsele',       lat:65.5333, lon:17.5333},
  {n:'Malå',          lat:65.1833, lon:18.7333},
  {n:'Norsjö',        lat:64.9000, lon:19.4833},
  {n:'Vindeln',       lat:64.2000, lon:19.7167},
  {n:'Robertsfors',   lat:64.1833, lon:20.8500},
  {n:'Bjurholm',      lat:63.9333, lon:19.2333},
  {n:'Vännäs',        lat:63.9167, lon:19.7500},
  {n:'Nordmaling',    lat:63.5667, lon:19.5000},
  {n:'Överkalix',     lat:66.3333, lon:22.8333},
  {n:'Övertorneå',    lat:66.3833, lon:23.6500},
  {n:'Älvsbyn',       lat:65.6833, lon:21.0000},
];

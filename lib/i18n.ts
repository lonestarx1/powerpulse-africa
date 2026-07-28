/**
 * UI copy in both languages.
 *
 * English is the primary and Kinyarwanda is one tap away (commit 6abc7ea).
 * The choice lives in a cookie so the server renders the right language on the
 * first paint, and it is forwarded to /api/advise: if you have put the app in
 * Kinyarwanda you want the answer in Kinyarwanda, whatever language you
 * happened to type the place name in.
 *
 * NOTE FOR THE KINYARWANDA OWNER: the strings added for the landing and setup
 * funnel are marked below. They need a native read before we film.
 */

export const LANGS = ["en", "rw"] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "rw";
}

type Copy = {
  /* chrome */
  tagline: string;
  back: string;
  continue: string;
  change: string;
  startOver: string;

  /* landing */
  heroA: string;
  heroB: string;
  heroBody: string;
  getStarted: string;
  noAccount: string;
  statesTitle: string;
  stateTimed: string;
  stateTimedBody: string;
  stateOpen: string;
  stateOpenBody: string;
  stateClear: string;
  stateClearBody: string;
  howTitle: string;
  step1: string;
  step1Body: string;
  step2: string;
  step2Body: string;
  step3: string;
  step3Body: string;
  step4: string;
  step4Body: string;
  dataTitle: string;
  dataNotices: string;
  dataRecords: string;
  dataDistricts: string;
  dataSectors: string;
  dataBody: string;
  openSource: string;
  honestTitle: string;
  honestBody: string;
  honestWeak: string;
  honestFood: string;
  honestAsk: string;
  scope: string;

  /* setup */
  whoTitle: string;
  whoSub: string;
  districtTitle: string;
  districtSub: string;
  sectorTitle: string;
  sectorSub: string;
  wholeDistrict: string;
  searchPlaceholder: string;
  sectorPlaceholder: string;
  find: string;
  clearSearch: string;
  records: string;
  noMatch: string;

  /* area */
  areaLive: string;
  areaRecord: string;
  areaHistory: string;
  areaUpcoming: string;
  areaNothingUpcoming: string;
  areaRecent: string;
  areaNoRecords: string;
  areaPrepare: string;
  areaNationwide: string;
  askAssistant: string;
  askAssistantSub: string;
  outages: string;
  lastYear: string;
  typicalLength: string;
  usualStart: string;
  longest: string;
  firstRecord: string;
  latestRecord: string;
  commonCause: string;
  mainFeeder: string;
  perMonth: string;
  noEndPublished: string;
  weakEstimate: string;

  /* chat */
  chatTitle: string;
  chatPrompt: string;
  placeholder: string;
  send: string;
  failed: string;
  offline: string;
  suggestions: string[];
};

const en: Copy = {
  tagline: "REG outage records · Rwanda",
  back: "Back",
  continue: "Continue",
  change: "change",
  startOver: "Start over",

  heroA: "The power just went out.",
  heroB: "Now what?",
  heroBody:
    "Ask in your own language and get a straight answer: whether the cut is planned, how long it should last, and what to do for the next few hours — grounded in the utility's own published records.",
  getStarted: "Get started",
  noAccount: "No account. No sign-up. Four taps.",
  statesTitle: "Three answers, and we mean all three",
  stateTimed: "Out, with a published end time",
  stateTimedBody: "A live countdown against the window the utility actually published.",
  stateOpen: "Out, with no end time published",
  stateOpenBody:
    "No countdown, no estimate, no invented ETA. We say the utility has not published one.",
  stateClear: "Nothing published for your area",
  stateClearBody: "Plus the next scheduled outage, if the utility has listed one.",
  howTitle: "How it works",
  step1: "Tell us who you are",
  step1Body:
    "A household, a shop with cold stock, or someone trying to keep working. The same outage needs different advice.",
  step2: "Pick your district and sector",
  step2Body:
    "From the places the utility itself names. We never guess your location — a confidently wrong location is the worst failure this product has.",
  step3: "See your area's record",
  step3Body:
    "Every outage published for your sector: how often, how long, when they usually start, and what caused them.",
  step4: "Ask anything",
  step4Body:
    "In Kinyarwanda or English. The assistant answers from that record, and tells you which part of its answer is weakest.",
  dataTitle: "Real records, not a demo dataset",
  dataNotices: "outage notices scraped",
  dataRecords: "area-level records",
  dataDistricts: "districts covered",
  dataSectors: "sectors named",
  dataBody:
    "scraped from Rwanda Energy Group's public outage listing. Committed to the repo, so you can check us.",
  openSource: "Open the source listing ↗",
  honestTitle: "Built to say “I don’t know.”",
  honestBody:
    "When the utility publishes a start and no end, most tools would guess. We show a different screen instead — no countdown, no number — and tell you plainly that no restoration time has been published.",
  honestWeak: "Estimates from fewer than five past outages are labelled weak, not confident.",
  honestFood: "Food-safety thresholds come from a data file, never from the model.",
  honestAsk: "When your location is ambiguous we ask, rather than pick the likely one.",
  scope:
    "Rwanda is the MVP, not the scope. The ingest layer normalises any published outage listing into one schema — a new country is a new scraper and a new language, not a new product.",

  whoTitle: "Who are you right now?",
  whoSub: "It changes the advice, not the facts.",
  districtTitle: "Which district?",
  districtSub: "Only districts the utility names in its own listing.",
  sectorTitle: "Which sector?",
  sectorSub: "Sector names repeat across districts, so we carry both.",
  wholeDistrict: "The whole district",
  searchPlaceholder: "Sector or district…",
  sectorPlaceholder: "Filter sectors…",
  find: "Find",
  clearSearch: "Clear",
  records: "records",
  noMatch: "No place in the published records matches that. Try a sector or district name.",

  areaLive: "Right now",
  areaRecord: "Your area's record",
  areaHistory: "Outages per month",
  areaUpcoming: "Coming up here",
  areaNothingUpcoming: "Nothing scheduled for this area in the published listing.",
  areaRecent: "Recent outages here",
  areaNoRecords: "The utility has published no outage for this area.",
  areaPrepare: "What this means for you",
  areaNationwide: "Published across Rwanda",
  askAssistant: "Ask the assistant",
  askAssistantSub: "In Kinyarwanda or English. It answers from this record only.",
  outages: "outages on record",
  lastYear: "in the last year",
  typicalLength: "Typical length",
  usualStart: "Usual start",
  longest: "Longest published",
  firstRecord: "First record",
  latestRecord: "Latest record",
  commonCause: "Most common cause",
  mainFeeder: "Main feeder",
  perMonth: "last 12 months",
  noEndPublished: "published with no end time",
  weakEstimate: "weak estimate",

  chatTitle: "Assistant",
  chatPrompt: "Power out? Type where you are — for example:",
  placeholder: "Where are you?",
  send: "Send",
  failed: "Something went wrong. Try again.",
  offline: "Could not reach the server.",
  suggestions: [
    "Power out in Kimironko",
    "No electricity here in Masaka",
    "When will power come back in Gisozi?",
  ],
};

const rw: Copy = {
  tagline: "Amakuru ya REG · u Rwanda",
  back: "Subira inyuma",
  continue: "Komeza",
  change: "hindura",
  startOver: "Tangira bushya",

  heroA: "Umuriro uhise uzima.",
  heroB: "Ubu se?",
  heroBody:
    "Baza mu rurimi rwawe uhite ubona igisubizo: niba ari gahunda, igihe bizamara, n'icyo wakora mu masaha ari imbere — bishingiye ku makuru REG yatangaje.",
  getStarted: "Tangira",
  noAccount: "Nta konti. Nta kwiyandikisha. Kanda kane gusa.",
  statesTitle: "Ibisubizo bitatu, kandi byose turabivuga",
  stateTimed: "Nta muriro, igihe cyo kugaruka cyaratangajwe",
  stateTimedBody: "Isaha igenda igabanuka ishingiye ku gihe REG yatangaje.",
  stateOpen: "Nta muriro, nta gihe cyo kugaruka cyatangajwe",
  stateOpenBody:
    "Nta saha igabanuka, nta gereranya. Tuvuga ko REG itatangaje igihe cyo kugaruka.",
  stateClear: "Nta bwo bahatangaje imyirondoro y'aho uri",
  stateClearBody: "N'igihe gitaha cyateganyijwe, niba cyaratangajwe.",
  howTitle: "Uko bikora",
  step1: "Tubwire uwo uri we",
  step1Body:
    "Urugo, ubucuruzi bufite ibikonjesha, cyangwa ukora akazi ka interineti. Umuriro umwe usaba inama zitandukanye.",
  step2: "Hitamo akarere n'umurenge",
  step2Body:
    "Mu mazina REG ubwayo ikoresha. Ntitwigera tukeka aho uri — kwibeshya ku hantu ni cyo kibi cyane kuri iyi porogaramu.",
  step3: "Reba amateka y'aho utuye",
  step3Body:
    "Buri muriro wazimye watangajwe mu murenge wawe: kangahe, igihe kingana iki, saha zisanzwe, n'impamvu.",
  step4: "Baza icyo ushaka cyose",
  step4Body:
    "Mu Kinyarwanda cyangwa mu Cyongereza. Igisubizo giturutse muri ayo makuru gusa, kandi tukubwira aho gisubizo gikeye.",
  dataTitle: "Amakuru nyayo, si urugero",
  dataNotices: "amatangazo yakusanyijwe",
  dataRecords: "inyandiko ku rwego rw'umurenge",
  dataDistricts: "uturere",
  dataSectors: "imirenge yavuzwe",
  dataBody:
    "byakusanyijwe ku rutonde rusange rwa Rwanda Energy Group. Biri muri repo, ushobora kubigenzura.",
  openSource: "Fungura isoko ↗",
  honestTitle: "Yubatswe kugira ngo ivuge “Simbizi.”",
  honestBody:
    "Iyo REG itangaje igihe cyo gutangira ariko ntibatangaze icyo kurangiriraho, izindi porogaramu zakeka. Twe twerekana ikindi — nta saha, nta mubare — tukakubwira ko nta gihe cyo kugaruka cyatangajwe.",
  honestWeak: "Igereranya rishingiye ku nshuro zitageze kuri eshanu ryitwa rikeye.",
  honestFood: "Ibipimo by'umutekano w'ibiribwa biva mu idosiye y'amakuru, ntibiva muri model.",
  honestAsk: "Iyo aho uri hadasobanutse turabaza, ntitwihitiremo.",
  scope:
    "U Rwanda ni intangiriro, si urugero rwose. Uburyo bwo gukusanya amakuru bwakozwe kugira ngo indi gihugu kibe scraper nshya n'ururimi rushya, atari porogaramu nshya.",

  whoTitle: "Uri nde ubu?",
  whoSub: "Bihindura inama, ntibihindura amakuru.",
  districtTitle: "Ni akahe karere?",
  districtSub: "Uturere REG ivuga ku rutonde rwayo gusa.",
  sectorTitle: "Ni uwuhe murenge?",
  sectorSub: "Amazina y'imirenge arisubiramo mu turere, ni yo mpamvu twandika byombi.",
  wholeDistrict: "Akarere kose",
  searchPlaceholder: "Umurenge cyangwa akarere…",
  // NEEDS A NATIVE READ
  sectorPlaceholder: "Shakisha umurenge…",
  find: "Shakisha",
  // NEEDS A NATIVE READ
  clearSearch: "Siba",
  records: "inyandiko",
  noMatch: "Nta hantu mu makuru yatangajwe habonetse. Gerageza izina ry'umurenge cyangwa akarere.",

  areaLive: "Ubu",
  areaRecord: "Amateka y'aho utuye",
  areaHistory: "Imiriro yazimye buri kwezi",
  areaUpcoming: "Ibiteganyijwe hano",
  areaNothingUpcoming: "Nta kiteganyijwe hano ku rutonde rwatangajwe.",
  areaRecent: "Imiriro yazimye vuba hano",
  areaNoRecords: "Nta muriro wazimye watangajwe kuri aka gace.",
  areaPrepare: "Icyo bivuze kuri wowe",
  areaNationwide: "Byatangajwe mu Rwanda hose",
  askAssistant: "Baza umufasha",
  askAssistantSub: "Mu Kinyarwanda cyangwa mu Cyongereza. Asubiza ashingiye kuri aya makuru gusa.",
  outages: "inshuro zanditswe",
  lastYear: "mu mwaka ushize",
  typicalLength: "Igihe gisanzwe",
  usualStart: "Isaha isanzwe",
  longest: "Igihe kirekire cyatangajwe",
  firstRecord: "Inyandiko ya mbere",
  latestRecord: "Iya vuba",
  commonCause: "Impamvu ikunze kugaruka",
  mainFeeder: "Umurongo",
  perMonth: "amezi 12 ashize",
  noEndPublished: "byatangajwe nta gihe cyo kurangira",
  weakEstimate: "igereranya rikeye",

  chatTitle: "Umufasha",
  chatPrompt: "Nta muriro? Andika aho uri — urugero:",
  placeholder: "Andika aho uri…",
  send: "Ohereza",
  failed: "Habaye ikibazo. Ongera ugerageze.",
  offline: "Ntibishoboka guhuza na seriveri.",
  suggestions: [
    "Nta muriro mu Kimironko",
    "Hano mu Masaka nta amashanyarazi",
    "Ni ryari umuriro uzagaruka i Gisozi?",
  ],
};

export const COPY: Record<Lang, Copy> = { en, rw };

export function copyFor(lang: Lang): Copy {
  return COPY[lang];
}

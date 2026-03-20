import envvar from 'env-var';
import * as N3 from 'n3';
const { namedNode } = N3.DataFactory;

export const STATUS_PREPARING = 'http://redpencil.data.gift/id/concept/JobStatus/preparing';
export const STATUS_BUSY = 'http://redpencil.data.gift/id/concept/JobStatus/busy';
export const STATUS_SCHEDULED = 'http://redpencil.data.gift/id/concept/JobStatus/scheduled';
export const STATUS_SUCCESS = 'http://redpencil.data.gift/id/concept/JobStatus/success';
export const STATUS_FAILED = 'http://redpencil.data.gift/id/concept/JobStatus/failed';

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/Task';
export const ERROR_TYPE= 'http://open-services.net/ns/core#Error';

/**
 * Prefixes used in SPARQL queries (mostly).
 *
 * @private
 * @constant
 */
const PREFIXES = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  mu: 'http://mu.semte.ch/vocabularies/core/',
  task: 'http://redpencil.data.gift/vocabularies/tasks/',
  prov: 'http://www.w3.org/ns/prov#',
  oslc: 'http://open-services.net/ns/core#',
  dct: 'http://purl.org/dc/terms/',
  adms: 'http://www.w3.org/ns/adms#',
  nie: 'http://www.semanticdesktop.org/ontologies/2007/01/19/nie#',
  ext: 'http://mu.semte.ch/vocabularies/ext/',
  cogs: 'http://vocab.deri.ie/cogs#',
  nfo: 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#',
  dbpedia: 'http://dbpedia.org/ontology/',
  jobstat: 'http://redpencil.data.gift/id/concept/JobStatus/',
  tasko: 'http://lblod.data.gift/id/jobs/concept/TaskOperation/',
  app: 'http://lblod.data.gift/id/app/',
};

/**
 * Some extra prefixes mostly used for writing the data to TTL files in the
 * cleanest possible way.
 *
 * @private
 * @constant
 */
const EXTRA_PREFIXES = {
  lblod: 'http://data.lblod.info/id/',
  ere: 'http://data.lblod.info/vocabularies/erediensten/',
  mandaat: 'http://data.vlaanderen.be/ns/mandaat#',
  org: 'http://www.w3.org/ns/org#',
  mandaten: 'http://data.lblod.info/id/mandaten/',
  schema: 'http://schema.org/',
  person: 'http://www.w3.org/ns/person#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  persoon: 'https://data.vlaanderen.be/ns/persoon#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  locn: 'http://www.w3.org/ns/locn#',
  contacthub: 'http://data.lblod.info/vocabularies/contacthub/',
  adres: 'https://data.vlaanderen.be/ns/adres#',
  positiesBedienaar: 'http://data.lblod.info/id/positiesBedienaar/',
  vlaanderen: 'https://data.vlaanderen.be/id/',
  country: 'http://publications.europa.eu/resource/authority/country/',
  gender: 'http://publications.europa.eu/resource/authority/human-sex/',
};

/**
 * This string contains all the prefixes, ready for use in a SPARQL query.
 *
 * @public
 * @constant
 * @type {String}
 */
export const SPARQL_PREFIXES = (() => {
  const all = [];
  for (const key in PREFIXES) all.push(`PREFIX ${key}: <${PREFIXES[key]}>`);
  return all.join('\n');
})();

/**
 * This object contains all the prefixes a TTL writer might want to use to
 * create prefixed output. It is in the same format as the PREFIXES and
 * EXTRA_PREFIXES.
 *
 * @see PREFIXES, EXTRA_PREFIXES
 * @public
 * @constant
 * @type {Object}
 */
export const WRITER_PREFIXES = (() => {
  const prefs = {};
  for (const key in PREFIXES) prefs[key] = PREFIXES[key];
  for (const key in EXTRA_PREFIXES) prefs[key] = EXTRA_PREFIXES[key];
  return prefs;
})();

export const TASK_URI_PREFIX = 'http://redpencil.data.gift/id/task/';
export const ERROR_URI_PREFIX = 'http://redpencil.data.gift/id/jobs/error/';

export const SLEEP_TIME = envvar.get('SLEEP_TIME').default('1000').asInt();
export const BATCH_SIZE = envvar.get('BATCH_SIZE').default('100').asInt();
export const RETRY_WAIT_INTERVAL = envvar
  .get('RETRY_WAIT_INTERVAL')
  .default('30000')
  .asInt();
export const MAX_RETRIES = envvar.get('MAX_RETRIES').default('10').asInt();
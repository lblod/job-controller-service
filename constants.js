export const STATUS_BUSY = 'http://lblod.data.gift/id/lblodJob/concept/JobStatus/busy';
export const STATUS_SCHEDULED = 'http://lblod.data.gift/id/lblodJob/concept/JobStatus/scheduled';
export const STATUS_SUCCESS = 'http://lblod.data.gift/id/lblodJob/concept/JobStatus/success';
export const STATUS_FAILED = 'http://lblod.data.gift/id/lblodJob/concept/JobStatus/failed';

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://lblod.data.gift/vocabularies/lblodJob/Task';
export const ERROR_TYPE= 'http://open-services.net/ns/core#Error';

export const PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX lblodJob: <http://lblod.data.gift/vocabularies/lblodJob/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
`;

export const TASK_URI_PREFIX = 'http://lblod.data.gift/id/lblodJob/task/';
export const ERROR_URI_PREFIX = 'http://lblod.data.gift/id/lblodJob/error/';

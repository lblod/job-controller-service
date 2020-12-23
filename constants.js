export const STATUS_BUSY = 'http://lblod.data.gift/vocabularies/processingJobs/status/busy';
export const STATUS_SCHEDULED = 'http://lblod.data.gift/vocabularies/processingJobs/status/scheduled';
export const STATUS_SUCCESS = 'http://lblod.data.gift/vocabularies/processingJobs/status/success';
export const STATUS_FAILED = 'http://lblod.data.gift/vocabularies/processingJobs/status/failed';

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://lblod.data.gift/vocabularies/processingJobs/Task';
export const ERROR_TYPE= 'http://open-services.net/ns/core#Error';

export const PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX jobs: <http://lblod.data.gift/vocabularies/processingJobs/>
  PREFIX terms: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
`;

export const TASK_URI_PREFIX = 'http://lblod.data.gift/processingJobs/task/id/';
export const ERROR_URI_PREFIX = 'http://lblod.data.gift/processingJobs/errors/id/';

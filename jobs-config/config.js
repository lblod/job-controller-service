//Some declarative boilerplate to manage the task order of the job. Will probably be prettier later
//Configuration is now linear, tree or graph like task configuration is possible in future, but will required code changes in the controller
const CONFIG = {};

/**
 * HARVESTING
 **/
const JOB_LBLOD_HARVESTING = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvesting';
const TASK_HARVESTING_COLLECTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting';
const TASK_HARVESTING_IMPORTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/importing';
const TASK_HARVESTING_MIRRORING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/mirroring';
const TASK_HARVESTING_FILTERING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/filtering';
const TASK_HARVESTING_VALIDATING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/validating';

const JOB_LBLOD_IMPORT = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodImportCentraleVindplaats';
const TASK_IMPORTING_CENTRALE_VINDPLAATS = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/importCentraleVindplaats';

const JOB_LBLOD_HARVEST_AND_IMPORT = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvestAndImportCentraleVindplaats';

//config for lblod harvesting
CONFIG[JOB_LBLOD_HARVESTING] = { };
CONFIG[JOB_LBLOD_HARVESTING]['tasksConfiguration'] = [
  {
    currentOperation: null, //The first step is merely here for documentation purposes
    nextOperation: TASK_HARVESTING_IMPORTING,
    nextIndex: '0'
    //For complex configuration, a key dependsOn could be added
  },
  {
    currentOperation: TASK_HARVESTING_COLLECTING,
    nextOperation: TASK_HARVESTING_IMPORTING,
    nextIndex: '1'
    //For complex configuration, a key dependsOn could be added
  },
  {
    currentOperation: TASK_HARVESTING_IMPORTING,
    nextOperation: TASK_HARVESTING_VALIDATING,
    nextIndex: '2'
  },
  {
    currentOperation: TASK_HARVESTING_VALIDATING,
    nextOperation: TASK_HARVESTING_FILTERING,
    nextIndex: '3'
  },
  {
    currentOperation: TASK_HARVESTING_FILTERING,
    nextOperation: TASK_HARVESTING_MIRRORING,
    nextIndex: '4'
  }
];

CONFIG[JOB_LBLOD_HARVEST_AND_IMPORT] = { };
CONFIG[JOB_LBLOD_HARVEST_AND_IMPORT]['tasksConfiguration'] = [
  {
    currentOperation: null, //The first step is merely here for documentation purposes
    nextOperation: TASK_HARVESTING_IMPORTING,
    nextIndex: '0'
    //For complex configuration, a key dependsOn could be added
  },
  {
    currentOperation: TASK_HARVESTING_COLLECTING,
    nextOperation: TASK_HARVESTING_IMPORTING,
    nextIndex: '1'
    //For complex configuration, a key dependsOn could be added
  },
  {
    currentOperation: TASK_HARVESTING_IMPORTING,
    nextOperation: TASK_HARVESTING_VALIDATING,
    nextIndex: '2'
  },
  {
    currentOperation: TASK_HARVESTING_VALIDATING,
    nextOperation: TASK_HARVESTING_FILTERING,
    nextIndex: '3'
  },
  {
    currentOperation: TASK_HARVESTING_FILTERING,
    nextOperation: TASK_HARVESTING_MIRRORING,
    nextIndex: '4'
  },
  {
    currentOperation: TASK_HARVESTING_MIRRORING,
    nextOperation: TASK_IMPORTING_CENTRALE_VINDPLAATS,
    nextIndex: '5'
  }
];

CONFIG[JOB_LBLOD_IMPORT] = { };
CONFIG[JOB_LBLOD_IMPORT]['tasksConfiguration'] = [
  {
    currentOperation: null, //This job consists soley of one job
    nextOperation: TASK_IMPORTING_CENTRALE_VINDPLAATS,
    nextIndex: '0'
  }
] ;

/**
 * delta-initial-cache-graph-sync-job
 **/

const JOB_LBLOD_INITIAL_CACHE_SYNC_JOB_OPERATION_LEIDINGGEVENDEN = 'http://redpencil.data.gift/id/jobs/concept/JobOperation/deltas/initibalCacheGraphSyncing/leidinggevenden';
const TASK_INITIAL_CACHE_SYNC = 'http://redpencil.data.gift/id/jobs/concept/TaskOperation/deltas/initialCacheGraphSyncing';

CONFIG[JOB_LBLOD_INITIAL_CACHE_SYNC_JOB_OPERATION_LEIDINGGEVENDEN] = { };
CONFIG[JOB_LBLOD_INITIAL_CACHE_SYNC_JOB_OPERATION_LEIDINGGEVENDEN]['tasksConfiguration'] = [
  {
    currentOperation: null, //The first step is merely here for documentation purposes
    nextOperation: TASK_INITIAL_CACHE_SYNC,
    nextIndex: '0'
  }
  // {
  //   currentOperation: TASK_DELTA_HEALING_DIFF_CALCULATION,
  //   nextOperation: TASK_DELTA_HEALING_PATCH,
  //   nextIndex: '1'
  // }
];


const TASK_DUMP_FILE_CREATION = 'http://redpencil.data.gift/id/jobs/concept/TaskOperation/deltas/deltaDumpFileCreation';
//JOB: operation (this should be conifugrable in the service)
const JOB_LBLOD_DELTA_DUMP_FILE_CREATION_JOB_LEIDINGGEVENDEN = 'http://redpencil.data.gift/id/jobs/concept/JobOperation/deltas/deltaDumpFileCreation/leidinggevenden';
CONFIG[JOB_LBLOD_DELTA_DUMP_FILE_CREATION_JOB_LEIDINGGEVENDEN] = { };
CONFIG[JOB_LBLOD_DELTA_DUMP_FILE_CREATION_JOB_LEIDINGGEVENDEN]['tasksConfiguration'] = [
  {
    currentOperation: null, //The first step is merely here for documentation purposes
    nextOperation: TASK_DUMP_FILE_CREATION,
    nextIndex: '0'
  }
];


export default CONFIG;

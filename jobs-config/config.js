const JOB_LBLOD_HARVESTING = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvesting';
const TASK_HARVESTING_COLLECTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting';
const TASK_HARVESTING_IMPORTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/importing';
const TASK_HARVESTING_MIRRORING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/mirroring';

const JOB_LBLOD_IMPORT = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodImportCentraleVindplaats';
const TASK_IMPORTING_CENTRALE_VINDPLAATS = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/importCentraleVindplaats';

const JOB_LBLOD_HARVEST_AND_IMPORT = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvestAndImportCentraleVindplaats';

//Some declarative boilerplate to manage the task order of the job. Will probably be prettier later
//Configuration is now linear, tree or graph like task configuration is possible in future, but will required code changes in the controller
const CONFIG = {};

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
    nextOperation: TASK_HARVESTING_MIRRORING,
    nextIndex: '2'
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
    nextOperation: TASK_HARVESTING_MIRRORING,
    nextIndex: '2'
  },
  {
    currentOperation: TASK_HARVESTING_MIRRORING,
    nextOperation: TASK_IMPORTING_CENTRALE_VINDPLAATS,
    nextIndex: '3'
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

export default CONFIG;

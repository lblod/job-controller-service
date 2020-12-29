const TASK_HARVESTING_COLLECTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting';
const TASK_HARVESTING_IMPORTING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/importing';
//const TASK_HARVESTING_REPAIRING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/repairing';
//const TASK_HARVESTING_VALIDATING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/validating';
const TASK_HARVESTING_MIRRORING = 'http://lblod.data.gift/id/jobs/concept/TaskOperation/mirroring';
const JOB_LBLOD_HARVESTING = 'http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvesting';

//Some declarative boilerplate to manage the task order of the job. Will probably be prettier later
//Configuration is now linear, tree or graph like task configuration is possible in future, but will required code changes in the controller
const CONFIG = {};

//config for lblod harvesting
CONFIG[JOB_LBLOD_HARVESTING] = { };
CONFIG[JOB_LBLOD_HARVESTING]['tasksConfiguration'] = [
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

export default CONFIG;

const TASK_HARVESTING_COLLECTING = 'http://lblod.data.gift/id/lblodJob/concept/TaskType/collecting';
const TASK_HARVESTING_IMPORTING = 'http://lblod.data.gift/id/lblodJob/concept/TaskType/importing';
const TASK_HARVESTING_REPARING = 'http://lblod.data.gift/id/lblodJob/concept/TaskType/reparing';
//const TASK_HARVESTING_VALIDATING = 'http://lblod.data.gift/id/lblodJob/concept/TaskType/validating';
const TASK_HARVESTING_MIRRORING = 'http://lblod.data.gift/id/lblodJob/concept/TaskType/mirroring';
const JOB_LBLOD_HARVESTING = 'http://lblod.data.gift/id/lblodJob/concept/JobType/lblodHarvesting';

//Some declarative boilerplate to manage the task order of the job. Will probably be prettier later
//Configuration is now linear, tree or graph like task configuration is possible in future, but will required code changes in the controller
const CONFIG = {};

//config for lblod harvesting
CONFIG[JOB_LBLOD_HARVESTING] = { };
CONFIG[JOB_LBLOD_HARVESTING]['tasksConfiguration'] = [
  {
    currentTaskType: TASK_HARVESTING_COLLECTING,
    nextTaskType: TASK_HARVESTING_IMPORTING,
    nextIndex: '1'
    //For complex configuration, a key dependsOn could be added
  },
  {
    currentTaskType: TASK_HARVESTING_IMPORTING,
    nextTaskType: TASK_HARVESTING_REPARING,
    nextIndex: '2'
  },
  {
    currentTaskType: TASK_HARVESTING_REPARING,
    nextTaskType: TASK_HARVESTING_MIRRORING,
    nextIndex: '3'
  }
];

export default CONFIG;

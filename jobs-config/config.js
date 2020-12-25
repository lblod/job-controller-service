const TASK_HARVESTING_COLLECTING = 'http://lblod.data.gift/id/job/concept/TaskType/collecting';
const TASK_HARVESTING_IMPORTING = 'http://lblod.data.gift/id/job/concept/TaskType/importing';
const TASK_HARVESTING_REPARING = 'http://lblod.data.gift/id/job/concept/TaskType/reparing';
const TASK_HARVESTING_VALIDATING = 'http://lblod.data.gift/id/job/concept/TaskType/validating';
const TASK_HARVESTING_MIRRORING = 'http://lblod.data.gift/id/job/concept/TaskType/mirroring';

//Some declarative boilerplate to manage the task order of the job. Will probably be prettier later
export default {
  'http://lblod.data.gift/id/job/concept/JobType/lblodHarvesting': {
    knownTaskTypes: [ TASK_HARVESTING_COLLECTING, TASK_HARVESTING_IMPORTING, TASK_HARVESTING_REPARING, TASK_HARVESTING_VALIDATING, TASK_HARVESTING_MIRRORING ],
    //key is current step, value is next step.
    //Configuration is now linear, tree or graph like task configuration is possible in future, but will required code changes in the controller
    tasksConfiguration: {
      TASK_HARVESTING_COLLECTING : {
        index: "0",
        type: TASK_HARVESTING_IMPORTING
      },
      TASK_HARVESTING_IMPORTING : {
        index: "1",
        type: TASK_HARVESTING_REPARING
      },
      TASK_HARVESTING_REPARING: {
        index: "2",
        type: TASK_HARVESTING_MIRRORING
      }
    }
  }
};

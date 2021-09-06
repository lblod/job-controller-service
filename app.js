import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import { Delta } from "./lib/delta";
import { STATUS_SUCCESS, STATUS_FAILED, STATUS_SCHEDULED} from "./constants";
import { loadTask, createTask, isTask } from "./lib/task";
import { loadJob, updateJob } from "./lib/job";
import { waitForDatabase } from './utils/database-utils';
import { scheduleJobs, scheduleSingleJob } from './lib/schedule';
const jobsConfig = require('/config/config.json');

app.use(bodyParser.json({
  type: function (req) {
    return /^application\/json/.test(req.get('content-type'));
  }
}));

waitForDatabase(scheduleJobs);

app.get('/', function (_, res) {
  res.send('Hello from job-controller');
});

app.post('/delta-schedule', function(req, res) {
  const newScheduledJob = new Delta(req.body).getInsertsFor('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://vocab.deri.ie/cogs#ScheduledJob');
  scheduleSingleJob({uri: newScheduledJob[0]});
  res.sendStatus(201);
});

app.post('/delta', async function (req, res, next) {
  //TODO: find a way to deal with obsolete delta data.
  try {
    const successSubjects = new Delta(req.body).getInsertsFor('http://www.w3.org/ns/adms#status', STATUS_SUCCESS);
    for(const subject of successSubjects){
      console.log(`Starting working on success subject: ${subject}`);
      if(await isTask(subject)){
        await scheduleNextTask(subject);
      }
    }

    const failSubjects = new Delta(req.body).getInsertsFor('http://www.w3.org/ns/adms#status', STATUS_FAILED);
    for(const subject of failSubjects){
      console.log(`Starting working on fail subject: ${subject}`);
      if(await isTask(subject)){
        await handleFailedTask(subject);
      }
    }

    return res.status(200).send().end();
  } catch (e) {
    console.log(`Something unexpected went wrong while handling delta!`);
    console.error(e);
    return next(e);
  }
});

async function scheduleNextTask( currentTaskUri ){
  console.log(`Scheduling next task based on ${currentTaskUri}`);

  const task = await loadTask(currentTaskUri);

  if(!(task && task.job)) {
    console.error(`No Task or inconsistent data found for ${currentTaskUri}`);
    return;
  }

  const job = await loadJob(task.job);

  if(!job){
    console.error(`No job found for ${task.job}`);
    return;
  }

  const nextTaskType = getNextTaskConfig(jobsConfig, job, task);

  if(!nextTaskType){
    job.status = STATUS_SUCCESS;
    await updateJob(job);
  }
  else {
    const nextTask = await createTask(job.graph,
                                      job.job,
                                      nextTaskType.nextIndex,
                                      nextTaskType.nextOperation,
                                      STATUS_SCHEDULED,
                                      [ task.task ],
                                      task.resultsContainers );

    job.tasks.push(nextTask.task);

    await updateJob(job);
  }
}

async function handleFailedTask( currentTaskUri ){
  console.log(`Handling failed task based on ${currentTaskUri}`);

  const task = await loadTask(currentTaskUri);

  if(!(task && task.job)) {
    console.error(`No Task or inconsistent data found for ${currentTaskUri}`);
    return;
  }

  const job = await loadJob(task.job);

  if(!job){
    console.error(`No job found for ${task.job}`);
    return;
  }

  job.status = STATUS_FAILED;
  await updateJob(job);

}

function getNextTaskConfig(jobsConfiguration, job, currentTask){
  return jobsConfiguration[job.operation]["tasksConfiguration"].find(taskC => taskC.currentOperation == currentTask.operation);
}

app.use(errorHandler);

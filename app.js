import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import { Delta } from "./lib/delta";
import { STATUS_SUCCESS, STATUS_FAILED, STATUS_SCHEDULED} from "./constants";
import { loadTask, createTask, isTask } from "./lib/task";
import { loadJob, updateJob } from "./lib/harvesting-job";
import jobsConfig from './jobs-config/config';

app.use(bodyParser.json({
  type: function (req) {
    return /^application\/json/.test(req.get('content-type'));
  }
}));

app.get('/', function (_, res) {
  res.send('Hello harvesting-job-controller');
});

app.post('/delta', async function (req, res, next) {
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

  //Now a weird check: we have to make sure we are NOT working on an obsolete delta.
  if(job.activeTask != currentTaskUri){
    console.warn(`Incoming delta
                    uri ${currentTaskUri} does not correspond with what was found
                    in database for job ${job.job} and currentTask: ${job.activeTask}
                  `);
    return;
  }

  const config = jobsConfig[job.jobType];
  if(! (config && config.knownTaskTypes[task.taskType]) ){
    const errorMsg = `Wrong jobType or taskType for job ${job.job} and task ${task.task}`;
    job.error = errorMsg;
    job.status = STATUS_FAILED;
    job.activeTask = null;
    await updateJob(job);
    return;
  }

  const nextTaskType = config.tasksConfiguration[task.taskType];

  if(!nextTaskType){
    job.activeTask = null;
    job.status = STATUS_SUCCESS;
    await updateJob(job);
  }
  else {
    const nextTask = await createTask(job.graph,
                                      job.job,
                                      nextTaskType.index,
                                      nextTaskType.type,
                                      STATUS_SCHEDULED,
                                      [ task.task ],
                                      task.inputContainers );

    job.activeTask = nextTask.task;
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

  //Now a weird check: we have to make sure we are NOT working on an obsolete delta.
  if(job.activeTask != currentTaskUri){
    console.warn(`Incoming delta
                    uri ${currentTaskUri} does not correspond with what was found
                    in database for job ${job.job} and currentTask: ${job.activeTask}
                  `);
    return;
  }

  job.status = STATUS_FAILED;
  job.activeTask = null;
  await updateJob(job);

}

app.use(errorHandler);

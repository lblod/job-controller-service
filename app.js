import { app, errorHandler } from "mu";
import bodyParser from "body-parser";
import { Delta } from "./lib/delta";
import { STATUS_SUCCESS, STATUS_FAILED, STATUS_SCHEDULED } from "./constants";
import { loadTask, createTask, isTask, taskExists } from "./lib/task";
import { loadJob, updateJob } from "./lib/job";
import  * as jobsConfig  from "./config/config.json";


app.get("/", function(_, res) {
  res.send("Hello from job-controller");
});

app.post("/delta",  bodyParser.json({ limit: '50mb' }), async function(req, res, next) {
  //TODO: find a way to deal with obsolete delta data.
  try {
    const successSubjects = new Delta(req.body).getInsertsFor(
      "http://www.w3.org/ns/adms#status",
      STATUS_SUCCESS,
    );
    for (const subject of successSubjects) {
      console.log(`Starting working on success subject: ${subject}`);
      try {
        if (await isTask(subject)) {
          await scheduleNextTask(subject);
        } else {
          console.log("not a task");
        }
      } catch (subjectError) {
        console.error(`Error processing success subject ${subject}:`, subjectError.message);
      }
    }

    const failSubjects = new Delta(req.body).getInsertsFor(
      "http://www.w3.org/ns/adms#status",
      STATUS_FAILED,
    );
    for (const subject of failSubjects) {
      console.log(`Starting working on fail subject: ${subject}`);
      try {
        if (await isTask(subject)) {
          await handleFailedTask(subject);
        }
      } catch (subjectError) {
        console.error(`Error processing fail subject ${subject}:`, subjectError.message);
      }
    }

    return res.status(200).send().end();
  } catch (e) {
    console.error(`Delta processing failed:`, e.message);
    return next(e);
  }
});

async function scheduleNextTask(currentTaskUri) {
  console.log(`Scheduling next task based on ${currentTaskUri}`);

  const task = await loadTask(currentTaskUri);

  if (!(task && task.job)) {
    console.error(`No Task or inconsistent data found for ${currentTaskUri}`);
    return;
  }

  const job = await loadJob(task.job);

  if (!job) {
    console.error(`No job found for ${task.job}`);
    return;
  }

  const currentTaskConfig = getCurrentTaskConfig(jobsConfig, job, task);

  if (!currentTaskConfig) {
    //No config found for this task or final task in the job
    if (getPreviousTaskConfig(jobsConfig, job, task)) {
      //Task operation found as next operation is this config, so this is final task in job
      job.status = STATUS_SUCCESS;
      await updateJob(job);
    } else {
      //Task operation is never referenced, then there is no config for this: do nothing other than fail/stop
      throw new Error(
        "No config is found for the current task operation such that no next task can be scheduled",
      );
    }
  } else {
    // check if next task already exist before creating it
    if (await taskExists(job.graph, job.job, currentTaskConfig.nextIndex, currentTaskConfig.nextOperation)) {
            console.error(`${currentTaskConfig.nextOperation} in ${job.job} already exist`);
            return;
    }
    const nextTask = await createTask(
      job.graph,
      job.job,
      currentTaskConfig.nextIndex,
      currentTaskConfig.nextOperation,
      STATUS_SCHEDULED,
      [task.task],
      task.resultsContainers,
    );

    job.tasks.push(nextTask.task);

    await updateJob(job);
  }
}

async function handleFailedTask(currentTaskUri) {
  console.log(`Handling failed task based on ${currentTaskUri}`);

  const task = await loadTask(currentTaskUri);

  if (!(task && task.job)) {
    console.error(`No Task or inconsistent data found for ${currentTaskUri}`);
    return;
  }

  const job = await loadJob(task.job);

  if (!job) {
    console.error(`No job found for ${task.job}`);
    return;
  }

  job.status = STATUS_FAILED;
  await updateJob(job);
}

function getCurrentTaskConfig(jobsConfiguration, job, currentTask) {
  const config = jobsConfiguration[job.operation];
  if (!config)
    throw new Error(
      `No config for operation "${job.operation}" could be found.`,
    );
  const taskConfig = config.tasksConfiguration;
  if (!taskConfig)
    throw new Error(
      `The configuration for "${job.operation}" might be malformed.`,
    );
  return taskConfig.find(
    (taskC) => taskC.currentOperation == currentTask.operation,
  );
}

function getPreviousTaskConfig(jobsConfiguration, job, currentTask) {
  const config = jobsConfiguration[job.operation];
  if (!config)
    throw new Error(
      `No config for operation "${job.operation}" could be found.`,
    );
  const taskConfig = config.tasksConfiguration;
  if (!taskConfig)
    throw new Error(
      `The configuration for "${job.operation}" might be malformed.`,
    );
  return taskConfig.find(
    (taskC) => taskC.nextOperation == currentTask.operation,
  );
}

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    console.warn(`Payload too large for ${req.method} ${req.originalUrl}`);
    return res.status(413).json({
      errors: [ {title: 'Payload too large'} ]
    });
  }

  // Pass other errors to the default handler
  next(err);
});

app.use(errorHandler);

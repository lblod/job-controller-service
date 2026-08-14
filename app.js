import { app, errorHandler } from "mu";
import bodyParser from "body-parser";
import { STATUS_SUCCESS, STATUS_FAILED, STATUS_PREPARING } from "./constants";
import {
  loadTask,
  createTask,
  isTask,
  taskExists,
  getBatchTasksToConsiderForScheduling,
  markTaskScheduled,
} from "./lib/task";
import { isJobComplete, loadJob, updateJobStatus } from "./lib/job";
import * as jobsConfig from "./config/config.json";
import { CronJob } from "cron";

app.get("/", function (_, res) {
  res.send("Hello from job-controller");
});

app.post(
  "/delta",
  bodyParser.json({ limit: "50mb" }),
  async function (_req, res) {
    // not waiting for the scheduling to complete to reply to delta
    // also not caring about the incoming delta, just check all tasks to be scheduled so we don't care if we miss deltas
    handleOpenTasks().catch((e) => {
      console.error(`something went wrong while scheduling tasks: ${e}`);
    });

    return res.status(200).send().end();
  },
);

let lock = null;
async function handleOpenTasks() {
  const mylock = new Date();
  if (lock) {
    lock = mylock;
    return;
  }
  lock = mylock;

  await unsafeHandleOpenTasks().catch((e) => {
    console.log(`Something went wrong while handling open tasks: ${e}`);
  });

  if (lock === mylock) {
    lock = null;
    return;
  } else {
    lock = null;
    await handleOpenTasks();
  }
}

async function unsafeHandleOpenTasks() {
  let currentBatch = await getBatchTasksToConsiderForScheduling();
  while (currentBatch.length > 0) {
    const todo = [...currentBatch];
    while (todo.length > 0) {
      const current = todo.pop();
      await handleOpenTask(current.uri, current.status);
    }

    currentBatch = await getBatchTasksToConsiderForScheduling();
  }
}

async function handleOpenTask(subject, status) {
  try {
    if (status === STATUS_SUCCESS) {
      console.log(`Starting working on success subject: ${subject}`);
      try {
        if (await isTask(subject)) {
          await scheduleNextTask(subject);
        } else {
          console.log(`not a successful task: ${subject}`);
        }
      } catch (subjectError) {
        console.error(
          `Error processing success subject ${subject}:`,
          subjectError.message,
        );
      }
    } else if (status === STATUS_FAILED) {
      console.log(`Starting working on fail subject: ${subject}`);
      try {
        if (await isTask(subject)) {
          await handleFailedTask(subject);
        } else {
          console.log(`not a failed task: ${subject}`);
        }
      } catch (subjectError) {
        console.error(
          `Error processing fail subject ${subject}:`,
          subjectError.message,
        );
      }
    } else {
      console.log(`Unexpected status to handle for scheduling: ${status}`);
    }
  } catch (e) {
    console.error(`Task processing failed for subject ${subject}:`, e.message);
  } finally {
    await markTaskScheduled(subject).catch((e) => {
      console.error(
        `ERROR, FAILURE, SOMETHING IS VERY WRONG: couldn't make task as scheduled: ${e}`,
      );
      process.exit(1);
    });
  }
}

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
    const previousTaskConfig = getPreviousTaskConfig(jobsConfig, job, task);
    if (previousTaskConfig && (await isJobComplete(job))) {
      //Task operation found as next operation is this config, so this is final task in job
      await updateJobStatus(job, STATUS_SUCCESS);
    } else if (!previousTaskConfig) {
      //Task operation is never referenced, then there is no config for this: do nothing other than fail/stop
      throw new Error(
        "No config is found for the current task operation such that no next task can be scheduled",
      );
    }
  } else if (!currentTaskConfig.external) {
    // check if next task already exist before creating it
    const parents = [task.task];
    if (
      await taskExists(
        job.graph,
        job.job,
        currentTaskConfig.nextIndex,
        currentTaskConfig.nextOperation,
        parents,
      )
    ) {
      console.error(
        `${currentTaskConfig.nextOperation} in ${job.job} already exist`,
      );
      return;
    }
    const nextTask = await createTask(
      job.graph,
      job.job,
      currentTaskConfig.nextIndex,
      currentTaskConfig.nextOperation,
      STATUS_PREPARING,
      parents,
      task.resultsContainers,
    );

    job.tasks.push(nextTask.task);
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

  await updateJobStatus(job, STATUS_FAILED);
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
  if (err.type === "entity.too.large") {
    console.warn(`Payload too large for ${req.method} ${req.originalUrl}`);
    return res.status(413).json({
      errors: [{ title: "Payload too large" }],
    });
  }

  // Pass other errors to the default handler
  next(err);
});

app.use(errorHandler);

handleOpenTasks().catch((e) => {
  console.error(`Failed handling open tasks on startup: ${e}`);
});

export const cronjob = CronJob.from({
  cronTime: process.env.CRON_PATTERN || "*/5 * * * *",
  onTick: async () => {
    handleOpenTasks().catch((e) => {
      console.error(`Something went wrong during scheduling inside cron: ${e}`);
    });
  },
});

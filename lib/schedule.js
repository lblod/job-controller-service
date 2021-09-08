import { sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeInt } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { PREFIXES, REQUEST_HEADER, STATUS_BUSY, STATUS_READY_TO_BE_CACHED, STATUS_SCHEDULED} from '../constants';
import { parseResult } from '../utils/parseResult';
import { CronJob } from 'cron';
import { v4 as uuid } from 'uuid';

const CRON_JOBS = {};

async function initScheduledJobs() {
  try {
    const scheduledJobsList = await getScheduledJobs();

    if (scheduledJobsList.length == 0) {
      console.log("No scheduled-jobs found that need to be added to cron.");
      return;
    }

    await addScheduledJobsToCron(scheduledJobsList);
    console.log(`${scheduledJobsList.length} scheduled-jobs have been added to cron.`);
  } catch (err) {
    console.error(`Something went wrong while initializing scheduled-jobs`);
    console.error(err);
  }
}

async function getScheduledJobs() {
  try {
    const scheduledJobsQuery = `
      ${PREFIXES}
      SELECT DISTINCT ?uri ?frequency WHERE {
        ?uri a cogs:ScheduledJob;
              mu:uuid ?uuid;
              task:schedule ?schedule.

        ?schedule schema:repeatFrequency ?frequency.
      }
    `;

    const scheduledJobsList = parseResult(await query(scheduledJobsQuery));
    return scheduledJobsList;
  } catch(err) {
    console.error(`Something went wrong while querying scheduled-jobs`);
    console.error(err);
  }
}

async function addScheduledJobsToCron(scheduledJobs) {
  scheduledJobs.forEach(job => {
    CRON_JOBS[job.uri] = new CronJob(job.frequency, function() {
      createNewJob(job);
    }, null, true);
  });
}

async function createNewJob(scheduledJob) {
  try {
    const scheduledJobData = await getScheduledJobData(scheduledJob);
    const newJobQuery = await constructNewJobQuery(scheduledJobData);

    await update(newJobQuery);
  } catch (err) {
    console.error(`Something went wrong while creating new job from scheduled-job '${scheduledJob.uri}'`);
    console.error(err);
  }
}

async function getScheduledJobData(scheduledJob) {
  try {
    const scheduledJobDataQuery = `
      ${PREFIXES}
      SELECT DISTINCT ?graph ?uri ?operation ?sourceUrl ?taskOperation WHERE {
          GRAPH ?graph {
          ?uri a cogs:ScheduledJob;
                        task:operation ?operation.

          ?scheduledTask dct:isPartOf ?uri;
                        task:inputContainer ?inputContainer;
                        task:operation ?taskOperation.
    
          ?inputContainer task:hasHarvestingCollection/dct:hasPart/nie:url ?sourceUrl.
          
          BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri) 
        }
      }
    `;

    const scheduledJobData = parseResult(await query(scheduledJobDataQuery))[0];
    return scheduledJobData;
  } catch(err) {
    console.error(`Something went wrong while querying 'graph', 'operation' & 'sourceUrl' of ${scheduledJob.uri}`);
    console.error(err);
  }
}

async function constructNewJobQuery(scheduledJob) {
  try {
    const jobId = uuid();
    const jobUri = `http://redpencil.data.gift/id/job/${jobId}`;
    const remoteDataObjectId = uuid();
    const remoteDataObjectUri = `http://data.lblod.info/id/remote-data-objects/${remoteDataObjectId}`;
    const harvestingCollectionId = uuid();
    const harvestingCollectionUri = `http://data.lblod.info/id/harvesting-collection/${remoteDataObjectId}`;
    const dataContainerId = uuid();
    const dataContainerUri = `http://redpencil.data.gift/id/dataContainers/${dataContainerId}`;
    const taskId = uuid();
    const taskUri = `http://redpencil.data.gift/id/task/${dataContainerId}`;
    const now = new Date();

    const newJobQuery = `
      ${PREFIXES}
      INSERT DATA {
        GRAPH ${sparqlEscapeUri(scheduledJob.graph)} {
          ${sparqlEscapeUri(jobUri)} a cogs:Job;
                mu:uuid ${sparqlEscapeString(jobId)};
                adms:status ${sparqlEscapeUri(STATUS_BUSY)};
                dct:creator ${sparqlEscapeUri(scheduledJob.uri)};
                dct:created ${sparqlEscapeDateTime(now)};
                dct:modified ${sparqlEscapeDateTime(now)};
                task:operation ${sparqlEscapeUri(scheduledJob.operation)}.

          ${sparqlEscapeUri(remoteDataObjectUri)} a nfo:RemoteDataObject;
                mu:uuid ${sparqlEscapeString(remoteDataObjectId)};
                nie:url ${sparqlEscapeString(scheduledJob.sourceUrl)};
                adms:status ${sparqlEscapeUri(STATUS_READY_TO_BE_CACHED)};
                rpioHttp:requestHeader ${sparqlEscapeUri(REQUEST_HEADER)};
                dct:created ${sparqlEscapeDateTime(now)};
                dct:modified ${sparqlEscapeDateTime(now)};
                dct:creator ${sparqlEscapeUri(scheduledJob.uri)}.

          ${sparqlEscapeUri(harvestingCollectionUri)} a hrvst:HarvestingCollection;
                mu:uuid ${sparqlEscapeString(harvestingCollectionId)};
                dct:creator ${sparqlEscapeUri(scheduledJob.uri)};
                dct:hasPart ${sparqlEscapeUri(remoteDataObjectUri)}.

          ${sparqlEscapeUri(dataContainerUri)} a nfo:DataContainer;
                mu:uuid ${sparqlEscapeString(dataContainerId)};
                task:hasHarvestingCollection ${sparqlEscapeUri(harvestingCollectionUri)}.

          ${sparqlEscapeUri(taskUri)} a task:Task;
                mu:uuid ${sparqlEscapeString(taskId)};
                adms:status ${sparqlEscapeUri(STATUS_SCHEDULED)};
                dct:created ${sparqlEscapeDateTime(now)};
                dct:modified ${sparqlEscapeDateTime(now)};
                task:operation ${sparqlEscapeUri(scheduledJob.taskOperation)};
                task:index ${sparqlEscapeInt(0)};
                task:inputContainer ${sparqlEscapeUri(dataContainerUri)};
                dct:isPartOf ${sparqlEscapeUri(jobUri)}.
        }
      }
    `;
    return newJobQuery;
  } catch(err) {
    console.error(`[DELTA] Something went wrong constructing create-job query: ${scheduledJob.uri}`);
    console.error(err);
  }
}



async function addScheduledJob(scheduledJob) {
  try {
    const queryScheduledJobs = `
      ${PREFIXES}
      SELECT DISTINCT ?uri ?frequency WHERE {
        ?uri a cogs:ScheduledJob;
              mu:uuid ?uuid;
              task:schedule ?schedule.

  		  ?schedule schema:repeatFrequency ?frequency.
        BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri)
      }
    `;

    const scheduledJobData = parseResult(await query(queryScheduledJobs));
    addScheduledJobsToCron(scheduledJobData);

  } catch(err) {
    console.error(`[DELTA] Something went wrong while ADDING scheduled-job to cron: ${scheduledJob.uri}`);
    console.error(err);
  }
}

function deleteScheduledJob(scheduledJob) {
  try {
    delete CRON_JOBS[scheduledJob.uri];
    return;
  } catch(err) {
    console.error(`[DELTA] Something went wrong while DELETING scheduled-job from cron: ${scheduledJob.uri}`);
    console.error(err);
  }

}

async function updateCronFrequency(schedule) {
  try {
    const queryScheduleJob = `
    ${PREFIXES}
    SELECT DISTINCT ?uri ?frequency WHERE {
      ?uri task:schedule ?schedule.
      ?schedule schema:repeatFrequency ?frequency.
      BIND(${sparqlEscapeUri(schedule.uri)} as ?schedule)
    } 
    `;

    const scheduledJob = parseResult(await query(queryScheduleJob));
    deleteScheduledJob(scheduledJob[0]);
    addScheduledJobsToCron(scheduledJob);

  } catch(err) {
    console.error(err);
  }
}


module.exports = {
  initScheduledJobs,
  addScheduledJob,
  deleteScheduledJob,
  updateCronFrequency
};


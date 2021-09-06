import { sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeInt, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { PREFIXES, REQUEST_HEADER, STATUS_BUSY, STATUS_READY_TO_BE_CACHED, STATUS_SCHEDULED} from '../constants';
import { parseResult } from '../utils/parseResult';
import { CronJob } from 'cron';

const CRON_JOBS = {};

async function scheduleJobs() {
  try {
    const queryScheduledJobs = `
      ${PREFIXES}
      SELECT DISTINCT ?uri ?frequency WHERE {
        ?uri a cogs:ScheduledJob;
              mu:uuid ?uuid;
              task:schedule ?schedule.

  		  ?schedule schema:repeatFrequency ?frequency.
      }
    `;

    const result = await query(queryScheduledJobs);
    const jobsList = parseResult(result);

    if (jobsList.length == 0) {
      console.log("No scheduled jobs found.");
      return;
    }

    console.log(`Found ${jobsList.length} jobs that need to be scheduled`);

    jobsList.forEach(job => {
      CRON_JOBS[job.uri] = new CronJob(job.frequency, function() {
        createNewJob(job);
      }, null, true);
    });

  } catch(err) {
    console.error(err);
  }
}

async function createNewJob(job) {
  try {
    const queryJobData = `
        ${PREFIXES}
        SELECT DISTINCT ?graph ?operation ?url WHERE {
            GRAPH ?graph {
            ${sparqlEscapeUri(job.uri)} a cogs:ScheduledJob;
                          task:operation ?operation.

            ?scheduledTask dct:isPartOf ${sparqlEscapeUri(job.uri)};
                          task:inputContainer ?inputContainer.
      
            ?inputContainer task:hasHarvestingCollection/dct:hasPart/nie:url ?url.
          }
        }
      `;

      const result = await query(queryJobData);
      const data = parseResult(result)[0]; 

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
      console.log(data.graph);

      const createNewJobQuery = `
        ${PREFIXES}
        INSERT DATA {
          GRAPH ${sparqlEscapeUri(data.graph)} {
            ${sparqlEscapeUri(jobUri)} a cogs:Job;
                  mu:uuid ${sparqlEscapeString(jobId)};
                  adms:status ${sparqlEscapeUri(STATUS_BUSY)};
                  dct:creator ${sparqlEscapeUri(job.uri)};
                  dct:created ${sparqlEscapeDateTime(now)};
                  dct:modified ${sparqlEscapeDateTime(now)};
                  task:operation ${sparqlEscapeUri(data.operation)}.

            ${sparqlEscapeUri(remoteDataObjectUri)} a nfo:RemoteDataObject;
                  mu:uuid ${sparqlEscapeString(remoteDataObjectId)};
                  adms:status ${sparqlEscapeUri(STATUS_READY_TO_BE_CACHED)};
                  rpioHttp:requestHeader ${sparqlEscapeUri(REQUEST_HEADER)};
                  dct:created ${sparqlEscapeDateTime(now)};
                  dct:modified ${sparqlEscapeDateTime(now)};
                  dct:creator ${sparqlEscapeUri(job.uri)}.

            ${sparqlEscapeUri(harvestingCollectionUri)} a hrvst:HarvestingCollection;
                  mu:uuid ${sparqlEscapeString(harvestingCollectionId)};
                  dct:creator ${sparqlEscapeUri(job.uri)};
                  dct:hasPart ${sparqlEscapeUri(remoteDataObjectUri)}.

            ${sparqlEscapeUri(dataContainerUri)} a nfo:DataContainer;
                  mu:uuid ${sparqlEscapeString(dataContainerId)};
                  task:hasHarvestingCollection ${sparqlEscapeUri(harvestingCollectionUri)}.

            ${sparqlEscapeUri(taskUri)} a task:Task;
                  mu:uuid ${sparqlEscapeString(taskId)};
                  adms:status ${sparqlEscapeUri(STATUS_SCHEDULED)};
                  dct:created ${sparqlEscapeDateTime(now)};
                  dct:modified ${sparqlEscapeDateTime(now)};
                  task:operation ${sparqlEscapeUri(data.operation)};
                  task:index ${sparqlEscapeInt(0)};
                  task:inputContainer ${sparqlEscapeUri(dataContainerUri)};
                  dct:isPartOf ${sparqlEscapeUri(jobUri)}.
          }
        }
      `;

      await update(createNewJobQuery);
  } catch (err) {
    console.error(err);
  }
}

async function scheduleSingleJob(newScheduledJob) {
  try {
    const queryScheduledJobs = `
      ${PREFIXES}
      SELECT DISTINCT ?uri ?frequency WHERE {
        ?uri a cogs:ScheduledJob;
              mu:uuid ?uuid;
              task:schedule ?schedule.

  		  ?schedule schema:repeatFrequency ?frequency.
        BIND(${sparqlEscapeUri(newScheduledJob.uri)} as ?uri)
      }
    `;

    const result = await query(queryScheduledJobs);
    const scheduledJob = parseResult(result)[0];

    console.log(scheduledJob);

    CRON_JOBS[scheduledJob.uri] = new CronJob(scheduledJob.frequency, function() {
      createNewJob(scheduledJob);
    }, null, true);

  } catch(err) {
    console.error(err);
  }
}


module.exports = {
  scheduleJobs,
  scheduleSingleJob
};
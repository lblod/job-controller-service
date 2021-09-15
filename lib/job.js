import { sparqlEscapeUri,  sparqlEscapeString, sparqlEscapeDateTime, sparqlEscapeInt } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { JOB_TYPE, PREFIXES, REQUEST_HEADER, STATUS_BUSY, STATUS_READY_TO_BE_CACHED, STATUS_SCHEDULED } from '../constants';
import { parseResult } from '../utils/parseResult';
import { createError, removeError } from './error';
import { v4 as uuid } from 'uuid';

export async function loadJob( subject ){
  const queryJob = `
    ${PREFIXES}
    SELECT DISTINCT ?graph ?job ?created ?modified ?creator ?status ?error ?operation WHERE {
     GRAPH ?graph {
       BIND(${sparqlEscapeUri(subject)} AS ?job)
       ?job a ${sparqlEscapeUri(JOB_TYPE)};
         dct:creator ?creator;
         adms:status ?status;
         dct:created ?created;
         task:operation ?operation;
         dct:modified ?modified.

       OPTIONAL { ?job task:error ?error. }
     }
    }
  `;

  const job = parseResult(await query(queryJob))[0];
  if(!job) return null;

  //load has many
  const queryTasks = `
   ${PREFIXES}
   SELECT DISTINCT ?job ?task WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?job)
       ?task dct:isPartOf ?job
      }
    }
  `;

  const tasks = parseResult(await query(queryTasks)).map(row => row.task);
  job.tasks = tasks;

  return job;
}

export async function updateJob( job ){
  const storedJobData = await loadJob(job.job);
  if(storedJobData.error){
    await removeError(storedJobData.error); //TODO: fix ambuigity. Loading loads URI for relation. Update expects hash
  }

  job.modified = new Date();

  const tasksTriples = job.tasks
        .map(task => `${sparqlEscapeUri(task)} dct:isPartOf ${sparqlEscapeUri(job.job)}.`)
        .join('\n');

  let errorTriple = '';
  if(job.error){
    const error = await createError(job.graph, job.error.message);
    errorTriple = `${sparqlEscapeUri(job.job)} task:error ${sparqlEscapeString(error.error)}.`;
  }

  const updateQuery = `
    ${PREFIXES}
    DELETE {
      GRAPH ?g {
        ?job dct:creator ?creator;
           adms:status ?status;
           dct:created ?created;
           task:operation ?operation;
           dct:modified ?modified.

        ?task dct:isPartOf ?job.
        ?job task:error ?error.
      }
    }
    WHERE {
      GRAPH ?g {
       BIND(${sparqlEscapeUri(job.job)} AS ?job)
       ?job a ${sparqlEscapeUri(JOB_TYPE)};
         dct:creator ?creator;
         adms:status ?status;
         dct:created ?created;
         task:operation ?operation;
         dct:modified ?modified.

       OPTIONAL { ?task dct:isPartOf ?job. }
       OPTIONAL { ?job task:error ?error. }
      }
    }

    ;

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(job.graph)}{
        ${sparqlEscapeUri(job.job)} dct:creator ${sparqlEscapeUri(job.creator)};
           adms:status ${sparqlEscapeUri(job.status)};
           dct:created ${sparqlEscapeDateTime(job.created)};
           task:operation ${sparqlEscapeUri(job.operation)};
           dct:modified ${sparqlEscapeDateTime(job.modified)}.

        ${errorTriple}
        ${tasksTriples}
      }
    }
  `;

  await update(updateQuery);

  return loadJob(job.job);
}


export async function createJob(scheduledJob) {
  // TODO this need to be more thought through, deep cleanup needed
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
  await update(newJobQuery);
}

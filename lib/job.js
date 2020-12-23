import { sparqlEscapeUri,  sparqlEscapeString, sparqlEscapeDateTime } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { JOB_TYPE, PREFIXES } from '../constants';
import { parseResult } from './utils';
import { createError, removeError } from './error';

export async function loadJob( subject ){
  const queryJob = `
    ${PREFIXES}
    SELECT DISTINCT ?graph ?job ?created ?modified ?creator ?status ?activeTask ?error ?jobType WHERE {
     GRAPH ?graph {
       BIND(${sparqlEscapeUri(subject)} AS ?job)
       ?job a ${sparqlEscapeUri(JOB_TYPE)};
         dct:creator ?creator;
         adms:status ?status;
         dct:created ?created;
         jobs:jobType ?jobType;
         dct:modified ?modified.

       OPTIONAL { ?job jobs:activeTask ?activeTask. }
       OPTIONAL { ?job jobs:error ?error. }
     }
    }
  `;

  const job = parseResult(query(queryJob))[0];
  if(!job) return null;

  //load has many
  const queryTasks = `
   ${PREFIXES}
   SELECT DISTINCT ?job ?task WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?job)
       ?job jobs:task ?task.
      }
    }
  `;

  const tasks = parseResult(await query(queryTasks)).map(row => row.task);
  job.tasks = tasks;

  return job;
}

export async function updateJob( job ){
  const storedJobData = await loadJob(job.uri);
  await removeError(storedJobData.error); //TODO: fix ambuigity. Loading loads URI for relation. Update expects hash

  job.modified = new Date();

  const tasksTriples = job.tasks
        .map(task => `${sparqlEscapeUri(job.job)} jobs:task ${sparqlEscapeUri(task)}.`)
        .join('\n');

  let errorTriple = '';
  if(job.error){
    const error = await createError(job.graph, job.error.message);
    errorTriple = `${sparqlEscapeUri(job.job)} jobs:error ${sparqlEscapeString(error.error)}.`;
  }

  let activeTaskTriple = '';
  if(job.activeTask){
    activeTaskTriple = `${sparqlEscapeUri(job.job)} job:activeTAsk ${sparqlEscapeString(job.activeTask)}.`;
  }

  const updateQuery = `
    ${PREFIXES}
    DELETE {
      GRAPH ?g {
        ?job dct:creator ?creator;
           adms:status ?status;
           dct:created ?created;
           jobs:jobType ?jobType;
           dct:modified ?modified.

        ?job jobs:task ?task.
        ?job job:activeTask ?activeTask.
        ?job job:error ?error.
      }
    }
    WHERE {
      GRAPH ?g {
       BIND(${sparqlEscapeUri(job.job)} AS ?job)
       ?job a ${sparqlEscapeUri(JOB_TYPE)};
         dct:creator ?creator;
         adms:status ?status;
         dct:created ?created;
         jobs:jobType ?jobType;
         dct:modified ?modified.

       OPTIONAL { ?job jobs:task ?task. }
       OPTIONAL { ?job job:activeTask ?activeTask. }
       OPTIONAL { ?job job:error ?error. }
      }
    }

    ;

    INSERT DATA {
      GRAPH ${job.graph}{
        ${sparqlEscapeUri(job.job)} dct:creator ${sparqlEscapeUri(job.creator)};
           adms:status ${sparqlEscapeUri(job.status)};
           dct:created ${sparqlEscapeDateTime(job.created)};
           jobs:jobType ${sparqlEscapeUri(job.jobType)};;
           dct:modified ${sparqlEscapeDateTime(job.modified)}.

        ${errorTriple}
        ${tasksTriples}
        ${activeTaskTriple}
      }
    }
  `;

  await update(updateQuery);

  return loadJob(job.job);
}

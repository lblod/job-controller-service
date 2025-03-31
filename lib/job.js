import { sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { JOB_TYPE, PREFIXES } from '../constants';
import { parseResult } from './utils';

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
  //TODO: review the error flow
  // Probably we want to attach the error to the task
  // and it somehow 'bubbles up' to the job
  const storedJobData = await loadJob(job.job);

  job.modified = new Date();

  const tasksTriples = job.tasks
        .map(task => `${sparqlEscapeUri(task)} dct:isPartOf ${sparqlEscapeUri(job.job)}.`)
        .join('\n');

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

        ${tasksTriples}
      }
    }
  `;

  await update(updateQuery);

  return loadJob(job.job);
}

import { sparqlEscapeUri, sparqlEscapeDateTime } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import {
  JOB_TYPE,
  SPARQL_PREFIXES,
  STATUS_FAILED,
  STATUS_SUCCESS,
} from "../constants";
import { parseResult } from "./utils";
import * as jobsConfig from "../config/config.json";

export async function loadJob(subject) {
  const queryJob = `
    ${SPARQL_PREFIXES}
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
  if (!job) {
    return null;
  }

  //load has many
  const queryTasks = `
   ${SPARQL_PREFIXES}
   SELECT DISTINCT ?job ?task WHERE {
     GRAPH ?g {
       BIND(${sparqlEscapeUri(subject)} as ?job)
       ?task dct:isPartOf ?job
      }
    }
  `;

  const tasks = parseResult(await query(queryTasks)).map((row) => row.task);
  job.tasks = tasks;

  return job;
}

export async function updateJob(job) {
  //TODO: review the error flow
  // Probably we want to attach the error to the task
  // and it somehow 'bubbles up' to the job
  job.modified = new Date();

  const tasksTriples = job.tasks
    .map(
      (task) =>
        `${sparqlEscapeUri(task)} dct:isPartOf ${sparqlEscapeUri(job.job)}.`,
    )
    .join("\n");

  const updateQuery = `
    ${SPARQL_PREFIXES}
    DELETE {
      GRAPH ?g {
        ?job dct:creator ?creator;
           adms:status ?status;
           dct:created ?created;
           task:operation ?operation;
           dct:modified ?modified.
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

// now that a job can have multiple tasks going in parallel, it's no longer
// enough to check if a delta received completed task is the final one in the job
// and the job has only completed tasks.
export async function isJobComplete(job) {
  return !(await hasNonFinalOrIncompleteTask(job));
}

async function hasNonFinalOrIncompleteTask(job) {
  const finalOperations = getFinalOperations(job);
  const safeFinalOperationValues = finalOperations
    .map(sparqlEscapeUri)
    .join("\n");
  const safeFinalOperationFilter = finalOperations
    .map(sparqlEscapeUri)
    .join(", ");

  // union part1: get me my tasks that are last in chain and not final,
  // if they are not failed, we still need to continue the chain

  // union part2: get me my tasks that are last in chain and final,
  // if their status is not failed or success, we're not done with them yet
  const result = await query(`
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    SELECT * WHERE {
      ?task dct:isPartOf ${sparqlEscapeUri(job.job)} .
      FILTER NOT EXISTS {
        ?next <http://vocab.deri.ie/cogs#dependsOn> ?task .
      }
        
      {
        ?task task:operation ?op .
        FILTER(?op NOT IN ( ${safeFinalOperationFilter} ) )
        FILTER NOT EXISTS {
          ?task adms:status ${sparqlEscapeUri(STATUS_FAILED)} .
        }
      } UNION {
        VALUES ?finalOp {
          ${safeFinalOperationValues}
        }
        ?task task:operation ?finalOp.
        ?task adms:status ?status .
        FILTER (?status NOT IN ( ${sparqlEscapeUri(STATUS_FAILED)}, ${sparqlEscapeUri(STATUS_SUCCESS)} ))
      }

    } limit 1
  `);

  return result.results.bindings.length > 0;
}

// there can in theory be multiple final operations if the config makes it a graph
// simply mark the operations as final if there is no follow up defined
// we are assuming here that the graph is acyclic, but that seems like a fair assumption atm
function getFinalOperations(job) {
  const config = jobsConfig[job.operation];
  if (!config)
    throw new Error(
      `No config for operation "${job.operation}" could be found.`,
    );
  const taskConfig = config.tasksConfiguration;
  if (!taskConfig)
    throw new Error(
      `The configuration for "${job.operation}" might be malformed.`,
    );
  const possiblyFinal = new Set();
  taskConfig.forEach((task) => {
    possiblyFinal.add(task.nextOperation);
  });
  taskConfig.forEach((task) => {
    possiblyFinal.delete(task.currentOperation);
  });
  return [...possiblyFinal];
}

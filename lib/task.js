import { sparqlEscapeUri,  sparqlEscapeString, sparqlEscapeDateTime, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { TASK_TYPE, SPARQL_PREFIXES, TASK_URI_PREFIX, STATUS_FAILED, STATUS_SCHEDULED, STATUS_SUCCESS } from '../constants';
import { parseResult, writeTriplesToGraph } from './utils';

import * as N3 from 'n3';
const { namedNode } = N3.DataFactory;

export async function isTask( subject ){
  //TODO: move to ask query
  const queryStr = `
   ${SPARQL_PREFIXES}
   SELECT ?subject WHERE {
    GRAPH ?g {
      BIND(${ sparqlEscapeUri(subject) } as ?subject)
      ?subject a ${ sparqlEscapeUri(TASK_TYPE) }.
    }
   }
  `;
  const result = await query(queryStr);
  return result.results.bindings.length;
}

export async function loadTask( subject ){
  const queryTask = `
   ${SPARQL_PREFIXES}
   SELECT DISTINCT ?graph ?task ?job ?created ?modified ?status ?index ?operation ?error WHERE {
    GRAPH ?graph {
      BIND(${ sparqlEscapeUri(subject) } as ?task)
      ?task a ${ sparqlEscapeUri(TASK_TYPE) }.
      ?task dct:isPartOf ?job;
                    dct:created ?created;
                    dct:modified ?modified;
                    adms:status ?status;
                    task:index ?index;
                    task:operation ?operation.

      OPTIONAL { ?task task:error ?error. }
    }
   }
  `;

  const task = parseResult(await query(queryTask))[0];
  if(!task) return null;

  //now fetch the hasMany. Easier to parse these
  const queryParentTasks = `
   ${SPARQL_PREFIXES}
   SELECT DISTINCT ?task ?parentTask WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?task)
       ?task cogs:dependsOn ?parentTask.

      }
    }
  `;

  const parentTasks = parseResult(await query(queryParentTasks)).map(row => row.parentTask);
  task.parentSteps = parentTasks;

  const queryResultsContainers = `
   ${SPARQL_PREFIXES}
   SELECT DISTINCT ?task ?resultsContainer WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?task)
       ?task task:resultsContainer ?resultsContainer.
      }
    }
  `;

  const resultsContainers = parseResult(await query(queryResultsContainers)).map(row => row.resultsContainer);
  task.resultsContainers = resultsContainers;

  const queryInputContainers = `
   ${SPARQL_PREFIXES}
   SELECT DISTINCT ?task ?inputContainer WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?task)
       ?task task:inputContainer ?inputContainer.
      }
    }
  `;

  const inputContainers = parseResult(await query(queryInputContainers)).map(row => row.inputContainer);
  task.inputContainers = inputContainers;
  return task;
}

export async function loadTasksForJob( jobUri ){
  const queryTasks = `
    ${SPARQL_PREFIXES}
    SELECT DISTINCT ?job ?task WHERE {
      GRAPH ?g {
        BIND(${jobUri} as ?job)
        ?task dct:isPartOf ?job.
      }
    }
  `;

  const linkedTasks = parseResult(await query(queryTasks));
  const tasks = [];
  for(const linkedTask of linkedTasks){
    const task = await loadTask(linkedTask.task);
    if(!task) throw `No task loaded for subject ${linkedTask.task}`;
    tasks.push(task);
  }

  return tasks;
}

export async function taskExists(graph, job, index, operation, parentTasks) {
  const parentTaskTriples = (parentTasks || [])
        .map(parent => `?task cogs:dependsOn ${sparqlEscapeUri(parent)}.`)
        .join('\n');

    const queryStr = `
        ${SPARQL_PREFIXES}
        SELECT ?task {
            GRAPH <${graph}> {
                ?task a <${TASK_TYPE}>;
                task:index ${sparqlEscapeString(index)};
                task:operation <${operation}>;
                adms:status ?status;
                dct:isPartOf <${job}>.
                FILTER (?status != <${STATUS_FAILED}>)

                ${parentTaskTriples}
            }
        }
    `;
    const result = await query(queryStr);
    return result.results.bindings.length;
}
export async function createTask( graph, job, index, operation, status, parentTasks, inputContainers ){
  const id = uuid();
  const uri = TASK_URI_PREFIX + id;
  const created = new Date();

  // First, the task will be created with "preparing" status
  const parentTaskTriples = parentTasks
        .map(parent => `${sparqlEscapeUri(uri)} cogs:dependsOn ${sparqlEscapeUri(parent)}.`)
        .join('\n');

   const insertQuery = `
    ${SPARQL_PREFIXES}
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(graph)} {
       ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(TASK_TYPE)};
                mu:uuid ${sparqlEscapeString(id)};
                dct:isPartOf ${sparqlEscapeUri(job)};
                dct:created ${sparqlEscapeDateTime(created)};
                dct:modified ${sparqlEscapeDateTime(created)};
                adms:status ${sparqlEscapeUri(status)};
                task:index ${sparqlEscapeString(index)};
                task:operation ${sparqlEscapeUri(operation)}.

        ${parentTaskTriples}
      }
    }
  `;

  await update(insertQuery);

  // Second, we write the input containers in batches, because the number of input containers can be too much for one INSERT query
  const inputContainersStore = new N3.Store();
  inputContainers.map(container => 
    inputContainersStore.addQuad(
      namedNode(uri),
      namedNode("http://redpencil.data.gift/vocabularies/tasks/inputContainer"),
      namedNode(container),
      namedNode(graph)
    )
  );
  await writeTriplesToGraph(namedNode(graph), inputContainersStore);

  // Third, we update the task to "scheduled"
  await updateTaskStatus(uri, STATUS_SCHEDULED);
  
  return await loadTask(uri);
}

/**
 * Updates the task with a new status in the triplestore.
 *
 * @public
 * @async
 * @function
 * @param {string} task - Represents the URI of the task.
 * @param {string} status - The new status.
 * @returns {undefined} Nothing
 */
export async function updateTaskStatus(task, status) {
  const now = new Date().toISOString();
  return update(`
    ${SPARQL_PREFIXES}
    DELETE {
      GRAPH ?g {
        ?subject adms:status ?status .
        ?subject dct:modified ?modified .
      }
    }
    INSERT {
      GRAPH ?g {
       ?subject adms:status ${sparqlEscapeUri(status)} .
       ?subject dct:modified ${sparqlEscapeDateTime(now)} .
      }
    }
    WHERE {
      GRAPH ?g {
        BIND(${sparqlEscapeUri(task)} as ?subject)
        ?subject adms:status ?status .
        OPTIONAL { ?subject dct:modified ?modified . }
      }
    }`);
}

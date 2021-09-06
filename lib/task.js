import { sparqlEscapeUri,  sparqlEscapeString, sparqlEscapeDateTime, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { TASK_TYPE, PREFIXES, TASK_URI_PREFIX } from '../constants';
import { parseResult } from '../utils/parseResult';

export async function isTask( subject ){
  //TODO: move to ask query
  const queryStr = `
   ${PREFIXES}
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
   ${PREFIXES}
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
   ${PREFIXES}
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
   ${PREFIXES}
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
   ${PREFIXES}
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
    ${PREFIXES}
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

export async function createTask( graph, job, index, operation, status, parentTasks, inputContainers ){
  const id = uuid();
  const uri = TASK_URI_PREFIX + id;
  const created = new Date();

  const parentTaskTriples = parentTasks
        .map(parent => `${sparqlEscapeUri(uri)} cogs:dependsOn ${sparqlEscapeUri(parent)}.`)
        .join('\n');

  const inputContainerTriples = inputContainers
        .map(container => `${sparqlEscapeUri(uri)} task:inputContainer ${sparqlEscapeUri(container)}.`)
        .join('\n');

  const insertQuery = `
    ${PREFIXES}
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
        ${inputContainerTriples}
      }
    }
  `;

  await update(insertQuery);

  return await loadTask(uri);
}

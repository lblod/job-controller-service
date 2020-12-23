import { sparqlEscapeUri,  sparqlEscapeString, sparqlEscapeDateTime, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { TASK_TYPE, PREFIXES, TASK_URI_PREFIX } from '../constants';
import { parseResult } from './utils';

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
   SELECT DISTINCT ?task ?job ?created ?modified ?status ?taskIndex ?taskType ?error WHERE {
    GRAPH ?g {
      BIND(${ sparqlEscapeUri(subject) } as ?task)
      ?task a ${ sparqlEscapeUri(TASK_TYPE) }.
      ?task dct:isPartOf ?job;
                    dct:created ?created;
                    dct:modified ?modified;
                    adms:status ?status;
                    jobs:taskIndex ?taskIndex;
                    jobs:taskType ?taskType.

      OPTIONAL { ?task jobs:error ?error. }
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
       ?task jobs:resultsContainer ?resultsContainer.
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
       ?task jobs:inputContainer ?inputContainer.
      }
    }
  `;

  const inputContainers = parseResult(await query(queryInputContainers)).map(row => row.inputContainer);
  task.inputContainers = inputContainers;

  return task;
}

export async function createTask( graph, job, index, taskType, status, parentTasks, inputContainers ){
  const id = uuid();
  const uri = TASK_URI_PREFIX + id;
  const created = new Date();

  const parentTaskTriples = parentTasks
        .map(parent => `${sparqlEscapeUri(uri)} cogs:dependsOn ${sparqlEscapeUri(parent)}.`)
        .join('\n');

  const inputContainerTriples = inputContainers
        .map(container => `${sparqlEscapeUri(uri)} jobs:inputContainer ${sparqlEscapeUri(container)}.`)
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
                jobs:taskIndex ${sparqlEscapeString(index)};
                jobs:taskType ${sparqlEscapeUri(taskType)}.

        ${parentTaskTriples}
        ${inputContainerTriples}
      }
    }
  `;

  await update(insertQuery);

  return await loadTask(uri);
}

// export async function updateTaskStepStatus(uri, status) {
//   const q = `
//     ${PREFIXES}

//     DELETE {
//       GRAPH ?g {
//         ${sparqlEscapeUri(uri)} adms:status ?status .
//       }
//     } WHERE {
//       GRAPH ?g {
//         ${sparqlEscapeUri(uri)} adms:status ?status .
//       }
//     }

//     ;

//     INSERT {
//       GRAPH ?g {
//         ${sparqlEscapeUri(uri)} adms:status ${sparqlEscapeUri(status)} .
//       }
//     } WHERE {
//       GRAPH ?g {
//         ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(TASK_STEP_TYPE)} .
//       }
//     }

//   `;
//   await update(q);

// }

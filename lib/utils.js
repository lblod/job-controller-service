
import { WRITER_PREFIXES, BATCH_SIZE, SLEEP_TIME } from '../constants';
import { updateSudo } from '@lblod/mu-auth-sudo';
import { termToString } from 'rdf-string-ttl';

import * as N3 from 'n3';


/**
 * convert results of select query to an array of objects.
 * courtesy: Niels Vandekeybus & Felix
 * @method parseResult
 * @return {Array}
 */
export function parseResult( result ) {
  if(!(result.results && result.results.bindings.length)) return [];

  const bindingKeys = result.head.vars;
  return result.results.bindings.map((row) => {
    const obj = {};
    bindingKeys.forEach((key) => {
      if(row[key] && row[key].datatype == 'http://www.w3.org/2001/XMLSchema#integer' && row[key].value){
        obj[key] = parseInt(row[key].value);
      }
      else if(row[key] && row[key].datatype == 'http://www.w3.org/2001/XMLSchema#dateTime' && row[key].value){
        obj[key] = new Date(row[key].value);
      }
      else obj[key] = row[key] ? row[key].value:undefined;
    });
    return obj;
  });
};

/**
 * Convert a store of quads into a string that can be inserted in a SPARQL
 * query.
 *
 * @public
 * @function
 * @param {N3.Store|Iterable} store - A collection (N3.Store or Array, or
 * something else that can iterated on) that contains RDF.js quads.
 * @returns {String} The triples in SPARQL body form. (No graphs and no
 * prefixes.)
 */
export async function storeToSparql(store) {
  return await storeToString(store, true);
}

/**
 * Converts a store of quads into a string, with or without prefixes.
 *
 * @function
 * @param {N3.Store|Iterable} store - A collection (N3.Store or Array, or
 * something else that can iterated on) that contains RDF.js quads.
 * @param {Boolean} [forSparql = true] - If true, the result will be formatted
 * in N-Triples syntax (without prefixes) so it can be used inside a SPARQL
 * query. If false, the result will contain prefix definitions at the top of
 * the file that will be used throughout the file and will be formatted in
 * more dense Turtle syntax.
 *
 * **NOTE:** realistically, the difference between N-Triples and Turtle syntax
 * is not big. Some datatypes are less explicit in Turtle, such as booleans,
 * which causes mu-authorization to fail.
 */
async function storeToString(store, forSparql = true) {
  // Use the WRITER_PREFIXES, there is much more in them than what is needed
  // for the SPARQL queries.
  const options = forSparql
    ? { format: 'N-Triples' }
    : { format: 'Turtle', prefixes: WRITER_PREFIXES };
  const writer = new N3.Writer(options);
  store.forEach((q) => writer.addQuad(q.subject, q.predicate, q.object));

  return new Promise((resolve, reject) => {
    writer.end((err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

/**
 * Gets the triples related to a task. It first tries to get the triples from
 * the file related to the inputContainer, but if that fails, it tries to get
 * the files from the graph related to the inputContainer.
 *
 * @public
 * @async
 * @function
 * @param {NamedNode} task -
 * @returns {N3.Store}
 */
export async function getTriples(task) {
  try {
    return getTriplesInFile(task);
  } catch (e) {
    console.error('An error occurred, trying from graph', e);
    return getTriplesInGraph(task);
  }
}

/**
 * Writes a store with triples to the triplestore in the specified graph. The
 * triples are split in smaller queries according to a batch size. If an insert
 * fails, the batch size is reduced and tried again.
 *
 * TODO: maybe a rewrite without recursion? Recursion has limits in JavaScript,
 * but even large numbers of triples won't create too much recursion (log₂(N))
 * so it's not a big problem here.
 *
 * @public
 * @async
 * @function
 * @param {NamedNode} graph - Graph in which to insert the data.
 * @param {N3.Store|Iterable} store - An N3.Store or other Iterable (like an
 * Array) that contains RDF.js quads.
 * @param {Integer} [batchSize] - This is used to split the collection of
 * triples in a series of queries.
 * @returns {undefined} Nothing.
 */
export async function writeTriplesToGraph(
  graph,
  store,
  batchSize = BATCH_SIZE,
) {
  const triples = [...store];
  const pages = Math.ceil(triples.length / batchSize);
  for (let page = 0; page < pages; page++) {
    const batch = triples.slice(page * batchSize, (page + 1) * batchSize);
    const triplesString = await storeToSparql(batch);
    const queryStr = `
      INSERT DATA {
        GRAPH ${termToString(graph)} {
          ${triplesString}
        }
      }`;
    try {
      await updateSudo(queryStr);
    } catch (e) {
      if (batchSize > 1) {
        console.warn(
          `INSERT batch of triples failed. Retrying with smaller batch size ${Math.ceil(
            batchSize / 2,
          )}`,
        );
        await sleep(SLEEP_TIME);
        await writeTriplesToGraph(graph, batch, Math.ceil(batchSize / 2));
      } else {
        console.error('INSERT of a triple failed:');
        console.error(queryStr);
        // Throw an error on any failed insertion after retrying as much as
        // needed.
        throw e;
      }
    }
  }
}

/**
 * Simple. Sleep for the given amount of milliseconds.
 *
 * @public
 * @async
 * @function
 * @param {Integer} ms - The amount of milliseconds to sleep for.
 * @returns {undefined} Nothing. (Note that this is an async function, so you
 * should `await` it or use the returned promise to wait for its resolution.)
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
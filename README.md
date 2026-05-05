# job-controller-service
Microservice responsible for managing a data processing job and its related tasks.

# model

## prefixes
```
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
```

## Job
The instance of a process or group of processes (workflow).

## class
`cogs:Job`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
creator | dct:creator | rdfs:Resource
status | adms:status | adms:Status
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
jobType | task:operation | skos:Concept
error | task:error | oslc:Error

## Task
Subclass of `cogs:Job`

## class
`task:Task`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
status | adms:status | adms:Status
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
operation | task:operation | skos:Concept
index | task:index | xsd:string | May be used for ordering. E.g. : '1', '2.1', '2.2', '3'
error | task:error | oslc:Error
parentTask| cogs:dependsOn | task:Task
job | dct:isPartOf | rdfs:Resource | Refer to the parent job
resultsContainer | task:resultsContainer | nfo:DataContainer | An generic type, which may have elements such as File, Graph. The consumer needs to determine how to handle it.
inputContainer | task:inputContainer | nfo:DataContainer | An generic type, which may have elements such as File, Graph. The consumer needs to determine how to handle it.

## Error

## class
`oslc:Error`

## properties
Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
message | oslc:message | xsd:string


# Usage
## docker-compose.yml
```yaml
  jobs-controller:
    image: lblod/job-controller-service:x.x.x
    volumes:
      - ./config/job-controller/:/config/
```
## config.json
An example config:
```json
{
  "http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvesting": {
    "tasksConfiguration": [
      {
        "currentOperation": null,
        "nextOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting",
        "nextIndex": "0"
      },
      {
        "currentOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting",
        "nextOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/importing",
        "nextIndex": "1",
        "external": true,
      },
      {
        "currentOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/importing",
        "nextOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/validating",
        "nextIndex": "2"
      }
    ]
  }
}
```

In this config, one type of job is described, a job with `task:operation` equal to `http://lblod.data.gift/id/jobs/concept/JobOperation/lblodHarvesting`. This job has a sequence of 3 tasks. Each task has the following fields:
- `currentOperation`: the `task:operation` of the task before this one, if any. The first on in the list doesn't have one in our example.
- `nextOperation`: the `task:operation` of this task
- `nextIndex`: the index of this task
- `external`: optional, if set to true, it indicates that the next task for this task is being created externally to the job-controller. This is useful in case complex logic is needed to determine the next task or in case the task is being split into many concurrent tasks for instance. Such splitting allows turning this sequence from a pure linear sequence into a tree or even a graph. As such splitting logic is often very domain-dependent, it is left to be implemented in its own service and not included in the job-controller logic.

## deltanotifier
```js
[ //other rules
  {
    match: {
      predicate: {
        type: 'uri',
        value: 'http://www.w3.org/ns/adms#status'
      }
    },
    callback: {
      method: 'POST',
      url: 'http://jobs-controller/delta'
    },
    options: {
      resourceFormat: 'v0.0.1',
      gracePeriod: 1000,
      ignoreFromSelf: true
    }
  }
]
```
# Caveats
- The service assumes the job is stored in one graph.
- The current job configuration is linear, i.e. one task follows from one task. But a tree or graph like job configuration can be realized by using the `external` property and have a dedicated service take care of the splitting and merging logic. This logic is externalized because it is often very domain-dependent. It is therefore handled as a task itself, e.g. http://lblod.data.gift/id/jobs/concept/TaskOperation/split-for-annotation

# job-controller-service
Microservice responsible for managing a data processing job and its related tasks.

# model

## prefixes
```
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX lblodJob: <http://lblod.data.gift/vocabularies/lblodJob/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
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
jobType | lblodJob:jobType | skos:Concept
error | lblodJob:error | oslc:Error

## Task
Subclass of `cogs:Job`

## class
`lblodJob:Task`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
status | adms:status | adms:Status
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
taskType | lblodJob:taskType | skos:Concept
taskIndex | lblodJob:taskIndex | xsd:string | May be used for orderering. E.g. : '1', '2.1', '2.2', '3'
error | lblodJob:error | oslc:Error
parentTask| cogs:dependsOn | lblodJob:Task
job | dct:isPartOf | rdfs:Resource | Refer to the parent job
resultsContainer | lblodJob:resultsContainer | nfo:DataContainer | An abstract type, which may be instantiated as e.g File, Graph. The consumer needs to determine how to handle it.
inputContainer | lblodJob:inputContainer | nfo:DataContainer | An abstract type, which may be instantiated as e.g File, Graph. The consumer needs to determine how to handle it.

## Error

## class
`oslc:Error`

## properties
Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
message | oslc:message | xsd:string


# Useage
The configuration of the job may be found in `jobs-config/config`.
For now default `http://lblod.data.gift/vocabularies/jobs/concept/JobType/lblodHarvesting` is provided.
It should be possible to provide custom config at startup, by overriding the file (untested).
The data structure of a configuration and the way it is loaded will most certainly change over time.

# Caveats
- The service assumes the job is stored in one graph.
- The current job configuration is linear, i.e. one task follows from one task. But a tree or graph like job configuration should perfectly be feasible in the future. Without changing the model.

# job-controller-service
Microservice responsible for managing a data processing job and its related tasks.

# model

## prefixes
```
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX jobs: <http://lblod.data.gift/vocabularies/processingJobs/>
  PREFIX terms: <http://purl.org/dc/terms/>
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
creator | dct:creator | rdfs:Resource
status | adms:status | adms:Status
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
jobType | jobs:jobType | skos:Concept
activeTask | jobs:activeTask | jobs:Task
error | jobs:error | oslc:Error
task | jobs:activeTask | jobs:Task

## Task
Subclass of `cogs:Job`

## class
`jobs:Task`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
status | adms:status | adms:Status
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
taskType | jobs:taskType | skos:Concept
taskIndex | jobs:taskIndex | xsd:string | May be used to sort. Probably used as '1', '2.1', '2.2', '3'
error | jobs:error | oslc:Error
parentTask| cogs:dependsOn | jobs:Task
job | dct:isPartOf | rdfs:Resource | Refer to the parent job
resultsContainer | jobs:resultsContainer | rdfs:Resource | A reference to the stored data. It can be anything and the consumer needs to determine how to handle it.
inputContainer | jobs:inputContainer | rdfs:Resource | A reference to the stored input data. It can be anything and the consumer needs to determine how to handle it.

## Error

## class
`olcsError`

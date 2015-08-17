# RecipeAPI

Recipe API a node application that runs on elastic.

###Implementation

* Download elasticsearch
* Run elasticsearch
* cd to repo
* npm install
* cd to updateData
* node load_recipes.js
* cd ..
* export RECIPEAPI_ENV="localDev"
* node api.js

###Sample query

localhost:8081/r?q=chicken

Param | Name       | Description
------|------------|-------------
q     | name       | queries name field in elastic
i     | ingredients| does a terms search on ingredients
a     | allegies   | does a must_not terms search on ingredients

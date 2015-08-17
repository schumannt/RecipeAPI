#!/bin/sh
# This accepts a command line parameter for environment.
# Options are localDev and azure

if [ $(grep -c  "\"$1\"" config.json) -ne 0 ]
then
        export RECIPEAPI_ENV=$1
else
    if [ -z "$1" ]; then
        export RECIPEAPI_ENV="localDev"
    else
        echo "no file $1 found. RecipeAPI not started"
        exit 1
    fi
fi

if [ -z "$LOG_HOME" ]; then
    export LOG_HOME=~/var/log/
fi

LOG_BASE_DIR=./RecipeAPI

mkdir -p $LOG_BASE_DIR

# forever logging has been disabled by sending to /dev/null. if service isn't responding then reinstate forever logging and restart service
node -e  "require('forever').startDaemon('api.js',{max: 1, logFile: '/dev/null'});" > /dev/null 2>&1

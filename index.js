#!/usr/bin/env node

/*
Copyright 2020 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

'use strict';

const program = require('commander'); // Source: https://github.com/tj/commander.js/
const timediff = require('timediff'); // Source: https://github.com/marcotaubmann/timediff
const spawn = require('child_process').spawnSync;

/*****************************************************
 * Set up command line options based on commander.js *
 ****************************************************/
program.option('-l, --limit [time]', 'Maximum duration of jobs (minutes)').option('-r, --region [region]', 'GCP Region (e.g. us-central1)');
program.parse(process.argv);

/****************************************************************
 * Perform basic error checking on command line argument input. *
 ***************************************************************/
if (!program.limit || !program.region) {
    console.log(`ERROR: Limit (--limit) and region (--region) are required.\n`);
    program.outputHelp();
    process.exit(1);
}
if (isNaN(program.limit)) {
    console.log(`ERROR: Time limit must be an integer. \nTime limit entered: ${program.limit}`);
    process.exit(1);
}
let DATAFLOW_GCP_REGIONS = ['us-central1', 'us-east1', 'us-west1', 'europe-west1', 'europe-west4', 'asia-east1', 'asia-northeast1'];
if (!DATAFLOW_GCP_REGIONS.includes(program.region)) {
    console.log(`ERROR: Invalid Dataflow region. \nSupported regions: ${DATAFLOW_GCP_REGIONS} \nRegion entered: ${program.region}`);
    process.exit(1);
}

/*************************************************************************
 * Get a list of jobs that exceed duration with parseJobs(),             *
 * then pass the returned value to stopJobs() to actually stop the jobs. *
 ************************************************************************/
stopJobs(parseJobs(program.limit, program.region), program.region);

/**
 * Get a list of all active jobs running within the configured region, and return a list of any jobs that exceed the configured maximum duration.
 * @param {Integer} maximumDuration - Maximum duration before a job is reported back.
 * @param {String} region - Region where the dataflow jobs reside.
 * @returns {Array} - List of jobs that violated the maximum duration.
 */
function parseJobs(maximumDuration, region) {
    // Use the `gcloud` command to get list of active jobs within the configured region -- return in a JSON object format for easy parsing.
    let command = ['dataflow', 'jobs', 'list', '--status=active', '--region=' + region, '--format=json'];
    const checkJobs = spawn('gcloud', command);

    if (checkJobs.status === 0) {
        // If return code is 0 (Success), then proceed.
        const jobs = JSON.parse(checkJobs.stdout);
        let badJobs = [];

        console.log(`Checking for jobs that exceed configured maximum duration (${maximumDuration}) within ${region}...\n`);
        for (let i = 0; i < jobs.length; i++) {
            // (job).creationTime will be in the format: 2020-01-29 20:48:36
            let jobDate = jobs[i].creationTime.split(' ')[0];
            let jobTime = jobs[i].creationTime.split(' ')[1];

            let creation = new Date(Date.UTC(jobDate.split('-')[0], jobDate.split('-')[1] - 1, jobDate.split('-')[2], jobTime.split(':')[0], jobTime.split(':')[1], jobTime.split(':')[2]));

            let duration = timediff(creation, new Date(), 'm').minutes;
            if (duration > maximumDuration) {
                console.log(`Found job violating maximum duration:\n` + `\t ID: ${jobs[i].id}\n` + `\t Creation Time: ${jobs[i].creationTime}\n` + `\t Duration: ${duration}\n`);
                badJobs.push(jobs[i].id); // Toss the bad job onto an array that will eventually be returned and passed onto stopJobs().
            }
        }

        // End if no bad jobs.
        if (badJobs.length === 0) {
            console.log(`No jobs exceeding maximum duration found.`);
            process.exit(0);
        } else {
            return badJobs;
        }
    } else {
        // If return code was anything other than 0, something went wrong running the `gcloud` command.
        console.log(`Error: ${checkJobs.output}`);
        console.log(`Unable to obtain list of dataflow jobs.`);
        process.exit(1);
    }
}

/**
 * Perform a cancel operation on any Dataflow jobs passed.
 * @param {Array} badJobs - Array of jobs to cancel.
 * @param {String} region - Region where the Dataflow jobs reside.
 * @returns {Object} - Returns an object with two arrays (success, failed) that house the list of jobs in their respective status.
 */
function stopJobs(badJobs, region) {
    let jobResults = {
        // Simple object to hold successful and failed stop attempts.
        success: [],
        failed: []
    };
    for (let job in badJobs) {
        // Go through all jobs within the badJobs array -- which was passed in from parseJobs() -- and attempt to cancel them.
        console.log(`\nAttempting to stop job: ${badJobs[job]}`);
        let command = ['dataflow', 'jobs', 'cancel', badJobs[job], '--region=' + region];
        const cancelJob = spawn('gcloud', command);

        // Make sure the command returns successfully, but also that it returns that it cancelled the job.
        if (cancelJob.status === 0 && cancelJob.output.toString('utf8').includes('Cancelled job')) {
            console.log(`Stopped job (${badJobs[job]}) successfully!`);
            jobResults.success.push(badJobs[job]);
        } else {
            console.log(`Failed to stop job: ${badJobs[job]}`);
            jobResults.failed.push(badJobs[job]);
        }
    }
    return jobResults;
}

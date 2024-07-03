'use strict';
/*
* File: src\Batch\TriggerBatchJob.js
* Project: Omni-project44-api-services
* Author: Bizcloud Experts
* Date: 2022-10-01
* Confidential and Proprietary
*/
const AWS = require('aws-sdk');
const batch = new AWS.Batch({ apiVersion: '2016-08-10' });

exports.BatchJobHandler = async (event, context, callback) => {
    try {
        console.info('Event from BatchJobHandler', event);

        // let data = JSON.parse(event.body);

        const params = {
            jobDefinition: process.env.P44_BATCH_JOB_DEFINITION,
            jobName: process.env.P44_BATCH_JOB_NAME,
            jobQueue: process.env.JOB_QUEUE,
            containerOverrides: {
                environment: [
                    {
                        "name": 'PROJECT44_PAYLOAD_TABLE',
                        "value": process.env.PROJECT44_PAYLOAD_TABLE
                    },
                    {
                        "name" : 'PROJECT44_ENDPOINT',
                        "value" : process.env.PROJECT44_ENDPOINT
                    },
                    {
                        "name" : 'PROJECT44_USERNAME',
                        "value" : process.env.PROJECT44_USERNAME
                    },
                    {
                        "name" : 'PROJECT44_PASSWORD',
                        "value" : process.env.PROJECT44_PASSWORD
                    },
                    {
                        "name" : 'DB_DATABASE',
                        "value" : process.env.DB_DATABASE
                    },
                    {
                        "name" : 'DB_HOST',
                        "value" : process.env.DB_HOST
                    },
                    {
                        "name" : 'DB_PORT',
                        "value" : process.env.DB_PORT
                    },
                    {
                        "name" : 'DB_USER',
                        "value" : process.env.DB_USER
                    },
                    {
                        "name" : 'DB_PASSWORD',
                        "value" : process.env.DB_PASSWORD
                    },
                    {
                        "name": 'region',
                        "value": process.env.region
                    }
                ]
            }
        };

        let jobQuesName = process.env.JOB_QUEUE
        let jobStatusName = ["RUNNING","SUBMITTED","PENDING","RUNNABLE","STARTING"]
        let jobDetails = [];
        for (let x in jobStatusName) {
            let result = await checkJobStatus(jobStatusName[x], jobQuesName);
            if(result.length){
                jobDetails.push(result.jobSummaryList);
            }
        }
        console.info("jobStatus length : ", jobDetails.length);
        if(!jobDetails.length){
            const batchData = await submitBatchJob(params);
            console.info("batchData", batchData);

        const response = {
            statusCode: 200,
            body: JSON.stringify({ message: `Batch process submitted successfully!` }),
        };

        return callback(null, response);
        }else {
        const response = {
            statusCode: 400,
            body: JSON.stringify({ message: `Job is already in processing` }),
        };

        return callback(null, response);
        }

    } catch (error) {
        console.error("Error while processing data", error);

        const response = {
            statusCode: 400,
            body: JSON.stringify({ message: `Error while submitting batch process.` }),
        };

        return callback(null, response);
    }
};

async function submitBatchJob(params) {
    return new Promise(async (resolve, reject) => {
        batch.submitJob(params, function (err, data) {
            if (err) {
                console.error(err, err.stack);
                return reject(err);
            } else {
                console.info(data);
                return resolve(data);
            }
        });
    })
}

async function checkJobStatus(jobStatus, jobQueueName){
    var params = {
      jobQueue: jobQueueName,
      jobStatus: jobStatus
     };
    return new Promise(async (resolve, reject) => {
      batch.listJobs(params, function (err, data) {
          if (err) {
              console.error(err, err.stack);
              return reject(err);
          } else {
              console.info(data);
              return resolve(data.jobSummaryList);
          }
      });
  })
  }
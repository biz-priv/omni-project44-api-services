'use strict';
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
                        "name": 'TARGET_TABLE',
                        "value": process.env.PROJECT44_PAYLOAD_TABLE
                    },
                    {
                        "name": 'REGION',
                        "value": process.env.region
                    }
                ]
            }
        };

        const batchData = await submitBatchJob(params);

        console.info("batchData", batchData);

        const response = {
            statusCode: 200,
            body: JSON.stringify({ message: `Batch process submitted successfully!` }),
        };

        return callback(null, response);

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
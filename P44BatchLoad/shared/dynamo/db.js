const AWS = require('aws-sdk');
const get = require('lodash.get');
const PROJECT44_TABLE = process.env.PROJECT44_TABLE;
const PROJECT44_PAYLOAD_TABLE = process.env.PROJECT44_PAYLOAD_TABLE;
const { handleError } = require('../utils/responses');

/* update record */
async function updateItems(tableName, hashKey, updateExpression, attributesValues) {
    let documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
    const params = {
        TableName: tableName,
        Key: hashKey,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: attributesValues
    };
    try {
        return await documentClient.update(params).promise();
    } catch (e) {
        console.error("updateItems Error: ", e);
        throw handleError(1008, e, get(e, 'details[0].message', null));
    }
}

/* get all record count */
async function getScanCount(tableName, filterExpression, expressionAttributeValues) {
    const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
    const params = {
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        Select: 'COUNT'
    };
    try {
        return await documentClient.scan(params).promise();
    } catch (e) {
        console.error("getScanCount Error: ", e);
        return await handleError(1004, e, get(e, 'details[0].message', null));
    }
}

async function dbRead(params) {
    try {
        const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
        let result = await documentClient.scan(params).promise();
        let data = result.Items;
        if (result.LastEvaluatedKey) {
            params.ExclusiveStartKey = result.LastEvaluatedKey;
            data = data.concat(await dbRead(params));
        }
        return data;
    } catch (e) {
        console.error("dbread Error: ", e);
        return await handleError(1004, e, get(e, 'details[0].message', null)); }
}

//using this 
/* get all record scan */
async function getAllScanRecord(tableName) {
    const params = {
        TableName: tableName
    };
    try {
        return await dbRead(params);
    } catch (e) {
        console.error("getScanCount Error: ", e);
        return await handleError(1004, e, get(e, 'details[0].message', null));
    }
}

/* batch insert record */
async function batchInsertRecord(records) {
    const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
    const params = {
        RequestItems: {
            [PROJECT44_PAYLOAD_TABLE] : records
        }
    };
    try {
        return await documentClient.batchWrite(params).promise();
    } catch (e) {
        console.error("insert Error: ", e);
        return handleError(1007, e, get(e, 'details[0].message', null));
    }
}

/* insert single record */
async function insertSingleRecord(tableName, records) {
    const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
    const params = {
        TableName : tableName,
        Item: records
    };
    try {
        return await documentClient.put(params).promise();
    } catch (e) {
        console.error("insert Error: ", e);
        return await handleError(1007, e, get(e, 'details[0].message', null));
    }
}

module.exports = {
    updateItems,
    getScanCount,
    getAllScanRecord,
    batchInsertRecord,
    insertSingleRecord
};
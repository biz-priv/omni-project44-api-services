'use strict';

const mod = require('./../src/KeyManagement/UpdateKey/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const createApiKeyResponse = require('../src/TestEvents/UpdateKey/MockResponses/apigateway-createapikey.json');
const createUsagePlanResponse = require('../src/TestEvents/UpdateKey/MockResponses/apigateway-createusageplankey.json');
const queryResponse = require('../src/TestEvents/UpdateKey/MockResponses/query-response.json');
const apiKeysResponse = require('../src/TestEvents/UpdateKey/MockResponses/apigateway-getapikeys.json');

describe('update module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('get apikey from token validator table then disassociate from usageplan then update CustomerStatus Inactive in token validator then create new apikey associate to usage plan and insert record in token validator table', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{\"ApiKey\":\"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1\"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('record not found in token validator table', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, { Items: [], Count: 0, ScannedCount: 0 });
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1009,\"message\":\"Item not found.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('apikey not found in apigateway', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, { items: [] });
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{\"ApiKey\":\"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1\"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('error getting record from db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1003,"message":"Error getting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error inserting record in db', async () => {
       
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback({"error": "error found"}, null);
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1007,"message":"Error inserting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error from getapikey', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback({"error": "apigateway error"}, null);
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback({"error": "apigateway error"}, null);
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{\"ApiKey\":\"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1\"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('error from createapi key', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback({"error": "error creating apikey"}, null);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1006,"message":"Error creating apikey."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error createUsagePlanKey ', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteApiKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, {});
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'update', function (params, callback) {
            callback(null, 'record updated successfully');
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback({"error": "createusageplankey error"}, null)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/UpdateKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1006,\"message\":\"Error creating apikey.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('validation missing field error', async () => {

        const event = require('../src/TestEvents/UpdateKey/Events/event-body-null.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body\\\" must be of type object\"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/UpdateKey/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.CustomerId\\" must be a string"}'
        expect(actual.body).toStrictEqual(error);
    });

});
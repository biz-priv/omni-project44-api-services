'use strict';

const mod = require('./../src/KeyManagement/PostKey/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const createApiKeyResponse = require('../src/TestEvents/PostKey/MockResponses/apigateway-createapikey.json');
const createUsagePlanResponse = require('../src/TestEvents/PostKey/MockResponses/apigateway-createusageplankey.json');
const queryResponse = require('../src/TestEvents/PostKey/MockResponses/query-response.json');
const usagePlanResponse = require('../src/TestEvents/PostKey/MockResponses/usageplan-response.json');
const apiKeysResponse = require('../src/TestEvents/PostKey/MockResponses/apigateway-getapikeys.json');

describe('post module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('apikey already exist', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback(null, usagePlanResponse)
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1013,\"message\":\"ApiKey already exist.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('apikey not found in apigateway', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, {items: []});
        });

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback(null, usagePlanResponse)
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{\"ApiKey\":\"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1\"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('apikey not associate to usageplan', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback({"error": "apikey not associate"}, null)
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{\"ApiKey\":\"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1\"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('error getting record from db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1003,"message":"Error getting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error inserting record in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, {items: []});
        });

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback(null, usagePlanResponse)
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1007,"message":"Error inserting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error from getapikey', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryResponse);
        })

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback(null, usagePlanResponse)
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback({"error": "apigateway error"}, null);
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1010,\"message\":\"Error getting apikey.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error from createapi key', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback(null, usagePlanResponse)
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback({ "error": "apigateway error" }, null);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback({ "error": "usageplan error" }, null)
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1006,"message":"Error creating apikey."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error from getusageplan apikey', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        AWSMock.mock('APIGateway', 'getUsagePlanKey', function (params, callback) {
            callback({"error": "getusageplan error"}, null)
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiKeyResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        const event = require('../src/TestEvents/PostKey/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const response = '{"ApiKey":"JGGqZ2LFE840rZYwWzlkRa3jFPT76PU32vs9p0K1"}'
        expect(actual.body).toStrictEqual(response);
    })

    it('validation missing field error', async () => {

        const event = require('../src/TestEvents/PostKey/Events/event-body-null.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body\\\" must be of type object\"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/PostKey/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.CustomerId\\" must be a string"}'
        expect(actual.body).toStrictEqual(error);
    });

});
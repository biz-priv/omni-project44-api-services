'use strict';

const mod = require('./../src/CustomerOnboarding/DeleteCustomer/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const getItemResponse = require('../src/TestEvents/DeleteCustomer/MockResponses/getItem.json');
const apiKeysResponse = require('../src/TestEvents/DeleteCustomer/MockResponses/api-gw-apikeys.json');

describe('delete module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('Delete customer record in db if exist', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback(null, 'successfully update items in database');
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, 'disassociate apikey from usagePlan');
        });

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('error if record not exist in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, { Items: [], Count: 0, ScannedCount: 0 });
        })

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1009,\"message\":\"Item not found.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error get record from db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback({"error": "error getting record"}, null);
        })

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1003,\"message\":\"Error getting items.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error update record in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback({"error": "error found"}, null);
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback(null, 'disassociate apikey from usagePlan');
        });

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1008,"message":"Error updating items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('Apigateway usage plan error', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback(null, 'successfully update items in database');
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, apiKeysResponse);
        });

        AWSMock.mock('APIGateway', 'deleteUsagePlanKey', function (APIparams, callback) {
            callback({"error": "apigateway error"}, null);
        });

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('Apigateway getApiKeys error', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback(null, 'successfully update items in database');
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback({"error": "apigateway error"}, null);
        });

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('Apigateway getApiKeys not found', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback(null, 'successfully update items in database');
        })

        AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
            callback(null, { items: [] });
        });

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('validation body null error', async () => {

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-body-null.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body\\\" must be of type object\"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/DeleteCustomer/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body.CustomerId\\\" must be a string\"}'
        expect(actual.body).toStrictEqual(error);
    });

});
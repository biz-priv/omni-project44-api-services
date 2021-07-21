'use strict';

const mod = require('./../src/CustomerOnboarding/PostCustomer/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const createApiGatewayResponse = require('../src/TestEvents/PostCustomer/MockResponses/apigateway-createapikey.json');
const createUsagePlanResponse = require('../src/TestEvents/PostCustomer/MockResponses/apigateway-createusageplankey.json');

describe('post module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('Insert customer record in db, create apikey and add to usage plan', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiGatewayResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })
        const event = require('../src/TestEvents/PostCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('error from db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback(null, createApiGatewayResponse);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback(null, createUsagePlanResponse)
        })

        const event = require('../src/TestEvents/PostCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1007,"message":"Error inserting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error from createapi key', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'successfully put item in database');
        })

        AWSMock.mock('APIGateway', 'createApiKey', function (APIparams, callback) {
            callback({ "error": "apigateway error" }, null);
        });

        AWSMock.mock('APIGateway', 'createUsagePlanKey', function (params, callback) {
            callback({ "error": "usageplan error" }, null)
        })

        const event = require('../src/TestEvents/PostCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1006,"message":"Error creating apikey."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('validation missing field error', async () => {

        const event = require('../src/TestEvents/PostCustomer/Events/event-missing-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.BillToAccNumber\\" is required"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/PostCustomer/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.BillToAccNumber\\" must be a string"}'
        expect(actual.body).toStrictEqual(error);
    });

});
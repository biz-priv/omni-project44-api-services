'use strict';

const mod = require('./../src/CustomerOnboarding/CustomersSummary/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const queryActiveCustomersResponse = require('../src/TestEvents/CustomersSummary/MockResponses/query-active-response.json');
const queryInactiveCustomersResponse = require('../src/TestEvents/CustomersSummary/MockResponses/query-inactive-response.json');

describe('Get count module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('get total count, active count and inactive count', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryActiveCustomersResponse);
        });

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback(null, queryInactiveCustomersResponse);
        });

        const event = require('../src/TestEvents/CustomersSummary/Events/event.json');
        const result = await wrapped.run(event);
        const response = '{"Customers":{"Total":8,"Active":4,"Inactive":4}}'
        expect(result.body).toStrictEqual(response);

    });

    it('error from getting active or inactive count', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
            callback({"error": "error from db"}, null);
        });

        const event = require('../src/TestEvents/CustomersSummary/Events/event.json');
        const result = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1003,"message":"Error getting items."}' 
        expect(result.body).toStrictEqual(error);

    });

});
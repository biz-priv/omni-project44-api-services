'use strict';

const mod = require('./../src/CustomerOnboarding/UpdateCustomer/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const getItemResponse = require('../src/TestEvents/UpdateCustomer/MockResponses/getItem.json');

describe('update module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('Update customer record in db if exist', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback(null, 'successfully update items in database');
        })

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(202);
    })

    it('error if record not exist in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
            callback(null, {});
        })

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        console.log(actual)
        const error = '{\"httpStatus\":400,\"code\":1009,\"message\":\"Item not found.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error get record from db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
            callback({"error": "error getting record"}, null);
        })

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        console.log(actual)
        const error = '{\"httpStatus\":400,\"code\":1003,\"message\":\"Error getting items.\"}'
        expect(actual.body).toStrictEqual(error);
    })

    it('error update record in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
            callback(null, getItemResponse);
        })

        AWSMock.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1008,"message":"Error updating items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('validation missing update field error', async () => {

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-missing-update-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body\\" must contain at least one of [DeclaredType, Station]"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation missing required field error', async () => {

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-missing-customerid.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body.CustomerId\\\" is required\"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/UpdateCustomer/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.DeclaredType\\" must be a string"}'
        expect(actual.body).toStrictEqual(error);
    });

});
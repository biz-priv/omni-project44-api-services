'use strict';

const mod = require('./../src/UserActivity/PostUserActivity/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

describe('post user activity module test', () => {

    afterEach(() => {
        AWSMock.restore();
    });

    it('record insert in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback(null, 'record inserted successfully');
        })

        const event = require('../src/TestEvents/PostUserActivity/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        expect(actual.statusCode).toStrictEqual(200)
    })

    it('error inserting record in db', async () => {

        AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            callback({ "error": "error found" }, null);
        })

        const event = require('../src/TestEvents/PostUserActivity/Events/event-valid-body.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1007,"message":"Error inserting items."}'
        expect(actual.body).toStrictEqual(error);
    })

    it('validation missing field error', async () => {

        const event = require('../src/TestEvents/PostUserActivity/Events/event-body-null.json');
        let actual = await wrapped.run(event);
        const error = '{\"httpStatus\":400,\"code\":1001,\"message\":\"\\\"body\\\" must be of type object\"}'
        expect(actual.body).toStrictEqual(error);
    });

    it('validation invalid request parameter type', async () => {

        const event = require('../src/TestEvents/PostUserActivity/Events/event-invalid-body-parameter.json');
        let actual = await wrapped.run(event);
        const error = '{"httpStatus":400,"code":1001,"message":"\\"body.Activity\\" must be a string"}'
        expect(actual.body).toStrictEqual(error);
    });

});
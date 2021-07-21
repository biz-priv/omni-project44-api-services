'use strict';

const mod = require('./../src/UserActivity/GetUserActivityList/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const queryResponse = require('../src/TestEvents/GetUserActivityList/MockResponses/dynamo-query-with-lastevaluatedkey.json');
const queryResponseNoLastKey = require('../src/TestEvents/GetUserActivityList/MockResponses/dynamo-query-no-last-key.json');

describe('module test', () => {

  afterEach(() => {
    AWSMock.restore();
  });

  it('get all record with default page, limit, startkey and endkey', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponseNoLastKey);
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Count: 4, ScannedCount: 10 });
    });

    const event = require('../src/TestEvents/GetUserActivityList/Events/event-qs-null.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetUserActivityList/ExpectedResponses/result-no-lastevaluatedkey.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);

  });

  it('get all record with page, limit, startkey and endkey', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponse);
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Count: 2, ScannedCount: 10 });
    });

    const event = require('../src/TestEvents/GetUserActivityList/Events/event-with-evaluatedkey.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetUserActivityList/ExpectedResponses/result-lastevaluatedkey.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);

  });

  it('get all record with lastevaluatedkey in result', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponse);
    })

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Count: 4, ScannedCount: 10 });
    })

    const event = require('../src/TestEvents/GetUserActivityList/Events/event.json');
    const result = await wrapped.run(event);  
    const expectedResponse = require('../src/TestEvents/GetUserActivityList/ExpectedResponses/result-with-lastevaluatedkey.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);
  });


  it('no records found', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, { Items: [] });
    })

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Count: 0, ScannedCount: 0 });
    })

    const event = require('../src/TestEvents/GetUserActivityList/Events/event-qs-null.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetUserActivityList/ExpectedResponses/no-records.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);
  });

  it('bad request error from db operation', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback({ "error": "error found" }, null);
    })

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback({ "error": "error found count"}, null)
    })

    const event = require('../src/TestEvents/GetUserActivityList/Events/event.json');
    let actual = await wrapped.run(event);
    const error = '{\"httpStatus\":400,\"code\":1003,\"message\":\"Error getting items.\"}';
    expect(actual.body).toEqual(error);

  });

  it('validation error check', async () => {

    const event = require('../src/TestEvents/GetUserActivityList/Events/event-invalid-parameter.json');
    let actual = await wrapped.run(event);
    const error = '{"httpStatus":400,"code":1001,"message":"\\"queryStringParameters.start\\" is not allowed"}';
    expect(actual.body).toEqual(error);
  });

});
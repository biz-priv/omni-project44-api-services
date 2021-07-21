'use strict';

const mod = require('./../src/CustomerOnboarding/GetCustomersList/index');

const jestPlugin = require('serverless-jest-plugin');
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: 'handler' });

const AWSMock = require('aws-sdk-mock');

const scanResponse = require('../src/TestEvents/GetCustomersList/MockResponses/dynamo-scan.json');
const scanResponseNoLastKey = require('../src/TestEvents/GetCustomersList/MockResponses/dynamo-scan-no-last-key.json');
const queryResponse = require('../src/TestEvents/GetCustomersList/MockResponses/query-response.json');
const queryResponseNoLastKey = require('../src/TestEvents/GetCustomersList/MockResponses/query-response-no-lastkey.json');
const apiKeysResponse = require('../src/TestEvents/GetCustomersList/MockResponses/api-gw-apikeys.json');

describe('module test', () => {

  afterEach(() => {
    AWSMock.restore();
  });

  it('get all customers record with default page, limit and startkey', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, scanResponseNoLastKey);
    });

    AWSMock.mock('DynamoDB', 'describeTable', (params, callback) => {
      callback(null, { Table: { ItemCount: '4' } });
    });

    const event = require('../src/TestEvents/GetCustomersList/Events/event.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/result.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);

  });

  it('get all customers record with page, size and startkey', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, scanResponse);
    })

    AWSMock.mock('DynamoDB', 'describeTable', (params, callback) => {
      callback(null, { Table: { ItemCount: '4' } });
    })

    const event = require('../src/TestEvents/GetCustomersList/Events/event-with-startkey.json');
    const result = await wrapped.run(event);  
    const expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/result-startkey.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);
  });

  it('get active customers record with api keys (match key in apigateway) with startkey', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponse);
    })

    AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
      callback(null, apiKeysResponse);
    });

    const event = require('../src/TestEvents/GetCustomersList/Events/event-true-startkey.json');
    const result = await wrapped.run(event);
    let expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/result-true-startkey.json');
    let age = JSON.parse(result.body).Customers[0].Age;
    expectedResponse.Customers[0].Age = age;
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);

  });

  it('get active customers record (no api key in api gateway)', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponseNoLastKey);
    })

    AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
      callback(null, { items: [] });
    });

    const event = require('../src/TestEvents/GetCustomersList/Events/event-true-no-startkey.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/result-true-no-startkey.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse)

  });

  it('error from api gateway', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      callback(null, queryResponse);
    })

    AWSMock.mock('APIGateway', 'getApiKeys', function (APIparams, callback) {
      callback({ error: "apigateway error" }, null);
    });

    const event = require('../src/TestEvents/GetCustomersList/Events/event-true-startkey.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/api-gw-error.json');
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse)

  });

  it('no records found', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Items: [] });
    })

    AWSMock.mock('DynamoDB', 'describeTable', (params, callback) => {
      callback(null, { Table: { ItemCount: '0' } });
    })

    const event = require('../src/TestEvents/GetCustomersList/Events/event-false.json');
    const result = await wrapped.run(event);
    const expectedResponse = require('../src/TestEvents/GetCustomersList/ExpectedResponses/no-records.json');
    console.log("RESULT: ", JSON.stringify(result));
    expect(JSON.parse(result.body)).toStrictEqual(expectedResponse);
  });

  it('bad request error from scan operation', async () => {

    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback({ "error": "error found" }, null);
    })

    AWSMock.mock('DynamoDB', 'describeTable', (params, callback) => {
      callback({ "error": "error found count"}, null)
    })

    const event = require('../src/TestEvents/GetCustomersList/Events/event-false-only.json');
    let thrownError;
    try {
      await wrapped.run(event);
    } catch (e) {
      thrownError = e;
    }
    const error = {"code": 1004, "httpStatus": 400, "message": "Error fetching items."};
    expect(thrownError).toEqual(error);

  });

  it('validation error check', async () => {

    const event = require('../src/TestEvents/GetCustomersList/Events/event-invalid-status.json');
    let actual = await wrapped.run(event);
    console.log(actual);
    const error = '{"httpStatus":400,"code":1001,"message":"\\"queryStringParameters.status\\" must be a boolean"}';
    expect(actual.body).toEqual(error);
  });

});
'use strict';

let _ = require("lodash");
const zlib = require('zlib');
const AWS = require("aws-sdk");
const readline = require('readline');

AWS.config.update({ region: process.env.REGION });

const documentClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const S3 = new AWS.S3();

const S3_BUCKET = process.env.S3_BUCKET;
const S3_BUCKET_PREFIX = process.env.S3_BUCKET_PREFIX;
const TABLE_NAME = process.env.TARGET_TABLE;

console.info("Batch worked");
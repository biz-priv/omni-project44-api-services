'use strict';

// let _ = require("lodash");
// const zlib = require('zlib');
const AWS = require("aws-sdk");
// const readline = require('readline');

// AWS.config.update({ region: process.env.REGION });

// const documentClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

// const S3 = new AWS.S3();

// const S3_BUCKET = process.env.S3_BUCKET;
// const S3_BUCKET_PREFIX = process.env.S3_BUCKET_PREFIX;
// const TABLE_NAME = process.env.TARGET_TABLE;

// console.info("Batch worked");

const { Client } = require("pg");
// const Dynamo = require("../../shared/dynamo/db");
// const PROJECT44_TABLE = process.env.PROJECT44_TABLE;
// const PROJECT44_PAYLOAD_TABLE = process.env.PROJECT44_PAYLOAD_TABLE;
const moment = require("moment");
// const validate = require("./validate");
const rp = require("request-promise");
// const authCanExecuteResource = require("serverless-offline/src/authCanExecuteResource");
// const orderStatusCode = require("./orderStatusCode.json");

function compare(otherArray) {
  return function (current) {
    return (
      otherArray.filter(function (other) {
        return (
          other.file_nbr == current.file_nbr &&
          other.order_status == current.order_status
        );
      }).length == 0
    );
  };
}

async function recordInsert(keyData, jsonRecordObject) {
  try {
    const params = {
      file_nbr: keyData.file_nbr,
      order_status: Object.keys(orderStatusCode).find(
        (key) => orderStatusCode[key] === keyData.order_status
      ),
      json_msg: JSON.stringify(jsonRecordObject),
    };
    return await Dynamo.insertSingleRecord(PROJECT44_PAYLOAD_TABLE, params);
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
}

function compareMatchRecord(otherArray) {
  return function (current) {
    return (
      otherArray.filter(function (other) {
        return (
          other.file_nbr == current.file_nbr &&
          other.order_status == current.order_status
        );
      }).length != 0
    );
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function checkAccount(param) {
  const data = {
    11912: "OVERSTOCK",
    22209: "MCKESSON",
    21719: "MCKESSON",
  };
  return data[param];
}

function sendNotification(element) {
  return new Promise(async (resolve, reject) => {
    let bodyData;
    const accountIdentifier = checkAccount(element.bill_to_nbr);
    if (element.region_code_basis == "S") {
      bodyData = {
        customerAccount: {
          accountIdentifier,
        },
        carrierIdentifier: {
          type: "SCAC",
          value: "OMNG",
        },
        shipmentIdentifiers: [
          {
            type: "PURCHASE_ORDER",
            value: element.ref_nbr,
            primaryForType: true,
            source: "CUSTOMER",
          },
          {
            type: "PRO",
            value: element.house_bill_nbr,
            primaryForType: true,
            source: "CAPACITY_PROVIDER",
          },
        ],
        statusCode: element.order_status,
        terminalCode: element.origin_port_iata,
        stopType: "ORIGIN",
        stopNumber: 0,
        location: {
          address: {
            postalCode: element.shipper_zip,
            addressLines: [element.shipper_addr_1],
            city: element.shipper_city,
            state: element.shipper_st,
            country: element.shipper_cntry,
          },
          contact: {
            companyName: null,
            contactName: null,
            phoneNumber: null,
            phoneNumberCountryCode: null,
            phoneNumber2: null,
            phoneNumber2CountryCode: null,
            email: null,
            faxNumber: null,
            faxNumberCountryCode: null,
          },
        },
        timestamp: element.time_stamp,
        sourceType: "API",
      };
    } else if (element.region_code_basis == "C") {
      bodyData = {
        customerAccount: {
          accountIdentifier,
        },
        carrierIdentifier: {
          type: "SCAC",
          value: "OMNG",
        },
        shipmentIdentifiers: [
          {
            type: "PURCHASE_ORDER",
            value: element.ref_nbr,
            primaryForType: true,
            source: "CUSTOMER",
          },
          {
            type: "PRO",
            value: element.house_bill_nbr,
            primaryForType: true,
            source: "CAPACITY_PROVIDER",
          },
        ],
        statusCode: element.order_status,
        terminalCode: element.destination_port_iata,
        stopType: "DESTINATION",
        stopNumber: 1,
        location: {
          address: {
            postalCode: element.consignee_zip,
            addressLines: [element.consignee_addr_1],
            city: element.consignee_city,
            state: element.consignee_st,
            country: element.consignee_cntry,
          },
          contact: {
            companyName: null,
            contactName: element.consignee_name,
            phoneNumber: null,
            phoneNumberCountryCode: null,
            phoneNumber2: null,
            phoneNumber2CountryCode: null,
            email: null,
            faxNumber: null,
            faxNumberCountryCode: null,
          },
        },
        timestamp: element.time_stamp,
        sourceType: "API",
      };
    }
    await recordInsert(element, bodyData);
    var options = {
      method: "POST",
      uri: process.env.PROJECT44_ENDPOINT,
      body: bodyData,
      auth: {
        user: process.env.PROJECT44_USERNAME,
        pass: process.env.PROJECT44_PASSWORD,
      },
      json: true,
      resolveWithFullResponse: true,
    };
    rp(options)
      .then(async (returnData) => {
        console.info(
          "Info : Notification sent successfully",
          returnData.statusCode
        );
        element["project44Response"] = JSON.stringify({
          httpStatusCode: returnData.statusCode,
          message: "success",
        });
        resolve({ status: returnData.statusCode, Data: element });
      })
      .catch(async (err) => {
        console.error("Error ==> 173 : ", err);
        element["project44Response"] = JSON.stringify(err.error);
        resolve({ status: "failure", Data: element });
      });
  });
}

execHandler();
async function execHandler() {
//   console.info("EVENT: ", JSON.stringify(event));
  const client = new Client({
    database: 'test_datamodel',
    host: '10.9.130.79',
    port: 5439,
    user: 'bceuser1',
    password: 'BizCloudExp1',
  });
  let response, dynamoData;
  try {
    await client.connect();
    response = await client.query(
      `select * from project44 where message_sent = '' LIMIT 3`
    );
    console.info("Redshift response : ", JSON.stringify(response.rows));
    await client.end();
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
  return;
  if (response.rows.length) {
    try {
      dynamoData = await Dynamo.getAllScanRecord(PROJECT44_TABLE);
    } catch (e) {
      console.error("Scan Record Error ==> 207 : ", e);
      return;
    }
    let notMatchedResult = response.rows.filter(compare(dynamoData));
    let matchedRecord = dynamoData.filter(compareMatchRecord(response.rows));
    if (notMatchedResult.length) {
      console.info(
        "Info ==> 213 : Found unique records. Total Count : ",
        notMatchedResult.length
      );
      let inputRecord = [];
      let promises = [];
      for (let x in notMatchedResult) {
        notMatchedResult[x]["time_stamp"] = moment().format(
          `YYYY-MM-DDTHH:mm:ssZZ`
        );
        await sleep(1000);
        let validResult = await validate(notMatchedResult[x]);
        if (!validResult.code) {
          validResult["order_status"] =
            orderStatusCode[validResult.order_status];
          if (validResult["order_status"] != undefined) {
            promises.push(sendNotification(validResult));
          } else {
            console.error("Error ==> 225 : ", JSON.stringify(validResult));
          }
        } else {
          console.error("Error ==> 228 : ", JSON.stringify(validResult));
        }
      }
      await Promise.all(promises).then((result) => {
        result.map(async (element) => {
          element.Data["order_status"] = Object.keys(orderStatusCode).find(
            (key) => orderStatusCode[key] === element.Data.order_status
          );
          let insertRecord;
          if (element.status == 202) {
            element.Data["notification_sent"] = "Y";
            insertRecord = {
              PutRequest: {
                Item: element.Data,
              },
            };
            inputRecord.push(insertRecord);
          } else if (element.status == "failure") {
            element.Data["notification_sent"] = "N";
            insertRecord = {
              PutRequest: {
                Item: element.Data,
              },
            };
            inputRecord.push(insertRecord);
          }
        });
      });
      if (inputRecord.length) {
        try {
          let recordInsert = await arrayGroup(inputRecord);
          for (let x in recordInsert) {
            console.info(
              "Insert New Record ==> 258 : ",
              JSON.stringify(recordInsert)
            );
            await Dynamo.batchInsertRecord(PROJECT44_TABLE, recordInsert[x]);
          }
        } catch (e) {
          console.error("Batch Insert Error ==> 261 : ", e);
          return;
        }
        if (matchedRecord.length) {
          console.info(
            "Info ==> 266 : Matched Records Length : ",
            matchedRecord.length
          );
          console.info(
            "Info ==> 267 : Matched Records : ",
            JSON.stringify(matchedRecord)
          );
          await updateRecord(matchedRecord);
          return;
        }
      } else {
        console.error("Error ==> 270 : failure to insert record");
        await updateRecord(matchedRecord);
        return;
      }
    } else {
      console.info("Info ==> 275 : ", matchedRecord);
      await updateRecord(matchedRecord);
      return;
    }
  } else {
    console.error("Error ==> 280 : ", JSON.stringify(response));
    return;
  }
};

async function arrayGroup(arrayRecord) {
  const chunkSize = 25;
  const arr = arrayRecord;
  const groups = arr
    .map((e, i) => {
      return i % chunkSize === 0 ? arr.slice(i, i + chunkSize) : null;
    })
    .filter((e) => {
      return e;
    });
  return groups;
}

async function updateRecord(arrayRecord) {
  let promises = [];
  const timestamp = moment().format(`YYYY-MM-DDTHH:mm:ssZZ`);
  for (let x in arrayRecord) {
    if (arrayRecord[x]["notification_sent"] == "N") {
      arrayRecord[x]["time_stamp"] = timestamp;
      await sleep(1000);
      arrayRecord[x]["order_status"] =
        orderStatusCode[arrayRecord[x]["order_status"]];
      if (arrayRecord[x]["order_status"] != undefined) {
        promises.push(sendNotification(arrayRecord[x]));
      } else {
        console.error("Error ==> 306 : ", JSON.stringify(arrayRecord[x]));
      }
    }
  }
  await Promise.all(promises).then(async (records) => {
    for (let x in records) {
      if (records[x].status == 202) {
        records[x].Data["order_status"] = Object.keys(orderStatusCode).find(
          (key) => orderStatusCode[key] === records[x].Data.order_status
        );
        await Dynamo.updateItems(
          PROJECT44_TABLE,
          {
            file_nbr: records[x].Data.file_nbr,
            order_status: records[x].Data.order_status,
          },
          "set notification_sent = :x, time_stamp = :time",
          { ":x": "Y", ":time": timestamp }
        );
      }
    }
  });
}

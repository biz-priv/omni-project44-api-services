const { Client } = require("pg");
const Dynamo = require("./shared/dynamo/db");
const PROJECT44_PAYLOAD_TABLE = process.env.PROJECT44_PAYLOAD_TABLE;
const moment = require("moment");
const validate = require("./validate");
const rp = require("request-promise");
const orderStatusCode = require("./orderStatusCode.json");

execHandler();
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
    if (element.order_status == "UPDATED_DELIVERY_APPT") {
      let startDateTime = (((element.schd_delv_start).toISOString()).substring(0, 19)) + "-0500";
      let endDateTime = (((element.schd_delv_end).toISOString()).substring(0, 19)) + "-0500";
      bodyData["deliveryAppointmentWindow"] = {
        "startDateTime": startDateTime,
        "endDateTime": endDateTime
      }
    }
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
          "file_nbr : " + element.file_nbr,
          "order_status : " + element.order_status,
          "event_date : " + element.time_stamp,
          "Info : Notification sent successfully",
          returnData.statusCode
        );
        element["project44Response"] = JSON.stringify({
          httpStatusCode: returnData.statusCode,
          message: "success",
        });
        element["json_record_object"] = JSON.stringify(bodyData);
        resolve({ status: returnData.statusCode, Data: element });
      })
      .catch(async (err) => {
        console.error(
          "file_nbr : " + element.file_nbr,
          "order_status : " + element.order_status,
          "event_date : " + element.time_stamp,
          "\nError ==> 173 : ",
          err
        );
        element["project44Response"] = JSON.stringify({
          error: err.error,
        });
        element["json_record_object"] = JSON.stringify(bodyData);
        resolve({ status: "failure", Data: element });
      });
  });
}

async function execHandler() {
  const client = new Client({
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let response;
  try {
    await client.connect();
    response = await client.query(
      `select * from project44 where message_sent = '' order by file_nbr, event_date`
    );
    await client.end();
  } catch (error) {
    console.error("Error : ", error);
    return;
  }

  if (response.rows.length) {
    let queryResponse = response.rows;
    console.info(
      "Info ==> 213 : Found unique records. Total Count : ",
      queryResponse.length
    );
    let inputRecord = [];
    let allSuccessRecords = [];
    let allFailedRecords = [];
    let dynamodbPayload;
    let promises = [];
    for (let x in queryResponse) {
      console.log("event_date", queryResponse[x]["event_date"])
      queryResponse[x]["event_date"] = (((queryResponse[x]["event_date"]).toISOString()).substring(0, 19)) + "-0500";
      queryResponse[x]["time_stamp"] = queryResponse[x]["event_date"];
      await sleep(1000);
      let validResult = await validate(queryResponse[x]);
      if (!validResult.code) {
        validResult["order_status"] = orderStatusCode[validResult.order_status];
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

        if (element.status == 202) {
          inputRecord.push(element.Data.id);
          dynamodbPayload = {
            PutRequest: {
              Item: {
                file_nbr: element.Data.file_nbr,
                order_status: element.Data["order_status"],
                json_msg: element.Data.json_record_object,
                project_44_response: element.Data.project44Response,
                time_stamp: await currentDate()
              },
            },
          };
          allSuccessRecords.push(dynamodbPayload);
        } else if (element.status == "failure") {
          dynamodbPayload = {
            PutRequest: {
              Item: {
                file_nbr: element.Data.file_nbr,
                order_status: element.Data["order_status"],
                json_msg: element.Data.json_record_object,
                project_44_response: element.Data.project44Response,
                time_stamp: await currentDate()
              },
            },
          };
          allFailedRecords.push(dynamodbPayload);
        }
      });
    });
    if (inputRecord.length) {
      try {
        let redshiftRecords = await arrayGroup(inputRecord);
        let dynamodbRecord = await arrayGroup(allSuccessRecords);
        for (let x in dynamodbRecord) {
          let replacedData = JSON.stringify(redshiftRecords[x]);
          replacedData = replacedData.replace("[", "(");
          replacedData = replacedData.replace("]", ")");
          replacedData = replacedData.replace(/"/gi, "'");
          await redshiftBatchUpdate(replacedData);
          console.info("Records updated in redshift: ", replacedData);
          await Dynamo.batchInsertRecord(dynamodbRecord[x]);
          console.info("Success records inserted in dynamoDB: ", dynamodbRecord[x]);
        }
      } catch (e) {
        console.error(
          "DynamoDB and Redshift Batch insert-update Error ==> 262 : ",
          e
        );
        return;
      }
    } else if (allFailedRecords.length) {
      try {
        let recordInsert = await arrayGroup(allFailedRecords);
        for (let x in recordInsert) {
          console.info(
            "Insert Failed Record in dynamoDB==> 259 : ",
            JSON.stringify(recordInsert)
          );
          await Dynamo.batchInsertRecord(recordInsert[x]);
          console.info("Failed records inserted in dynamodb: ", recordInsert[x]);
        }
      } catch (e) {
        console.error("Dynamo Batch Insert Error ==> 261 : ", e);
        return;
      }
    } else {
      console.error("Error ==> 270 : failure to insert record");
    }
    return;
  } else {
    console.error("Error ==> 280 : ", JSON.stringify(response));
    return;
  }
};
async function redshiftBatchUpdate(records) {
  const client = new Client({
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let response;
  try {
    await client.connect();
    let execQuery = `update project44 set message_sent = 'Y' where id in ${records}`;
    response = await client.query(execQuery);
    console.info(
      "Redshift Record Update Response : ",
      JSON.stringify(response)
    );
    await client.end();
    return response;
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
}

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

async function currentDate() {
  const date = new Date();
  const CSToffSet = -300; //CST is -5:00 of UTC; i.e. 60*5 = -300 in minutes 
  offset = CSToffSet * 60 * 1000;
  const CSTTime = String(new Date(date.getTime() + offset));
  return CSTTime;
}
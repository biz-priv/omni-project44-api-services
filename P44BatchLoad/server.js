const { Client } = require("pg");
const Dynamo = require("./shared/dynamo/db");
// const PROJECT44_TABLE = process.env.PROJECT44_TABLE;
const PROJECT44_PAYLOAD_TABLE = process.env.PROJECT44_PAYLOAD_TABLE;
const moment = require("moment");
const validate = require("./validate");
const rp = require("request-promise");
const orderStatusCode = require("./orderStatusCode.json");

execHandler();
async function recordInsert(keyData, jsonRecordObject) {
  try {
    const params = {
      file_nbr: keyData.file_nbr,
      order_status: Object.keys(orderStatusCode).find(
        (key) => orderStatusCode[key] === keyData.order_status
      ),
      json_msg: JSON.stringify(jsonRecordObject),
      project_44_response: keyData.project44Response
    };
    return await Dynamo.insertSingleRecord(PROJECT44_PAYLOAD_TABLE, params);
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
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
          "file_nbr : " + element.file_nbr,"order_status : " + element.order_status,"event_date : " + element.time_stamp,
          "Info : Notification sent successfully",
          returnData.statusCode
        );
        element["project44Response"] = JSON.stringify({
          httpStatusCode: returnData.statusCode,
          message: "success",
        });
        await recordInsert(element, bodyData);
        resolve({ status: returnData.statusCode, Data: element });
      })
      .catch(async (err) => {
        console.error( "file_nbr : " + element.file_nbr,"order_status : " + element.order_status,"event_date : " + element.time_stamp,"\nError ==> 173 : ", err);
        element["project44Response"] = JSON.stringify(err.error);
        await recordInsert(element, bodyData);
        resolve({ status: "failure", Data: element });
      });
  });
}

async function execHandler() {
  // console.info("EVENT: ", JSON.stringify(event));
  const client = new Client({
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let response, dynamoData;
  try {
    await client.connect();
    response = await client.query(
      `select * from project44 where message_sent = '' limit 5`
    );
    console.info("Redshift response : ", JSON.stringify(response.rows));
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
      let promises = [];
      for (let x in queryResponse) {
        queryResponse[x]["event_date"] = moment(queryResponse[x]["event_date"]).format(
          `YYYY-MM-DDTHH:mm:ssZZ`
        );
        queryResponse[x]["time_stamp"] = queryResponse[x]["event_date"]
        await sleep(1000);
        let validResult = await validate(queryResponse[x]);
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
          if (element.status == 202) {
            inputRecord.push(element.Data.id);
          }
        });
      });
      if (inputRecord.length) {
        try {
          let replacedData = JSON.stringify(inputRecord);
          replacedData = replacedData.replace("[", "(")
          replacedData = replacedData.replace("]", ")");
          console.info("replacedData : ", replacedData);
          await redshiftBatchUpdate(replacedData);
          console.info("record processed successfully")
          return "record processed successfully";
        } catch (e) {
          console.error("Batch Update Error ==> 261 : ", e);
          return;
        }
      } else {
        console.error("Error ==> 270 : failure to insert record");
        return;
      }
  } else {
    console.error("Error ==> 280 : ", JSON.stringify(response));
    return;
  }
};
async function redshiftBatchUpdate(records){
  const client = new Client({
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let response
  try {
    await client.connect();
    let execQuery = `update project44 set message_sent = 'Y' where id in ${records}`
    console.info(execQuery);
    response = await client.query(execQuery);
    console.info("Redshift Record Update Response : ", JSON.stringify(response));
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

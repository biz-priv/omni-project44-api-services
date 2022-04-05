const { Client } = require("pg");
const Dynamo = require('../../shared/dynamo/db');
const PROJECT44_TABLE = process.env.PROJECT44_TABLE;
const PROJECT44_PAYLOAD_TABLE = process.env.PROJECT44_PAYLOAD_TABLE;
const moment = require('moment');
const validate = require('./validate');
const rp = require('request-promise');
const orderStatusCode = require("./orderStatusCode.json");

function compare(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other.file_nbr == current.file_nbr && other.order_status == current.order_status;
    }).length == 0;
  };
}

async function recordInsert(keyData, jsonRecordObject) {
  try {
    const params = {
      "file_nbr": keyData.file_nbr,
      "order_status": Object.keys(orderStatusCode).find(key => orderStatusCode[key] === keyData.order_status),
      "json_msg": JSON.stringify(jsonRecordObject)
    }
    return await Dynamo.insertSingleRecord(PROJECT44_PAYLOAD_TABLE, params);
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
}

function compareMatchRecord(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other.file_nbr == current.file_nbr && other.order_status == current.order_status;
    }).length != 0;
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sendNotification(element) {
  return new Promise(async (resolve, reject) => {
    let bodyData;
    if (element.region_code_basis == "S") {
      bodyData = {
        "customerAccount": {
          "accountIdentifier": "OVERSTOCK"
        },
        "carrierIdentifier": {
          "type": "SCAC",
          "value": "OMNG"
        },
        "shipmentIdentifiers": [
          {
            "type": "PURCHASE_ORDER",
            "value": element.ref_nbr,
            "primaryForType": true,
            "source": "CUSTOMER"
          },
          {
            "type": "PRO",
            "value": element.house_bill_nbr,
            "primaryForType": true,
            "source": "CAPACITY_PROVIDER"
          }
        ],
        "statusCode": element.order_status,
        "terminalCode": element.origin_port_iata,
        "stopType": "ORIGIN",
        "stopNumber": 0,
        "location": {
          "address": {
            "postalCode": element.shipper_zip,
            "addressLines": [
              element.shipper_addr_1
            ],
            "city": element.shipper_city,
            "state": element.shipper_st,
            "country": element.shipper_cntry
          },
          "contact": {
            "companyName": null,
            "contactName": null,
            "phoneNumber": null,
            "phoneNumberCountryCode": null,
            "phoneNumber2": null,
            "phoneNumber2CountryCode": null,
            "email": null,
            "faxNumber": null,
            "faxNumberCountryCode": null
          }
        },
        "timestamp": element.time_stamp,
        "sourceType": "API"
      };
    } else if (element.region_code_basis == "C") {
      bodyData = {
        "customerAccount": {
          "accountIdentifier": "OVERSTOCK"
        },
        "carrierIdentifier": {
          "type": "SCAC",
          "value": "OMNG"
        },
        "shipmentIdentifiers": [
          {
            "type": "PURCHASE_ORDER",
            "value": element.ref_nbr,
            "primaryForType": true,
            "source": "CUSTOMER"
          },
          {
            "type": "PRO",
            "value": element.house_bill_nbr,
            "primaryForType": true,
            "source": "CAPACITY_PROVIDER"
          }
        ],
        "statusCode": element.order_status,
        "terminalCode": element.destination_port_iata,
        "stopType": "DESTINATION",
        "stopNumber": 1,
        "location": {
          "address": {
            "postalCode": element.consignee_zip,
            "addressLines": [
              element.consignee_addr_1
            ],
            "city": element.consignee_city,
            "state": element.consignee_st,
            "country": element.consignee_cntry
          },
          "contact": {
            "companyName": null,
            "contactName": element.consignee_name,
            "phoneNumber": null,
            "phoneNumberCountryCode": null,
            "phoneNumber2": null,
            "phoneNumber2CountryCode": null,
            "email": null,
            "faxNumber": null,
            "faxNumberCountryCode": null
          }
        },
        "timestamp": element.time_stamp,
        "sourceType": "API"
      };
    }
    await recordInsert(element, bodyData);
    var options = {
      method: 'POST',
      uri: process.env.PROJECT44_ENDPOINT,
      body: bodyData,
      auth: {
        'user': process.env.PROJECT44_USERNAME,
        'pass': process.env.PROJECT44_PASSWORD
      },
      json: true,
      resolveWithFullResponse: true
    };
    rp(options)
      .then(async (returnData) => {
        console.info("Info : Notification sent successfully", returnData.statusCode);
        element["project44Response"] = JSON.stringify({ "httpStatusCode": returnData.statusCode, "message": "success" }) 
        resolve({ "status": returnData.statusCode, "Data": element });
      })
      .catch(async (err) => {
        console.error("Error : ", err);
        element["project44Response"] = JSON.stringify(err.error)
        resolve({ "status": "failure", "Data": element });
      });
  });

}

module.exports.handler = async (event) => {
  console.info("EVENT: ", JSON.stringify(event));
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
      "select shipment_info.file_nbr ,shipment_info.house_bill_nbr ,shipment_info.bill_to_nbr ,shipment_info.origin_port_iata ,shipment_info.destination_port_iata , shipment_info.shipper_name ,shipment_info.shipper_addr_1 ,shipment_info.shipper_addr_2 ,shipment_info.shipper_city ,shipment_info.shipper_st , shipment_info.shipper_cntry ,shipment_info.shipper_zip , shipment_info.consignee_name ,shipment_info.consignee_addr_1 ,shipment_info.consignee_addr_2 ,shipment_info.consignee_city ,shipment_info.consignee_st , shipment_info.consignee_cntry ,shipment_info.consignee_zip , shipment_milestone.order_status ,shipment_milestone.order_status_desc ,shipment_milestone.region_code_basis ,shipment_Ref.ref_nbr from shipment_info left outer join shipment_milestone on shipment_info.source_system = shipment_milestone.source_system and shipment_info.file_nbr = shipment_milestone.file_nbr and is_custompublic = 'Y' left outer join (select source_system ,file_nbr ,ref_nbr from (select distinct source_system ,file_nbr ,pk_Ref_nbr,ref_nbr, rank() over (partition by file_nbr order by ref_typeid,pk_Ref_nbr)rk from shipment_ref where ref_typeid in  ('PO','REF') and customer_type = 'B')Z where z.rk = 1) shipment_Ref on shipment_info.source_system = shipment_Ref.source_system and shipment_info.file_nbr = shipment_Ref.file_nbr WHERE shipment_info.bill_to_nbr = '11912' and shipment_milestone.event_date > convert_timezone('CDT', sysdate) - interval '30 day'"
    );
    console.info("Redshift response : ", response.rows);
    await client.end();
  } catch (error) {
    console.error("Error : ", error);
    return;
  }
  
  if ((response.rows).length) {
    try {
      dynamoData = await Dynamo.getAllScanRecord(PROJECT44_TABLE);
    } catch (e) {
      console.error("Error : ", e);
      return;
    }
    let notMatchedResult = (response.rows).filter(compare(dynamoData));
    let matchedRecord = dynamoData.filter(compareMatchRecord(response.rows));
    if (notMatchedResult.length) {
      let inputRecord = [];
      let promises = [];
      for (let x in notMatchedResult) {
        notMatchedResult[x]["time_stamp"] = moment().format(`YYYY-MM-DDTHH:mm:ssZZ`);
        await sleep(1000);
        let validResult = await validate(notMatchedResult[x]);
        if (!validResult.code) {
          validResult["order_status"] = orderStatusCode[validResult.order_status];
          if (validResult["order_status"] != undefined) {
            promises.push(sendNotification(validResult));
          } else {
            console.error("Error : ", JSON.stringify(validResult));
          }
        } else {
          console.error("Error : ", JSON.stringify(validResult));
        }
      }
      await Promise.all(promises).then((result) => {
        result.map(async (element) => {
          element.Data["order_status"] = Object.keys(orderStatusCode).find(key => orderStatusCode[key] === element.Data.order_status);
          let insertRecord;
          if (element.status == 202) {
            element.Data["notification_sent"] = "Y";
            insertRecord = {
              "PutRequest": {
                "Item": element.Data
              }
            };
            inputRecord.push(insertRecord);
          } else if (element.status == "failure") {
            element.Data["notification_sent"] = "N";
            insertRecord = {
              "PutRequest": {
                "Item": element.Data
              }
            };
            inputRecord.push(insertRecord);
          }
        });
      });
      if (inputRecord.length) {
        try {
          let recordInsert = await arrayGroup(inputRecord);
          for (let x in recordInsert) {
            await Dynamo.batchInsertRecord(PROJECT44_TABLE, recordInsert[x]);
          }
        } catch (e) {
          console.error("Error : ", e);
          return;
        }
        if (matchedRecord.length) {
          console.info("Info : ", matchedRecord);
          await updateRecord(matchedRecord);
          return;
        }
      } else {
        console.error("Error : failure to insert record");
        await updateRecord(matchedRecord);
        return;
      }
    } else {
      console.info("Info : ", matchedRecord);
      await updateRecord(matchedRecord);
      return;
    }
  } else {
    console.error("Error: ", JSON.stringify(response));
    return;
  }
};

async function arrayGroup(arrayRecord) {
  const chunkSize = 25;
  const arr = arrayRecord;
  const groups = arr.map((e, i) => {
    return i % chunkSize === 0 ? arr.slice(i, i + chunkSize) : null;
  }).filter(e => { return e; });
  return groups;

}

async function updateRecord(arrayRecord) {
  let promises = [];
  const timestamp = moment().format(`YYYY-MM-DDTHH:mm:ssZZ`);
  for (let x in arrayRecord) {
    if (arrayRecord[x]["notification_sent"] == "N") {
      arrayRecord[x]["time_stamp"] = timestamp;
      await sleep(1000);
      arrayRecord[x]["order_status"] = orderStatusCode[arrayRecord[x]["order_status"]];
      if (arrayRecord[x]["order_status"] != undefined) {
        promises.push(sendNotification(arrayRecord[x]));
      } else {
        console.error("Error : ", JSON.stringify(arrayRecord[x]));
      }
    }
  }
  await Promise.all(promises).then(async (records) => {
    for (let x in records) {
      if (records[x].status == 202) {
        records[x].Data["order_status"] = Object.keys(orderStatusCode).find(key => orderStatusCode[key] === records[x].Data.order_status);
        await Dynamo.updateItems(PROJECT44_TABLE, { file_nbr: records[x].Data.file_nbr, order_status: records[x].Data.order_status }, 'set notification_sent = :x, time_stamp = :time', { ":x": "Y", ":time": timestamp });
      }
    }
  });
}
const { Client } = require("pg");
const Dynamo = require('../../shared/dynamo/db');
const PROJECT44_TABLE = process.env.PROJECT44_TABLE;
const moment = require('moment');
const validate = require('./validate');
const rp = require('request-promise');

const client = new Client({
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function compare(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other.file_nbr == current.file_nbr && other.order_status == current.order_status
    }).length == 0;
  }
}

function compareMatchRecord(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other.file_nbr == current.file_nbr && other.order_status == current.order_status
    }).length != 0;
  }
}

function sendNotification(bodyData) {
  return new Promise((resolve, reject) => {
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
      .then(function (returnData) {
        console.info("Info : Notification sent successfully", returnData.statusCode);
        resolve(returnData.statusCode);
      })
      .catch(function (err) {
        console.error("Error : ", err);
        resolve("failure");
      });
  })

}

async function setData(element) {
  let body
  if (element.region_code_basis == "S") {
    body = {
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
      "statusCode": "READY_FOR_PICKUP",
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
    }
  } else if (element.region_code_basis == "C") {
    body = {
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
      "statusCode": "READY_FOR_PICKUP",
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
    }
  }
  return await sendNotification(body);

}


module.exports.handler = async (event) => {
  let response, dynamoData
  try {
    await client.connect();
    response = await client.query(
      "select shipment_info.file_nbr ,shipment_info.house_bill_nbr ,shipment_info.bill_to_nbr ,shipment_info.origin_port_iata ,shipment_info.destination_port_iata , shipment_info.shipper_name ,shipment_info.shipper_addr_1 ,shipment_info.shipper_addr_2 ,shipment_info.shipper_city ,shipment_info.shipper_st , shipment_info.shipper_cntry ,shipment_info.shipper_zip , shipment_info.consignee_name ,shipment_info.consignee_addr_1 ,shipment_info.consignee_addr_2 ,shipment_info.consignee_city ,shipment_info.consignee_st , shipment_info.consignee_cntry ,shipment_info.consignee_zip , shipment_milestone.order_status ,shipment_milestone.order_status_desc ,shipment_milestone.region_code_basis ,shipment_Ref.ref_nbr from shipment_info left outer join shipment_milestone on shipment_info.source_system = shipment_milestone.source_system and shipment_info.file_nbr = shipment_milestone.file_nbr and is_custompublic = 'Y' left outer join (select source_system ,file_nbr ,ref_nbr from shipment_ref where ref_typeid = 'PO' and customer_type = 'B')shipment_Ref on shipment_info.source_system = shipment_Ref.source_system and shipment_info.file_nbr = shipment_Ref.file_nbr WHERE shipment_info.bill_to_nbr = '11912' and shipment_milestone.event_date >current_timestamp - interval '2600 hour'"
    );
    await client.end();
  } catch (error) {
    console.error("error : ", error);
    return
  }
  response = await validate(response);
  if (!response.code) {
    try {
      dynamoData = await Dynamo.getAllScanRecord(PROJECT44_TABLE);
    } catch (e) {
      console.error("error : ", e);
      return
    }
    let notMatchedResult = (response.rows).filter(compare(dynamoData));
    let matchedRecord = dynamoData.filter(compareMatchRecord(response.rows));
    if (notMatchedResult.length) {
      let inputRecord = []
      let promises = notMatchedResult.map(async (element) => {
        element["time_stamp"] = moment().format(`YYYY-MM-DDTHH:mm:ssZZ`)
        let sendNotificationResult = await setData(element);
        let insertRecord
        if (sendNotificationResult == 202) {
          element["notification_sent"] = "Y"
          insertRecord = {
            "PutRequest": {
              "Item": element
            }
          }
          inputRecord.push(insertRecord)
        } else if (sendNotificationResult == "failure") {
          element["notification_sent"] = "N"
          insertRecord = {
            "PutRequest": {
              "Item": element
            }
          }
          inputRecord.push(insertRecord)
        }
      })
      await Promise.all(promises)
      if (inputRecord.length) {
        try {
          await Dynamo.batchInsertRecord(PROJECT44_TABLE, inputRecord);
        } catch (e) {
          console.error("Error : ", e);
          return
        }
        if (matchedRecord.length) {
          console.info("Info : ", matchedRecord)
          await updateRecord(matchedRecord);
          return
        }
      } else {
        console.error("Error : failure to insert record");
        return
      }
    } else {
      console.info("Info : ", matchedRecord)
      await updateRecord(matchedRecord);
      return
    }
  } else {
    console.error("Error: ", JSON.stringify(response));
    return
  }
};

async function updateRecord(arrayRecord) {
  return arrayRecord.map(async (element) => {
    const timestamp = moment().format(`YYYY-MM-DDTHH:mm:ssZZ`);
    element["time_stamp"] = timestamp
    if (element.notification_sent == "N") {
      let sendNotificationResult = await setData(element);
      if (sendNotificationResult == 202) {
        await Dynamo.updateItems(PROJECT44_TABLE, { file_nbr: element.file_nbr, order_status: element.order_status }, 'set notification_sent = :x, time_stamp = :time', { ":x": "Y", ":time": timestamp });
      }
    }
  })
}
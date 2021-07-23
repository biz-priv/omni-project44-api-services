const { Client } = require("pg");
const Dynamo = require('../../shared/dynamo/db');
const PROJECT44_TABLE = process.env.PROJECT44_TABLE;

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
      return other.file_nbr == current.file_nbr && other.house_bill_nbr == current.house_bill_nbr && other.bill_to_nbr == current.bill_to_nbr && other.origin_port_iata == current.origin_port_iata && other.destination_port_iata == current.destination_port_iata && other.shipper_name == current.shipper_name && other.shipper_addr_1 == current.shipper_addr_1 && other.shipper_addr_2 == current.shipper_addr_2 && other.shipper_city == current.shipper_city && other.shipper_st == current.shipper_st && other.shipper_cntry == current.shipper_cntry && other.shipper_zip == current.shipper_zip && other.consignee_name == current.consignee_name && other.consignee_addr_1 == current.consignee_addr_1 && other.consignee_addr_2 == current.consignee_addr_2 && other.consignee_city == current.consignee_city && other.consignee_st == current.consignee_st && other.consignee_cntry == current.consignee_cntry && other.consignee_zip == current.consignee_zip && other.order_status == current.order_status && other.order_status_desc == current.order_status_desc && other.region_code_basis == current.region_code_basis && other.ref_nbr == current.ref_nbr
    }).length == 0;
  }
}

function compareMatchRecord(otherArray) {
  return function (current) {
    return otherArray.filter(function (other) {
      return other.file_nbr == current.file_nbr && other.house_bill_nbr == current.house_bill_nbr && other.bill_to_nbr == current.bill_to_nbr && other.origin_port_iata == current.origin_port_iata && other.destination_port_iata == current.destination_port_iata && other.shipper_name == current.shipper_name && other.shipper_addr_1 == current.shipper_addr_1 && other.shipper_addr_2 == current.shipper_addr_2 && other.shipper_city == current.shipper_city && other.shipper_st == current.shipper_st && other.shipper_cntry == current.shipper_cntry && other.shipper_zip == current.shipper_zip && other.consignee_name == current.consignee_name && other.consignee_addr_1 == current.consignee_addr_1 && other.consignee_addr_2 == current.consignee_addr_2 && other.consignee_city == current.consignee_city && other.consignee_st == current.consignee_st && other.consignee_cntry == current.consignee_cntry && other.consignee_zip == current.consignee_zip && other.order_status == current.order_status && other.order_status_desc == current.order_status_desc && other.region_code_basis == current.region_code_basis && other.ref_nbr == current.ref_nbr
    }).length != 0;
  }
}


module.exports.handler = async (event) => {
  let response, dynamoData
  try {
  await client.connect();
  response = await client.query(
    "select shipment_info.file_nbr ,shipment_info.house_bill_nbr ,shipment_info.bill_to_nbr ,shipment_info.origin_port_iata ,shipment_info.destination_port_iata , shipment_info.shipper_name ,shipment_info.shipper_addr_1 ,shipment_info.shipper_addr_2 ,shipment_info.shipper_city ,shipment_info.shipper_st , shipment_info.shipper_cntry ,shipment_info.shipper_zip , shipment_info.consignee_name ,shipment_info.consignee_addr_1 ,shipment_info.consignee_addr_2 ,shipment_info.consignee_city ,shipment_info.consignee_st , shipment_info.consignee_cntry ,shipment_info.consignee_zip , shipment_milestone.order_status ,shipment_milestone.order_status_desc ,shipment_milestone.region_code_basis ,shipment_Ref.ref_nbr from shipment_info left outer join shipment_milestone on shipment_info.source_system = shipment_milestone.source_system and shipment_info.file_nbr = shipment_milestone.file_nbr and is_custompublic = 'Y' left outer join (select source_system ,file_nbr ,ref_nbr from shipment_ref where ref_typeid = 'PO' and customer_type = 'B')shipment_Ref on shipment_info.source_system = shipment_Ref.source_system and shipment_info.file_nbr = shipment_Ref.file_nbr WHERE shipment_info.bill_to_nbr = '11912' and shipment_milestone.event_date >current_timestamp - interval '1000 hour'"
  );
  await client.end();
  } catch (error) {
    console.error("error : ", error);
  }
  console.info("response", response.rows);
  try {
    dynamoData = await Dynamo.getAllScanRecord(PROJECT44_TABLE);
  } catch (e) {
    console.error("error : ", e);
  }
  let notMatchedResult = (response.rows).filter(compare(dynamoData));
  let matchedRecord = dynamoData.filter(compareMatchRecord(response.rows));
  if (notMatchedResult.length) {
    //send data project44 api
    const status = 'success';
    if (status == 'success') {
      let inputRecord = []
      notMatchedResult.map(element => {
        element["notification_sent"] = "Y"
        const data = {
          "PutRequest": {
            "Item": element
          }
        }
        inputRecord.push(data)
      })
      try {
        await Dynamo.batchInsertRecord(PROJECT44_TABLE, inputRecord);
      } catch (e) {
        console.error("Error : ", e);
      }
      if (matchedRecord.length) {
        await updateRecord(matchedRecord);
      }
    } else {
      console.error("Error : failure to send data in project44 api");
    }
  } else {
    await updateRecord(matchedRecord);
  }
};

async function updateRecord(arrayRecord) {
  return arrayRecord.map(async (element) => {
    if (element.notification_sent == "N") {
      await Dynamo.updateItems(PROJECT44_TABLE, { file_nbr: element.file_nbr, order_status: element.order_status }, 'set notification_sent = :x', { ":x": "Y" });
    }
  })
}
const { Client } = require("pg");
const client = new Client({
  database: "prod_datamodel",
  host: "omni-dw-prod.cxwdxqiiif5u.us-east-1.redshift.amazonaws.com",
  port: 5439,
  user: "bceuser1",
  password: "BizCloudExp1",
});
module.exports.handler = async (event) => {
  console.log("started");
  try {
    const conn = await client.connect();
    console.log("conn", conn);
    const response = await client.query(
      "select shipment_info.file_nbr ,shipment_info.house_bill_nbr ,shipment_info.bill_to_nbr ,shipment_info.origin_port_iata ,shipment_info.destination_port_iata , shipment_info.shipper_name ,shipment_info.shipper_addr_1 ,shipment_info.shipper_addr_2 ,shipment_info.shipper_city ,shipment_info.shipper_st , shipment_info.shipper_cntry ,shipment_info.shipper_zip , shipment_info.consignee_name ,shipment_info.consignee_addr_1 ,shipment_info.consignee_addr_2 ,shipment_info.consignee_city ,shipment_info.consignee_st , shipment_info.consignee_cntry ,shipment_info.consignee_zip , shipment_milestone.order_status ,shipment_milestone.order_status_desc ,shipment_milestone.region_code_basis ,shipment_Ref.ref_nbr from shipment_info left outer join shipment_milestone on shipment_info.source_system = shipment_milestone.source_system and shipment_info.file_nbr = shipment_milestone.file_nbr and is_custompublic = 'Y' left outer join (select source_system ,file_nbr ,ref_nbr from shipment_ref where ref_typeid = 'PO' and customer_type = 'B')shipment_Ref on shipment_info.source_system = shipment_Ref.source_system and shipment_info.file_nbr = shipment_Ref.file_nbr WHERE shipment_info.bill_to_nbr = '11912' and shipment_milestone.event_date >current_timestamp - interval '100 hour'"
    );
    console.log("response", response);
  } catch (error) {
    console.log("error : ", error);
  }
  await client.end();
  return event;
};
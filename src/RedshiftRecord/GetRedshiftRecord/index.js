const { send_response } = require('../../shared/utils/responses');
var mysql = require('mysql');

module.exports.handler = async (event) => {

    let client = {
        user: process.env.DB_USER,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        host: process.env.DB_HOST,
    };
    console.info("client=========================> ", client);

    var connection = mysql.createConnection(client);
    connection.connect();
    connection.query("select shipment_info.file_nbr ,shipment_info.house_bill_nbr ,shipment_info.bill_to_nbr ,shipment_info.origin_port_iata ,shipment_info.destination_port_iata , shipment_info.shipper_name ,shipment_info.shipper_addr_1 ,shipment_info.shipper_addr_2 ,shipment_info.shipper_city ,shipment_info.shipper_st , shipment_info.shipper_cntry ,shipment_info.shipper_zip ,    shipment_info.consignee_name ,shipment_info.consignee_addr_1 ,shipment_info.consignee_addr_2 ,shipment_info.consignee_city ,shipment_info.consignee_st , shipment_info.consignee_cntry ,shipment_info.consignee_zip , shipment_milestone.order_status ,shipment_milestone.order_status_desc ,shipment_milestone.region_code_basis ,shipment_Ref.ref_nbr from shipment_info left outer join shipment_milestone on shipment_info.source_system = shipment_milestone.source_system and shipment_info.file_nbr = shipment_milestone.file_nbr and is_custompublic = 'Y' left outer join (select source_system ,file_nbr ,ref_nbr from shipment_ref where ref_typeid = 'PO' and customer_type = 'B')shipment_Ref on shipment_info.source_system = shipment_Ref.source_system and shipment_info.file_nbr = shipment_Ref.file_nbr where --house_bill_nbr = '5865045' shipment_info.bill_to_nbr = '11912'", function (err, rows, fields) {
        if (err) {
            console.log("Error : ", err);
            throw err;
        } else {
            console.log("Success Fields : ", fields);
            console.log("rows ", rows);
            connection.end();
        }
    });
}

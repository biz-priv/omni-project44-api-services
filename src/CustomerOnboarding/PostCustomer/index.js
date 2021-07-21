const { send_response } = require('../../shared/utils/responses');
const Dynamo = require('../../shared/dynamo/db');
const ACCOUNTINFOTABLE = process.env.ACCOUNT_INFO;
const TOKENVALIDATOR = process.env.TOKEN_VALIDATOR;
const USAGEPLAN = process.env.USAGE_PLAN;
const validate = require('./validate');
const { uuid } = require('uuidv4');
const get = require('lodash.get');


//post customer 
module.exports.handler = async (event) => {
    console.info("Event\n" + JSON.stringify(event, null, 2));
    //validate body parameters
    event = await validate(event);
    if (!event.code) {
        const CustomerID = uuid();
        const accountInfoTableItems = {
            "CustomerID": CustomerID,
            "BillToAcct": get(event, 'body.BillToAccNumber'),
            "CustomerNo": get(event, 'body.CustomerNumber'),
            "CustomerStatus": 'Active',
            "DeclaredType": get(event, 'body.DeclaredType'),
            "SourceSystem": get(event, 'body.SourceSystem'),
            "Station": get(event, 'body.Station')
        }
        const apiParams = {
            description: CustomerID,
            enabled: true,
            name: CustomerID
        };
        const tokenTableItems = {
            "CustomerID": CustomerID,
            "CustomerName": get(event, 'body.CustomerName'),
            "CustomerStatus": 'Active'
        }
        try {
            const [accountTableResult, apiKeyResult] = await Promise.all([Dynamo.itemInsert(ACCOUNTINFOTABLE, accountInfoTableItems), Dynamo.apiKeyCreate(apiParams, USAGEPLAN)]);
            tokenTableItems["ApiKey"] = apiKeyResult.value;
            await Dynamo.itemInsert(TOKENVALIDATOR, tokenTableItems)
            return await send_response(202);

        } catch (e) {
            console.error("Error: ", JSON.stringify(e));
            return await send_response(e.httpStatus, e)
        }
    } else {
        console.error("Error: ", JSON.stringify(event));
        return await send_response(event.httpStatus, event)
    }
}
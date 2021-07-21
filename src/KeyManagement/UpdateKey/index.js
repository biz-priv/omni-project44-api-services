const { send_response } = require('../../shared/utils/responses');
const { customerIdValidator } = require('../../shared/utils/validator');
const Dynamo = require('../../shared/dynamo/db');
const TOKENVALIDATORTABLE = process.env.TOKEN_VALIDATOR;
const USAGEPLAN = process.env.USAGE_PLAN;
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');

//update key
module.exports.handler = async (event) => {

    console.info("Event: ", JSON.stringify(event));
    //validate customerId    
    event = await customerIdValidator(event);
    if (!event.code) {
        try {
            let getItemResult = await Dynamo.getItemQueryFilter(TOKENVALIDATORTABLE, 'CustomerID = :hkey', 'CustomerStatus = :statuskey', { ':hkey': get(event, 'body.CustomerId'), ':statuskey': 'Active' });

            if ((getItemResult.Items).length) {
                const [apiKeyResult, updateItemResult] = await Promise.all([Dynamo.apiKeyDelete(get(event, 'body.CustomerId')), Dynamo.updateItems(TOKENVALIDATORTABLE, { 'CustomerID': get(event, 'body.CustomerId'), 'ApiKey': getItemResult.Items[0].ApiKey }, 'set CustomerStatus = :x', { ':x': 'Inactive' })])

                let apiKeyValue = await Dynamo.apiKeyCreate({ "description": get(event, 'body.CustomerId'), "enabled": true, "name": get(event, 'body.CustomerId') }, USAGEPLAN);
                await Dynamo.itemInsert(TOKENVALIDATORTABLE, { "CustomerID": get(event, 'body.CustomerId'), "CustomerName": getItemResult.Items[0].CustomerName, "CustomerStatus": "Active", "ApiKey": apiKeyValue.value });

                console.info("Info: ", JSON.stringify({ "ApiKey": apiKeyValue.value }));
                return await send_response(200, { "ApiKey": apiKeyValue.value });

            } else {
                console.error("Error: ", JSON.stringify(handleError(1009)));
                return await send_response(400, handleError(1009))
            }
        } catch (e) {
            console.error("Error: ", JSON.stringify(e));
            return await send_response(e.httpStatus, e)
        }

    } else {
        console.error("Error: ", JSON.stringify(event));
        return await send_response(event.httpStatus, event)
    }

}
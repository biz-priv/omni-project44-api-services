const { send_response, handleError } = require('../../shared/utils/responses');
const { customerIdValidator } = require('../../shared/utils/validator');
const Dynamo = require('../../shared/dynamo/db');
const TOKENVALIDATORTABLE = process.env.TOKEN_VALIDATOR;
const ACCOUNTINFOTABLE = process.env.ACCOUNT_INFO;
const USAGEPLAN = process.env.USAGE_PLAN;
const get = require('lodash.get');

//delete customer
module.exports.handler = async (event) => {

    console.info("Event\n" + JSON.stringify(event, null, 2));
    //validate customerId    
    event = await customerIdValidator(event);
    if (!event.code) {
        try {
            let getItemResult = await Dynamo.getItemQuery(TOKENVALIDATORTABLE, 'CustomerID = :hkey', { ':hkey': get(event, 'body.CustomerId') });
            if ((getItemResult.Items).length) {
                await Dynamo.fetchApiKeyAndDisassociateUsagePlan(get(event, 'body.CustomerId'), USAGEPLAN);
                await Promise.all([Dynamo.updateItems(ACCOUNTINFOTABLE, { 'CustomerID': get(event, 'body.CustomerId') }, 'set CustomerStatus = :x', { ':x': 'Inactive' }), Dynamo.updateItems(TOKENVALIDATORTABLE, { 'CustomerID': get(event, 'body.CustomerId'), 'ApiKey': getItemResult.Items[0].ApiKey }, 'set CustomerStatus = :x', { ':x': 'Inactive' })])
                return await send_response(202);
            } else {
                const error = handleError(1009);
                console.error("Error: ", JSON.stringify(error));
                return await send_response(error.httpStatus, error)
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
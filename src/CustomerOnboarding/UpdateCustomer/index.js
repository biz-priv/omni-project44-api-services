const { send_response, handleError } = require('../../shared/utils/responses');
const Dynamo = require('../../shared/dynamo/db');
const ACCOUNTINFOTABLE = process.env.ACCOUNT_INFO;
const validate = require('./validate');
const get = require('lodash.get');

//update customer
module.exports.handler = async (event) => {

    console.info("Event\n" + JSON.stringify(event, null, 2));
    //validate customerId
    event = await validate(event);
    if (!event.code) {
        try {
            let updateExpression = 'set';
            let attributesValues = {}
            if (get(event, 'body.DeclaredType')) {
                updateExpression += ` DeclaredType = :x`
                attributesValues[':x'] = get(event, 'body.DeclaredType')
            }

            if (get(event, 'body.Station')) {
                updateExpression += (get(event, 'body.DeclaredType')) ? ' , ' : ''
                updateExpression += ` Station = :y `
                attributesValues[':y'] = get(event, 'body.Station')
            }

            const result = await Dynamo.getItem(ACCOUNTINFOTABLE, { 'CustomerID': get(event, 'body.CustomerId') });
            if (result.Item) {
                await Dynamo.updateItems(ACCOUNTINFOTABLE, { 'CustomerID': get(event, 'body.CustomerId') }, updateExpression, attributesValues);
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
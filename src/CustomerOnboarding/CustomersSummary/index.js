const { send_response } = require('../../shared/utils/responses');
const Dynamo = require('../../shared/dynamo/db');
const ACCOUNT_INFO_TABLE = process.env.ACCOUNT_INFO;

module.exports.handler = async (event) => {
    console.info("Event: ", JSON.stringify(event));
    try {
        const [activeCount, inactiveCount] = await Promise.all([Dynamo.getAllItemsQueryCount(ACCOUNT_INFO_TABLE, 'Active'), Dynamo.getAllItemsQueryCount(ACCOUNT_INFO_TABLE, 'Inactive')])
        const totalCount = activeCount + inactiveCount
        console.info("Info: ", JSON.stringify({ "Customers": { "Total": totalCount, "Active": activeCount, "Inactive": inactiveCount } }))
        return await send_response(200, { "Customers": { "Total": totalCount, "Active": activeCount, "Inactive": inactiveCount } })
    } catch (e) {
        console.error("Error: ", JSON.stringify(e));
        return await send_response(e.httpStatus, e)
    }
}
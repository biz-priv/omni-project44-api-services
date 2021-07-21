const { send_response } = require('../../shared/utils/responses');
const validate = require('./validate');
const Dynamo = require('../../shared/dynamo/db');
const { get } = require('lodash');
const USERACTIVITY = process.env.USER_ACTIVITY;
const pagination = require('../../shared/utils/pagination');


//post user activity
module.exports.handler = async (event) => {
    console.info("Event: ", JSON.stringify(event));
    event = await validate(event);
    if (!event.code) {
        let startKey = { UserId: get(event, 'queryStringParameters.startkey'), Timestamp: get(event, 'queryStringParameters.endkey') };
        let getItemResult, totalCount
        try {
            startKey = (startKey.UserId == null || startKey.UserId == 0) ? null : startKey;
            [getItemResult, totalCount] = await Promise.all([Dynamo.getItemQueryWithLimit(USERACTIVITY, get(event, 'queryStringParameters.size'), 'UserId = :uid', { ':uid': get(event, 'pathParameters.id') }, startKey), Dynamo.getScanCount(USERACTIVITY, 'UserId = :uid', { ':uid': get(event, 'pathParameters.id') })]);
            return await getResponse(getItemResult, totalCount.Count, startKey, get(event, 'queryStringParameters.page'), get(event, 'queryStringParameters.size'), event);
        } catch (e) {
            console.error("Error: ", JSON.stringify(e));
            return await send_response(e.httpStatus, e);
        }
    } else {
        console.error("Error: ", JSON.stringify(event));
        return await send_response(event.httpStatus, event);
    }

}

async function getResponse(results, count, startkey, page, size, event) {
    let resp = {}
    resp["Activity"] = get(results, 'Items', []);

    let elementCount = resp['Activity'].length;
    let deployStage = get(event, 'requestContext.stage', 'devint');
    let lastUserId = 0;
    let lastKey = 0;

    if (get(results, 'LastEvaluatedKey', null)) {
        lastUserId = get(results, 'LastEvaluatedKey.UserId');
        lastKey = get(results, 'LastEvaluatedKey.Timestamp')
        var LastEvaluatedkey = "&startkey=" + lastUserId + "&endkey=" + lastKey;
    }

    let prevLinkStartKey = 0;
    let prevLinkEndKey = 0;
    if (startkey !== null) {
        prevLinkStartKey = startkey.UserId;
        prevLinkEndKey = startkey.Timestamp;
    }

    let host = get(event, 'headers.Host', null) + "/" + deployStage;
    let path = get(event, 'path', null);
    let prevLink = host + path + "?page=" + page + "&size=" +
        size + "&startkey=" + prevLinkStartKey + "&endkey=" + prevLinkEndKey;

    var response = await pagination.createPagination(resp, host, path + "?page=", page, size, elementCount, LastEvaluatedkey, count, prevLink);

    if (lastUserId !== 0) {
        response.Page["StartKey"] = lastUserId;
        response.Page["EndKey"] = lastKey;
    }
    console.info("Response: ", JSON.stringify(response));
    return await send_response(200, response);
}
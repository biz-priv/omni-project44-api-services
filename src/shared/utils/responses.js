/*
* File: src\shared\utils\responses.js
* Project: Omni-project44-api-services
* Author: Bizcloud Experts
* Date: 2021-07-28
* Confidential and Proprietary
*/
const errors = [
    //createOrder - parking
    { code: 1001, httpStatus: 400, message: 'Schema validation error.' },
    { code: 1004, httpStatus: 400, message: 'Error fetching items.' },
    { code: 1007, httpStatus: 400, message: 'Error inserting items.' },
    { code: 1008, httpStatus: 400, message: 'Error updating items.' },
];

function getError(code) {
    return errors.find(e => e.code === code);
}

function handleError(code, exception = null, msg = null) {
    if (exception) {
        console.error('Exception: ', exception);
    }

    const error = getError(code);

    msg = msg || error.message;

    const errorResp = errorResponse(error.httpStatus, error.code, msg);

    console.error("Error Response: ", errorResp);
    return errorResp;
}

function errorResponse(httpStatus, errCode, message) {
    return {
        httpStatus: httpStatus,
        code: errCode,
        message: message
    }
}

module.exports = {
    handleError
}
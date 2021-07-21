const { success, failure } = require('../../shared/utils/responses');

//static response
let response = [{
                    "CustomerId": 1,
                    "CustomerName": "test1",
                    "SubscribedEvents": ["test1", "test2", "test3"],
                    "Endpoint": "https://www.test1.com",
                    "SharedSecret": "secret1",
                    "DateSubscribed": "15/06/2021"
                },
                {
                    "CustomerId": 2,
                    "CustomerName": "test2",
                    "SubscribedEvents": ["test1", "test2", "test3"],
                    "Endpoint": "https://www.test2.com",
                    "SharedSecret": "secret2",
                    "DateSubscribed": "15/06/2021"
                },
                {
                    "CustomerId": 3,
                    "CustomerName": "test3",
                    "SubscribedEvents": ["test1", "test2", "test3"],
                    "Endpoint": "https://www.test3.com",
                    "SharedSecret": "secret3",
                    "DateSubscribed": "15/06/2021"
                }]

//get subscription list
module.exports.handler = (event) => {
    console.info("Event\n" + JSON.stringify(event, null, 2));
    console.info("Response\n" + JSON.stringify(response, null, 2));
    //send response
    return success(200, response);
}
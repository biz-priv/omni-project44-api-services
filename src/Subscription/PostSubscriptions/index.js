const { success, failure } = require('../../shared/utils/responses');
const Joi = require('joi');

/*=================create subscriptions parameters validate==============*/
var createSubscriptionValidator = Joi.object().keys({
    CustomerName: Joi.string(), 
    Event: Joi.string(),
    Endpoint: Joi.string().pattern(new RegExp('^(https?:\\/\\/)?' + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + '((\\d{1,3}\\.){3}\\d{1,3}))'+  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ '(\\?[;&a-z\\d%_.~+=-]*)?'+ '(\\#[-a-z\\d_]*)?$','i')),
    SharedSecret: Joi.string()
})

//post subscription
module.exports.handler = async (event) => {

    console.info("Event\n" + JSON.stringify(event, null, 2));
    const body = (!event.body ? null : JSON.parse(event.body));
    //validate subscription parameters
    const { error, value } = await createSubscriptionValidator.validate(body);
    if (error) {
        console.error("Error\n" + JSON.stringify(error, null, 2));
        return failure(400, "missing required parameters", error);
    } else {
        console.info("Response\n" + JSON.stringify(value, null, 2));
        return success(202);
    }

}
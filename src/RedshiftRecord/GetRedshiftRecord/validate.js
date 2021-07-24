const Joi = require('joi');
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');


const schema = Joi.object({
    rows: Joi.array().items(
        Joi.object({
            file_nbr: Joi.string().required(),
            order_status: Joi.string().required(),
            consignee_addr_2: Joi.string().optional().empty('').default(null),
            shipper_addr_2: Joi.string().optional().empty('').default(null)
        }).allow(null).unknown(true)
    )
}).allow(null).unknown(true)

async function validate(event) {
    try {
        event = await schema.validateAsync(event);
    } catch (e) {
        return handleError(1001, e, get(e, 'details[0].message', null));
    }
    return event;
}

module.exports = validate;
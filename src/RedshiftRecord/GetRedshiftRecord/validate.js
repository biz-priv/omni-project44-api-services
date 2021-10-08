const Joi = require('joi');
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');


const schema = Joi.object({
    file_nbr: Joi.string().required(),
    order_status: Joi.string().required(),
    ref_nbr: Joi.string().allow('', null).empty(['', null]).default("Not Available"),
    house_bill_nbr: Joi.string().required(),
    origin_port_iata: Joi.string().empty('').default(null),
    destination_port_iata: Joi.string().empty('').default(null),
    shipper_zip: Joi.string().empty('').default(null),
    consignee_zip: Joi.string().empty('').default(null),
    shipper_addr_1: Joi.string().empty('').default(null),
    consignee_addr_1: Joi.string().empty('').default(null),
    shipper_city: Joi.string().required(),
    consignee_city: Joi.string().required(),
    shipper_st: Joi.string().required(),
    consignee_st: Joi.string().required(),
    shipper_cntry: Joi.string().empty('').default(null),
    consignee_cntry: Joi.string().empty('').default(null),
    consignee_addr_2: Joi.string().optional().empty('').default(null),
    shipper_addr_2: Joi.string().optional().empty('').default(null)
}).unknown(true);

async function validate(event) {
    try {
        event = await schema.validateAsync(event);
    } catch (e) {
        return handleError(1001, e, get(e, 'details[0].message', null));
    }
    return event;
}

module.exports = validate;
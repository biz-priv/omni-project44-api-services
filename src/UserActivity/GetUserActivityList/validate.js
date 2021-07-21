const Joi = require('joi');
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');

const schema = Joi.object({
    pathParameters: Joi.object({
        id: Joi.string().required()
    }),
    queryStringParameters: Joi.object({
        page: Joi.number().default(1),
        size: Joi.number().default(10),
        startkey: Joi.string().when('page', { is: Joi.number().greater(1), then: Joi.string().not('0')}),
        endkey: Joi.string().when('page', { is: Joi.number().greater(1), then: Joi.string().not('0')})
    }).empty(null).default({page: 1, size: 10, startkey: 0, endkey: 0})
}).unknown(true)

async function validate(event) {
    try {
        event = await schema.validateAsync(event);
    } catch (e) {
        return handleError(1001, e, get(e, 'details[0].message', null));
    }
    return event;
}

module.exports = validate;

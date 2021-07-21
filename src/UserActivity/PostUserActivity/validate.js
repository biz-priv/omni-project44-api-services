const Joi = require('joi');
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');
const moment = require("moment");

const custom = Joi.extend((joi) => {
    return {
        type: 'object',
        base: joi.object(),
        coerce(value, schema) {
            try {
                return { value: JSON.parse(value) };
            }
            catch (err) {
                return err;
            }
        }
    };
});

const schema = Joi.object({
    pathParameters: Joi.object({
        id: Joi.string().required()
    }),
    body: custom.object({
        Activity: Joi.string().required(),
        Description: Joi.string().required(),
        Timestamp: Joi.string().default(moment().format('MMMM Do YYYY, h:mm:ss a'))
    })
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

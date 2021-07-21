const Joi = require('joi');
const get = require('lodash.get');
const { handleError } = require('../../shared/utils/responses');

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
    body: custom.object({
        BillToAccNumber: Joi.string().required(),
        SourceSystem: Joi.string().required(),
        CustomerNumber: Joi.string().default('NA'),
        DeclaredType: Joi.string().default('NA'),
        Station: Joi.string().default('NA'),
        CustomerName: Joi.string().default('NA')
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

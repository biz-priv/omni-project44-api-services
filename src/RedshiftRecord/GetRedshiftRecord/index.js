const { send_response } = require('../../shared/utils/responses');
var Redshift = require('node-redshift');

module.exports.handler = async (event) => {

    // let client = {
    //     user: process.env.DB_USER,
    //     database: process.env.DB_DATABASE,
    //     password: process.env.DB_PASSWORD,
    //     port: process.env.DB_PORT,
    //     host: process.env.DB_HOST,
    // };

    console.log("client===> ", client);
    var redshiftClient = new Redshift(client, { longStackTraces: false});
    console.log("test=> ", redshiftClient)

    redshiftClient.query('SELECT * FROM "users" LIMIT 10', {raw: true}, function(err, data){
        if(err){
          console.log("err1========> ", err);
        }else{
          console.log("data=======> ", data);
          redshiftClient.close();
        }
      });
}

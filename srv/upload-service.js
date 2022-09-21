const cds = require('@sap/cds');
const dbClass = require("sap-hdbext-promisfied");
const hdbext = require("@sap/hdbext");
module.exports = async function(srv) {
	const db = await cds.connect.to("db");
    const {
        FileHeader,
        FileItems
    } = cds.entities("sap.poc.upload");
    srv.before('CREATE', `FileHeader`, (req, res)=>{
         if (req.data) {
             
         }
    });
    srv.on('checkAttachment', async(req)=>{
		var data = req.data.listofClaim;
		var sp,output;
       	let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))
			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_validate_attach');
			output = await dbConn.callProcedurePromisified(sp, data);
		return output.results;
    });
    
}
